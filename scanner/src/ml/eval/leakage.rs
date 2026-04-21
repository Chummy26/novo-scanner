//! Leakage audit — 5 testes CI bloqueantes (ADR-006).
//!
//! Detectores contra label leakage, a armadilha mais comum em ML financeiro
//! (López de Prado 2018 cap. 7). Os 5 testes implementados são:
//!
//! 1. **Shuffling temporal**: treina sobre dataset com timestamps embaralhados.
//!    Se performance preserva, há leakage (modelo aprendeu função independente
//!    da ordem temporal).
//! 2. **AST feature audit**: parseia AST das funções de feature e rejeita se
//!    alguma feature de treino consulta janela que inclui `t0` ou futuro.
//! 3. **Dataset-wide statistics flag**: rejeita features que usam estatísticas
//!    globais do dataset inteiro (ex: `global_mean`, `global_std`) em vez de
//!    rolling leakage-safe.
//! 4. **Purge verification**: confirma que purged K-fold respeita embargo
//!    `2·T_max` — ordens cruzando a borda do fold são removidas.
//! 5. **Canary forward-looking**: injeta feature sintética que é `y_true`
//!    com ruído e verifica que modelo usa ela (sanity check do pipeline).
//!
//! # Estado atual (Marco 0)
//!
//! Este módulo fornece **scaffolding**. A implementação completa depende
//! de pipeline de treino (Marco 1). Em Marco 0, registramos os testes como
//! `#[ignore]` com TODO claro, garantindo que a estrutura está pronta para
//! Marco 1 e que CI tem ponto de integração.

use std::fmt;

/// Resultado de um teste de leakage.
#[derive(Debug, Clone, PartialEq)]
pub enum LeakageTestResult {
    /// Teste passou — nenhuma evidência de leakage detectada.
    Pass,
    /// Teste falhou — leakage detectado. Detalhe textual para diagnóstico.
    Fail(String),
    /// Teste pulado — dependência ainda não disponível (pipeline de treino).
    Skipped(&'static str),
}

impl fmt::Display for LeakageTestResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Pass => write!(f, "PASS"),
            Self::Fail(msg) => write!(f, "FAIL: {msg}"),
            Self::Skipped(reason) => write!(f, "SKIP: {reason}"),
        }
    }
}

/// Relatório consolidado dos 5 testes.
#[derive(Debug, Clone)]
pub struct LeakageAuditReport {
    pub shuffling_temporal: LeakageTestResult,
    pub ast_feature_audit: LeakageTestResult,
    pub dataset_wide_statistics: LeakageTestResult,
    pub purge_verification: LeakageTestResult,
    pub canary_forward_looking: LeakageTestResult,
}

impl LeakageAuditReport {
    /// `true` se todos os 5 testes passaram OU foram legitimamente skipped.
    /// `false` se qualquer teste falhou.
    pub fn all_pass_or_skip(&self) -> bool {
        let tests = [
            &self.shuffling_temporal,
            &self.ast_feature_audit,
            &self.dataset_wide_statistics,
            &self.purge_verification,
            &self.canary_forward_looking,
        ];
        tests.iter().all(|t| !matches!(t, LeakageTestResult::Fail(_)))
    }

    /// Conta tests em cada status.
    pub fn summary(&self) -> (usize, usize, usize) {
        let tests = [
            &self.shuffling_temporal,
            &self.ast_feature_audit,
            &self.dataset_wide_statistics,
            &self.purge_verification,
            &self.canary_forward_looking,
        ];
        let (mut pass, mut fail, mut skip) = (0, 0, 0);
        for t in tests {
            match t {
                LeakageTestResult::Pass => pass += 1,
                LeakageTestResult::Fail(_) => fail += 1,
                LeakageTestResult::Skipped(_) => skip += 1,
            }
        }
        (pass, fail, skip)
    }
}

/// Placeholder Marco 0: retorna Skipped para todos testes até Marco 1.
///
/// Implementação efetiva virá em Marco 1 quando `training_pipeline`
/// existir em Python. CI já consome esta função e bloqueia se retornar
/// Fail — preparação de infraestrutura.
pub fn run_full_audit() -> LeakageAuditReport {
    let reason = "pipeline de treino ainda não existe (Marco 1)";
    LeakageAuditReport {
        shuffling_temporal: LeakageTestResult::Skipped(reason),
        ast_feature_audit: LeakageTestResult::Skipped(reason),
        dataset_wide_statistics: LeakageTestResult::Skipped(reason),
        purge_verification: LeakageTestResult::Skipped(reason),
        canary_forward_looking: LeakageTestResult::Skipped(reason),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_audit_returns_skipped_but_not_fail() {
        let r = run_full_audit();
        let (pass, fail, skip) = r.summary();
        assert_eq!(pass, 0);
        assert_eq!(fail, 0);
        assert_eq!(skip, 5);
        assert!(r.all_pass_or_skip()); // importante: Skipped não bloqueia CI Marco 0
    }

    #[test]
    fn fail_blocks_all_pass_check() {
        let r = LeakageAuditReport {
            shuffling_temporal: LeakageTestResult::Pass,
            ast_feature_audit: LeakageTestResult::Fail("found global_mean".into()),
            dataset_wide_statistics: LeakageTestResult::Pass,
            purge_verification: LeakageTestResult::Pass,
            canary_forward_looking: LeakageTestResult::Pass,
        };
        assert!(!r.all_pass_or_skip());
    }
}
