import json, math
from collections import Counter, defaultdict

ACC = r"C:/Users/nicoolas/Pictures/novo sc anner/data/ml/accepted_samples/year=2026/month=04/day=29/hour=07/scanner-58884_1777448789.jsonl"
LBL = r"C:/Users/nicoolas/Pictures/novo sc anner/data/ml/labeled_trades/year=2026/month=04/day=29/hour=07/labeled-scanner-58884_1777448955.jsonl"

def pct(a,q):
    if not a: return None
    s=sorted(a); i=int((len(s)-1)*q); return s[i]

acc_n=0; acc_routes=set(); acc_was_recommended=Counter()
acc_entry=[]; acc_exit=[]; acc_buy_vol=[]; acc_sell_vol=[]
acc_tier=Counter(); acc_decisions=Counter()
acc_runtime_hash=Counter(); acc_schema=Counter()
acc_n_snapshots=[]
sum_violations_acc=0; zero_sum_acc=0
with open(ACC, encoding="utf-8") as f:
    for line in f:
        try: r=json.loads(line)
        except: continue
        acc_n+=1
        acc_routes.add((r["symbol_name"], r["buy_venue"], r["sell_venue"], r["buy_market"], r["sell_market"]))
        acc_was_recommended[r.get("was_recommended")]+=1
        es=r.get("entry_spread"); xs=r.get("exit_spread")
        if es is not None: acc_entry.append(es)
        if xs is not None: acc_exit.append(xs)
        if es is not None and xs is not None:
            s=es+xs
            if s>1e-7: sum_violations_acc+=1
            if abs(s)<1e-9: zero_sum_acc+=1
        if r.get("buy_vol24") is not None: acc_buy_vol.append(r["buy_vol24"])
        if r.get("sell_vol24") is not None: acc_sell_vol.append(r["sell_vol24"])
        acc_tier[r.get("sampling_tier")]+=1
        acc_decisions[r.get("sample_decision")]+=1
        acc_runtime_hash[r.get("runtime_config_hash")]+=1
        acc_schema[r.get("schema_version")]+=1
        if r.get("route_n_snapshots") is not None: acc_n_snapshots.append(r["route_n_snapshots"])

print("=== ACCEPTED ===")
print(f"n_records: {acc_n}")
print(f"distinct routes: {len(acc_routes)}")
print(f"sample_decision: {dict(acc_decisions)}")
print(f"schema_version: {dict(acc_schema)}")
print(f"runtime_hash distinct: {len(acc_runtime_hash)} -> {list(acc_runtime_hash.keys())}")
print(f"was_recommended: {dict(acc_was_recommended)}")
print(f"tier: {dict(acc_tier)}")
print(f"sum_violations gt 0: {sum_violations_acc}, zero_sum: {zero_sum_acc}")
print(f"entry: min={min(acc_entry):.4f} p10={pct(acc_entry,0.1):.4f} p50={pct(acc_entry,0.5):.4f} p90={pct(acc_entry,0.9):.4f} p95={pct(acc_entry,0.95):.4f} p99={pct(acc_entry,0.99):.4f} max={max(acc_entry):.4f}")
print(f"exit: min={min(acc_exit):.4f} p10={pct(acc_exit,0.1):.4f} p50={pct(acc_exit,0.5):.4f} p90={pct(acc_exit,0.9):.4f} max={max(acc_exit):.4f}")
print(f"buy_vol p10/50/90: {pct(acc_buy_vol,0.1):.0f} / {pct(acc_buy_vol,0.5):.0f} / {pct(acc_buy_vol,0.9):.0f}")
print(f"sell_vol p10/50/90: {pct(acc_sell_vol,0.1):.0f} / {pct(acc_sell_vol,0.5):.0f} / {pct(acc_sell_vol,0.9):.0f}")
print(f"route_n_snapshots: min={min(acc_n_snapshots)} p10={pct(acc_n_snapshots,0.1)} p50={pct(acc_n_snapshots,0.5)} p90={pct(acc_n_snapshots,0.9)} max={max(acc_n_snapshots)}")

lbl_n=0
horizons=Counter(); decisions=Counter(); outcomes=Counter(); censor=Counter()
schemas=Counter(); rec_kinds=Counter(); abstain_reasons=Counter(); cal_status=Counter()
ci_methods=Counter(); pred_kinds=Counter(); tiers_l=Counter()
clusters=set(); cluster_sizes=Counter()
sample_ids=set(); routes=set()
entry_locked=[]; exit_start=[]; floor_pct=[]; n_clean_future=[]
hits_floors=Counter()
null_first_hit=0; null_audit=0; triplet_violations=0
features_t0_keys_present=Counter()
effective_strides=Counter()
acc_in_labeled=0
outcome_by_decision=defaultdict(Counter)
outcome_by_horizon=defaultdict(Counter)
realized_with_first_hit=0; realized_without_first_hit=0

