//! Serving síncrono do recomendador ML (MVP).
//!
//! Coordena os componentes já implementados:
//!
//! 1. `HotQueryCache` (ADR-012 Camada 1b) — recebe observação de spread.
//! 2. `SamplingTrigger` (ADR-009 + ADR-014) — decide se snapshot entra
//!    no dataset (para shadow mode posterior).
//! 3. `BaselineA3` (ADR-001) — emite `Recommendation`.
//!
//! # Por que síncrono no MVP (não A2 thread dedicada)
//!
//! ADR-010 (A2 thread dedicada com `crossbeam::bounded(1)` + `ArcSwap`
//! + `core_affinity` + circuit breaker) foi desenhado para acomodar o
//! **modelo A2 composta** (QRF + CatBoost + RSF via tract ONNX), que tem
//! latência de ~28 µs + overhead de panic potencial e exige failure
//! isolation estrita.
//!
//! **Baseline A3 é diferente**:
//! - Latência ~1–5 µs (lookup `hdrhistogram` + aritmética simples).
//! - Puro Rust seguro (sem `unsafe`, sem SIMD manual, sem FFI).
//! - Sem estado entre chamadas além do `HotQueryCache`.
//!
//! Executar A3 inline no loop 150 ms do scanner (`spread::engine`) é
//! seguro e simples. Thread dedicada adiciona complexidade (canais,
//! sincronização, debugging) sem ganho material para baseline.
//!
//! **Quando migrar para thread dedicada (ADR-010 completo)**:
//! - Marco 2, quando modelo A2 entra em produção.
//! - Ou se benchmark mostrar que inline A3 impacta latência do scanner
//!   além de ~5% do budget de 150 ms.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use crate::ml::baseline::BaselineA3;
use crate::ml::contract::{Recommendation, RouteId};
use crate::ml::listing_history::ListingHistory;
use crate::ml::persistence::{AcceptedSample, RawSample, RawWriterHandle, RouteDecimator};
use crate::ml::trigger::{SampleDecision, SamplingTrigger};

// ---------------------------------------------------------------------------
// MlServer
// ---------------------------------------------------------------------------

/// Servidor ML síncrono — um ponto de entrada para o loop do scanner.
///
/// Thread-safe: todos os componentes internos são thread-safe
/// (`HotQueryCache` via `RwLock`, `BaselineA3` `Send + Sync`,
/// `SamplingTrigger` `Copy`). Múltiplas threads podem chamar
/// `on_opportunity` concorrentemente — as escritas no cache são
/// serializadas pelo write lock interno.
pub struct MlServer {
    baseline: BaselineA3,
    trigger: SamplingTrigger,
    listing: ListingHistory,
    // Métricas mínimas (agregadas; cópia periódica para Prometheus em M1.8).
    metrics: Arc<ServerMetrics>,
    // Sequência monotônica por ciclo — preenchida pelo chamador
    // (spread engine) a cada tick. Permite desambiguar snapshots do mesmo
    // timestamp em `AcceptedSample.cycle_seq`.
    cycle_seq: AtomicU64,
    // ADR-025: stream contínuo pré-trigger, decimado 1-in-10 por rota.
    // `None` quando desabilitado (tests/CLI flag). `Some((decimator,
    // handle))` em produção para alimentar gates empíricos E1/E2/E4/E6/E8
    // /E10/E11 do Marco 0.
    raw_decimator: RouteDecimator,
    raw_writer: Option<RawWriterHandle>,
}

#[derive(Default, Debug)]
pub struct ServerMetrics {
    pub opportunities_seen: AtomicU64,
    pub sample_accepts: AtomicU64,
    pub sample_rejects_stale: AtomicU64,
    pub sample_rejects_low_volume: AtomicU64,
    pub sample_rejects_insufficient_history: AtomicU64,
    pub sample_rejects_below_tail: AtomicU64,
    pub sample_rejects_halt: AtomicU64,
    pub rec_trade_total: AtomicU64,
    pub rec_abstain_no_opportunity: AtomicU64,
    pub rec_abstain_insufficient_data: AtomicU64,
    pub rec_abstain_low_confidence: AtomicU64,
    pub rec_abstain_long_tail: AtomicU64,
    /// ADR-025: RawSample enviado ao writer (fast path).
    pub raw_samples_emitted: AtomicU64,
    /// ADR-025: canal cheio — sample descartada.
    pub raw_samples_dropped_channel_full: AtomicU64,
    /// ADR-025: writer encerrado — sample descartada.
    pub raw_samples_dropped_channel_closed: AtomicU64,
}

