import json
from collections import Counter, defaultdict

RAW = r"C:/Users/nicoolas/Pictures/novo sc anner/data/ml/raw_samples/year=2026/month=04/day=29/hour=07/raw-scanner-58884_1777448054.jsonl"
ACC = r"C:/Users/nicoolas/Pictures/novo sc anner/data/ml/accepted_samples/year=2026/month=04/day=29/hour=07/scanner-58884_1777448789.jsonl"

# 1. cobertura de venue total no universo
all_venues = set()
# 2. count de routes por direcao (A->B vs B->A)
direction_pairs = Counter()
# 3. accept por tier no raw
acc_by_tier_raw = Counter()
# 4. accept por tier no accepted
acc_by_tier_acc = Counter()
# 5. raw entries com entry_spread > 5% — outliers extremos
huge_entry = 0
top_huge = []

n_raw = 0
with open(RAW, encoding="utf-8") as f:
    for line in f:
        try: r = json.loads(line)
        except: continue
        n_raw += 1
        all_venues.add(r.get("buy_venue"))
        all_venues.add(r.get("sell_venue"))
        bv, sv = r.get("buy_venue"), r.get("sell_venue")
        bm, sm = r.get("buy_market"), r.get("sell_market")
        sym = r.get("symbol_name")
        # canonical pair direction-agnostic
        a = (bv, bm); b = (sv, sm)
        pair = tuple(sorted([a, b]))
        direction_pairs[(sym, pair)] += 1
        if r.get("sample_decision") == "accept":
            acc_by_tier_raw[r.get("sampling_tier")] += 1
        es = r.get("entry_spread")
        if es is not None and abs(es) > 5.0:
            huge_entry += 1
            if len(top_huge) < 10:
                top_huge.append((es, sym, bv, sv, bm, sm))

n_acc = 0
with open(ACC, encoding="utf-8") as f:
    for line in f:
        try: r = json.loads(line)
        except: continue
        n_acc += 1
        acc_by_tier_acc[r.get("sampling_tier")] += 1

print(f"=== ALL VENUES IN RAW ===")
print(f"distinct venues (buy or sell): {sorted(all_venues)}")
print(f"missing from documented 11: kucoin?")

print(f"\n=== DIRECTION DOUBLING CHECK ===")
# para cada (sym, pair_unordered), conta quantas direcoes (1 ou 2)
direction_counts = Counter()
for (sym, pair), cnt in direction_pairs.items():
    direction_counts[cnt > 0] += 1  # always >0
# Em vez disso: para cada par unordered, conta direcoes distintas
pair_directions = defaultdict(set)
with open(RAW, encoding="utf-8") as f:
    for line in f:
        try: r = json.loads(line)
        except: continue
        bv, sv = r.get("buy_venue"), r.get("sell_venue")
        bm, sm = r.get("buy_market"), r.get("sell_market")
        sym = r.get("symbol_name")
        a = (bv, bm); b = (sv, sm)
        pair_directions[(sym, tuple(sorted([a,b])))].add((a,b))
n_pairs = len(pair_directions)
n_with_both_dirs = sum(1 for d in pair_directions.values() if len(d) == 2)
print(f"distinct (sym, unordered_pair): {n_pairs}")
print(f"with both directions registered: {n_with_both_dirs} ({100*n_with_both_dirs/n_pairs:.1f}%)")

print(f"\n=== ACCEPT por TIER: RAW vs ACCEPTED ===")
print(f"raw accept by tier: {dict(acc_by_tier_raw)}  (total raw accept: {sum(acc_by_tier_raw.values())})")
print(f"accepted file by tier: {dict(acc_by_tier_acc)}  (total accepted: {n_acc})")

print(f"\n=== OUTLIERS entry_spread |es|>5% ===")
print(f"count: {huge_entry}/{n_raw} ({100*huge_entry/n_raw:.4f}%)")
for es, sym, bv, sv, bm, sm in top_huge:
    print(f"  entry={es:.2f}% {sym} {bv}:{bm} -> {sv}:{sm}")