with open(LBL, encoding="utf-8") as f:
    for line in f:
        try: r=json.loads(line)
        except: continue
        lbl_n+=1
        h=r.get("horizon_s"); horizons[h]+=1
        sd=r.get("sample_decision"); decisions[sd]+=1
        if sd=="accept": acc_in_labeled+=1
        oc=r.get("outcome"); outcomes[oc]+=1
        if oc=="realized":
            if r.get("first_exit_ge_label_floor_ts_ns") is not None:
                realized_with_first_hit+=1
            else:
                realized_without_first_hit+=1
        cr=r.get("censor_reason"); censor[cr]+=1
        schemas[r.get("schema_version")]+=1
        pm=r.get("policy_metadata", {})
        rec_kinds[pm.get("recommendation_kind")]+=1
        abstain_reasons[pm.get("abstain_reason")]+=1
        cal_status[pm.get("prediction_calibration_status")]+=1
        ci_methods[pm.get("ci_method")]+=1
        pred_kinds[pm.get("prediction_source_kind")]+=1
        tiers_l[r.get("sampling_tier")]+=1
        clusters.add(r.get("cluster_id")); cluster_sizes[r.get("cluster_size")]+=1
        sample_ids.add(r.get("sample_id"))
        routes.add((r.get("symbol_name"), r.get("buy_venue"), r.get("sell_venue"), r.get("buy_market"), r.get("sell_market")))
        ft=r.get("features_t0", {})
        for k,v in ft.items():
            features_t0_keys_present[k]+=(1 if v is not None else 0)
        eff=pm.get("effective_stride_s"); effective_strides[(h,eff)]+=1
        el=r.get("entry_locked_pct")
        if el is not None: entry_locked.append(el)
        ess=r.get("exit_start_pct")
        if ess is not None: exit_start.append(ess)
        fp=r.get("label_floor_pct")
        if fp is not None: floor_pct.append(fp)
        ncf=r.get("n_clean_future_samples")
        if ncf is not None: n_clean_future.append(ncf)
        if r.get("first_exit_ge_label_floor_ts_ns") is None: null_first_hit+=1
        if r.get("audit_hindsight_best_exit_pct") is None: null_audit+=1
        for hit in (r.get("label_floor_hits") or []):
            f_pct=hit.get("floor_pct"); hits_floors[f_pct]+=1
        ou=r.get("observed_until_ns",0); ct=r.get("closed_ts_ns",0); wt=r.get("written_ts_ns",0)
        if not (ou<=ct<=wt): triplet_violations+=1
        outcome_by_decision[sd][oc]+=1
        outcome_by_horizon[h][oc]+=1

print("\n=== LABELED ===")
print(f"n_records: {lbl_n}")
print(f"distinct sample_ids: {len(sample_ids)}")
print(f"distinct routes: {len(routes)}")
print(f"distinct cluster_ids: {len(clusters)}")
print(f"horizons: {dict(horizons)}")
print(f"effective_stride_s by (horizon, value): {dict(effective_strides)}")
print(f"sample_decision distrib: {dict(decisions)}")
print(f"acc_in_labeled (sample_decision==accept): {acc_in_labeled} ({100*acc_in_labeled/lbl_n:.1f}%)")
print(f"outcomes: {dict(outcomes)}")
print(f"realized_with_first_hit: {realized_with_first_hit}, realized_without: {realized_without_first_hit}")
print(f"censor: {dict(censor)}")
print(f"recommendation_kind: {dict(rec_kinds)}")
print(f"abstain_reason: {dict(abstain_reasons)}")
print(f"calib_status: {dict(cal_status)}")
print(f"ci_methods: {dict(ci_methods)}")
print(f"prediction_source_kind: {dict(pred_kinds)}")
print(f"cluster_sizes: {dict(cluster_sizes)}")
print("\n=== OUTCOME by sample_decision ===")
for sd, oc in outcome_by_decision.items():
    print(f"  {sd}: {dict(oc)}")
print("\n=== OUTCOME by horizon ===")
for h, oc in sorted(outcome_by_horizon.items()):
    print(f"  h={h}: {dict(oc)}")
print("\n=== entry_locked / exit_start / floor / n_clean_future ===")
for label,arr in [("entry_locked",entry_locked),("exit_start",exit_start),("floor_pct",floor_pct),("n_clean_future",n_clean_future)]:
    if arr:
        print(f"  {label}: n={len(arr)} min={min(arr):.4f} p10={pct(arr,0.1):.4f} p50={pct(arr,0.5):.4f} p90={pct(arr,0.9):.4f} max={max(arr):.4f}")
print("\n=== label_floor_hits floors ===")
for k,v in hits_floors.most_common(): print(f"  floor={k}: {v}")
print(f"\nnull_first_hit: {null_first_hit}/{lbl_n} ({100*null_first_hit/lbl_n:.1f}%)")
print(f"null_audit_best (oracle): {null_audit}/{lbl_n}")
print(f"triplet_violations: {triplet_violations}")
print("\n=== features_t0 not-null counts ===")
for k,v in sorted(features_t0_keys_present.items(), key=lambda x: -x[1])[:25]:
    print(f"  {k}: {v}/{lbl_n} ({100*v/lbl_n:.1f}%)")