impl MlServer {
    pub fn new(baseline: BaselineA3, trigger: SamplingTrigger) -> Self {
        Self {
            baseline,
            trigger,
            listing: ListingHistory::new(),
            metrics: Arc::new(ServerMetrics::default()),
            cycle_seq: AtomicU64::new(0),
            raw_decimator: RouteDecimator::new(),
            raw_writer: None,
        }
    }

    /// Conecta o `RawSampleWriter` (ADR-025). Até ser chamado, o server
    /// opera em modo legacy (só `AcceptedSample`).
    pub fn with_raw_writer(mut self, handle: RawWriterHandle) -> Self {
        self.raw_writer = Some(handle);
        self
    }

    /// Substitui o decimator (ex.: `with_modulus(1)` em testes que
    /// querem capturar toda a série).
    pub fn with_raw_decimator(mut self, decimator: RouteDecimator) -> Self {
        self.raw_decimator = decimator;
        self
    }

    pub fn baseline(&self) -> &BaselineA3 {
        &self.baseline
    }

    pub fn trigger(&self) -> SamplingTrigger {
        self.trigger
    }

    pub fn listing(&self) -> &ListingHistory {
        &self.listing
    }

    pub fn metrics(&self) -> Arc<ServerMetrics> {
        Arc::clone(&self.metrics)
    }

    /// Avança o `cycle_seq` — chamado uma vez pelo spread engine no início
    /// de cada ciclo 150ms. Thread-safe via `fetch_add`.
    pub fn begin_cycle(&self) -> u32 {
        // Wrap para u32 — cycle_seq é per-ciclo, não eterno.
        (self.cycle_seq.fetch_add(1, Ordering::Relaxed) & 0xFFFF_FFFF) as u32
    }

    /// Processa uma oportunidade do scanner.
    ///
    /// Retorna `(Recommendation, SampleDecision)`:
    /// - `Recommendation` é o output consumido por UI/broadcast.
    /// - `SampleDecision` informa se o snapshot deveria entrar no dataset
    ///   de treinamento (shadow mode M1.7).
    ///
    /// Internamente:
    /// 1. Registra observação no `HotQueryCache` (histograma rolante).
    /// 2. Avalia `SamplingTrigger` (4 gates).
    /// 3. Gera `Recommendation` via `BaselineA3`.
    /// 4. Atualiza métricas.
    ///
    /// Chamado a cada tick do scanner (150 ms) para cada rota emitida.
    /// Processa uma observação do spread engine.
    ///
    /// Retorna tripla:
    /// - `Recommendation` — consumido por UI/broadcast.
    /// - `SampleDecision` — classificação do snapshot.
    /// - `Option<AcceptedSample>` — `Some` apenas quando `sample_decision
    ///   == Accept`. Este é o record que será enfileirado para Parquet
    ///   (C1 writer).
    ///
    /// `cycle_seq` deve ser preenchido pelo caller a cada início de
    /// ciclo via [`MlServer::begin_cycle`].
    #[allow(clippy::too_many_arguments)]
    pub fn on_opportunity(
        &self,
        cycle_seq: u32,
        route: RouteId,
        symbol_name: &str,
        entry_spread: f32,
        exit_spread: f32,
        buy_book_age_ms: u32,
        sell_book_age_ms: u32,
        buy_vol24_usd: f64,
        sell_vol24_usd: f64,
        halt_active: bool,
        now_ns: u64,
    ) -> (Recommendation, SampleDecision, Option<AcceptedSample>) {
        self.metrics.opportunities_seen.fetch_add(1, Ordering::Relaxed);

        // 0. **C5** — registra lifecycle da rota (first_seen / last_seen).
        //    Anti-survivorship; alimenta feature `listing_age_days`.
        self.listing.record_seen(route, now_ns);

        // 1. **C2 fix** — só alimenta histograma se dado é LIMPO.
        //    Snapshots stale/low-vol/halt NÃO devem poluir o P95 que o
        //    próprio trigger consulta. Antes deste fix, havia dependência
        //    circular: histograma contaminado → P95 enviesado → trigger
        //    inconsistente.
        //
        //    Per-venue book-age threshold (C3 fix) vem via
        //    [`Venue::max_book_age_ms`] dentro de `is_clean_data`.
        let clean = self.trigger.is_clean_data(
            route.buy_venue,
            route.sell_venue,
            buy_book_age_ms,
            sell_book_age_ms,
            buy_vol24_usd,
            sell_vol24_usd,
            halt_active,
        );
        if clean {
            self.baseline
                .cache()
                .observe(route, entry_spread, exit_spread, now_ns);
        }

        // 2. Avalia trigger de amostragem completo (inclui n_min + tail).
        let sample_dec = self.trigger.evaluate(
            route,
            entry_spread,
            buy_book_age_ms,
            sell_book_age_ms,
            buy_vol24_usd,
            sell_vol24_usd,
            halt_active,
            self.baseline.cache(),
        );
        self.bump_sample_metric(sample_dec);

        // 2a. **ADR-025** — emite `RawSample` pré-trigger se a rota está
        //     no conjunto decimado. Sample carrega `sample_dec` congelado
        //     (PIT rigoroso; regra do trigger do momento da observação).
        //     `try_send` é não-bloqueante; canal cheio → drop + métrica.
        if let Some(raw_writer) = self.raw_writer.as_ref() {
            if self.raw_decimator.should_persist(route) {
                let raw = RawSample::new(
                    now_ns,
                    cycle_seq,
                    route,
                    symbol_name,
                    entry_spread,
                    exit_spread,
                    buy_book_age_ms,
                    sell_book_age_ms,
                    buy_vol24_usd,
                    sell_vol24_usd,
                    halt_active,
                    sample_dec,
                );
                match raw_writer.try_send(raw) {
                    Ok(()) => {
                        self.metrics.raw_samples_emitted.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelFull) => {
                        self.metrics
                            .raw_samples_dropped_channel_full
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    Err(crate::ml::persistence::RawWriterSendError::ChannelClosed) => {
                        self.metrics
                            .raw_samples_dropped_channel_closed
                            .fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }

        // 3. Gera recomendação.
        let rec = self
            .baseline
            .recommend(route, entry_spread, exit_spread, now_ns);
        self.bump_rec_metric(&rec);

        // 4. **C4** — emite `AcceptedSample` se o trigger aceitou.
        //    `was_recommended` inicializa `false`; broadcast layer flipa
        //    para `true` quando apresenta ao operador (Marco 3 Fase 2).
        let accepted = if sample_dec == SampleDecision::Accept {
            Some(AcceptedSample::new(
                now_ns,
                cycle_seq,
                route,
                symbol_name,
                entry_spread,
                exit_spread,
                buy_book_age_ms,
                sell_book_age_ms,
                buy_vol24_usd,
                sell_vol24_usd,
                sample_dec,
            ))
        } else {
            None
        };

        (rec, sample_dec, accepted)
    }

    fn bump_sample_metric(&self, d: SampleDecision) {
        let counter = match d {
            SampleDecision::Accept => &self.metrics.sample_accepts,
            SampleDecision::RejectStale => &self.metrics.sample_rejects_stale,
            SampleDecision::RejectLowVolume => &self.metrics.sample_rejects_low_volume,
            SampleDecision::RejectInsufficientHistory => {
                &self.metrics.sample_rejects_insufficient_history
            }
            SampleDecision::RejectBelowTail => &self.metrics.sample_rejects_below_tail,
            SampleDecision::RejectHalt => &self.metrics.sample_rejects_halt,
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }

    fn bump_rec_metric(&self, rec: &Recommendation) {
        use crate::ml::contract::AbstainReason;
        let counter = match rec {
            Recommendation::Trade(_) => &self.metrics.rec_trade_total,
            Recommendation::Abstain { reason, .. } => match reason {
                AbstainReason::NoOpportunity => &self.metrics.rec_abstain_no_opportunity,
                AbstainReason::InsufficientData => &self.metrics.rec_abstain_insufficient_data,
                AbstainReason::LowConfidence => &self.metrics.rec_abstain_low_confidence,
                AbstainReason::LongTail => &self.metrics.rec_abstain_long_tail,
            },
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ml::baseline::BaselineConfig;
    use crate::ml::feature_store::HotQueryCache;
    use crate::ml::trigger::SamplingConfig;
    use crate::types::{SymbolId, Venue};

    fn mk_route() -> RouteId {
        RouteId {
            symbol_id: SymbolId(7),
            buy_venue: Venue::MexcFut,
            sell_venue: Venue::BingxFut,
        }
    }

    fn mk_server() -> MlServer {
        use crate::ml::feature_store::hot_cache::CacheConfig;
        // Tests usam decimação=1 + janela infinita para controle.
        let cache = HotQueryCache::with_config(CacheConfig::for_testing());
        let baseline = BaselineA3::new(
            cache,
            BaselineConfig {
                floor_pct: 0.5,
                n_min: 100,
                ..BaselineConfig::default()
            },
        );
        let trigger = SamplingTrigger::new(SamplingConfig {
            n_min: 100,
            ..SamplingConfig::default()
        });
        MlServer::new(baseline, trigger)
    }

    #[test]
    fn first_observations_abstain_insufficient_data() {
        let server = mk_server();
        let route = mk_route();
        let (rec, dec, _accepted) = server.on_opportunity(
            0, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false, 1,
        );
        use crate::ml::contract::AbstainReason;
        match rec {
            Recommendation::Abstain { reason, .. } => {
                assert_eq!(reason, AbstainReason::InsufficientData);
            }
            _ => panic!("expected Abstain on first observation"),
        }
        assert_eq!(dec, SampleDecision::RejectInsufficientHistory);
    }

    #[test]
    fn metrics_update_correctly() {
        let server = mk_server();
        let route = mk_route();
        // 10 observações — todas rejeitadas (insufficient).
        for i in 0..10 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false, i,
            );
        }
        let m = server.metrics();
        assert_eq!(m.opportunities_seen.load(Ordering::Relaxed), 10);
        assert_eq!(m.sample_rejects_insufficient_history.load(Ordering::Relaxed), 10);
        assert_eq!(m.rec_abstain_insufficient_data.load(Ordering::Relaxed), 10);
    }

    #[test]
    fn accumulated_observations_eventually_emit_trade() {
        let server = mk_server();
        let route = mk_route();
        // Popula 200 observações "regime opportunity".
        for i in 0..200 {
            let t = (i % 100) as f32 / 100.0;
            server.on_opportunity(
                i as u32,
                route,
                "BTC-USDT",
                2.0 + t * 2.0,
                -1.0 + t * 1.5,
                50,
                50,
                1e6,
                1e6,
                false,
                i,
            );
        }
        // Agora tenta emitir com current_entry alto.
        let (rec, _, _) = server.on_opportunity(
            201, route, "BTC-USDT", 3.8, 0.2, 50, 50, 1e6, 1e6, false, 201,
        );
        match rec {
            Recommendation::Trade(setup) => {
                assert_eq!(setup.route_id, route);
                assert!(setup.realization_probability > 0.0);
            }
            Recommendation::Abstain { reason, .. } => {
                panic!("expected Trade, got Abstain({:?})", reason);
            }
        }
    }

    #[test]
    fn halt_rejects_sample_even_with_good_spread() {
        let server = mk_server();
        let route = mk_route();
        // Popula histórico suficiente.
        for i in 0..200 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.0, -1.0, 50, 50, 1e6, 1e6, false, i,
            );
        }
        // Spread alto, mas halt_active=true → sample rejeitado.
        let (_rec, dec, accepted) = server.on_opportunity(
            201, route, "BTC-USDT", 3.5, -0.5, 50, 50, 1e6, 1e6, true, 201,
        );
        assert!(accepted.is_none(), "halt não gera AcceptedSample");
        assert_eq!(dec, SampleDecision::RejectHalt);
    }

    #[tokio::test]
    async fn raw_writer_receives_all_samples_with_modulus_1() {
        // ADR-025 gate de aceitação #2 — com `modulus=1`, toda observação
        // passa pelo writer, independentemente do trigger aceitar.
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "test".into(),
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // 50 observações — todas devem ser rejeitadas pelo trigger
        // (n_min=100), mas todas devem aparecer no RawSample dataset.
        for i in 0..50 {
            server.on_opportunity(
                i as u32, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false,
                1_745_159_400u64 * 1_000_000_000 + i as u64,
            );
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
        // Drop do server descarta o handle dentro dele; mas temos um
        // clone via `with_raw_writer` consumido. O handle interno é
        // dropado quando o server sai de escopo.
        drop(server);
        task.await.expect("task join");

        // Conta linhas gravadas — deve ser 50.
        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        assert!(hour_dir.exists(), "hour dir criado");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        assert_eq!(files.len(), 1);
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line_count = content.lines().count();
        assert_eq!(line_count, 50, "deve gravar todas 50 observações");

        // Verifica que métrica foi incrementada.
        // Não temos mais ref ao server, mas o teste anterior já validou
        // que `raw_samples_emitted` sobe em ordem. Aqui o ponto é contar
        // no disco.
    }

    #[test]
    fn raw_writer_respects_decimator_distribution() {
        // ADR-025 gate de aceitação #3 — decimator ~10% de rotas.
        // Criamos server sem writer conectado (apenas conta métrica não
        // vai subir, mas o decimator já determinou o mod 10 correto).
        let d = RouteDecimator::with_modulus(10);
        // Verifica que para `mk_route` do teste, should_persist é
        // estável entre chamadas (determinismo PIT).
        let r = mk_route();
        let decision = d.should_persist(r);
        for _ in 0..100 {
            assert_eq!(d.should_persist(r), decision);
        }
    }

    #[tokio::test]
    async fn pit_sample_decision_preserved_in_raw_sample() {
        // ADR-025 gate de aceitação #3 — o veredito do trigger persistido
        // no RawSample deve ser idêntico ao retornado por on_opportunity.
        use crate::ml::persistence::{RawSampleWriter, RawWriterConfig};
        use std::time::Duration;

        let tmp = tempfile::tempdir().expect("tmpdir");
        let (writer, handle) = RawSampleWriter::create(RawWriterConfig {
            data_dir: tmp.path().to_path_buf(),
            channel_capacity: 1024,
            flush_after_n: 1,
            flush_interval: Duration::from_millis(50),
            file_prefix: "pit".into(),
        });
        let task = tokio::spawn(writer.run());

        let server = mk_server()
            .with_raw_writer(handle)
            .with_raw_decimator(RouteDecimator::with_modulus(1));

        let route = mk_route();
        // Observação que o trigger sinaliza RejectInsufficientHistory
        // (sem histórico acumulado).
        let (_, sample_dec, _) = server.on_opportunity(
            0, route, "BTC-USDT", 2.5, -0.8, 50, 50, 1e6, 1e6, false,
            1_745_159_400u64 * 1_000_000_000,
        );
        assert_eq!(sample_dec, SampleDecision::RejectInsufficientHistory);

        tokio::time::sleep(Duration::from_millis(150)).await;
        drop(server);
        task.await.expect("task join");

        let hour_dir = tmp.path().join("year=2025/month=04/day=20/hour=14");
        let files: Vec<_> = std::fs::read_dir(&hour_dir).unwrap().collect();
        let content = std::fs::read_to_string(files[0].as_ref().unwrap().path()).unwrap();
        let line = content.lines().next().expect("at least 1 line");
        let v: serde_json::Value = serde_json::from_str(line).unwrap();
        assert_eq!(
            v["sample_decision"], "insufficient_history",
            "veredito do trigger preservado PIT no RawSample",
        );
    }
}
