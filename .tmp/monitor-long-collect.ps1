param(
    [int]$Minutes = 120,
    [int]$IntervalSeconds = 300,
    [string]$OutDir = ".tmp\long-monitor-20260507"
)

$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$started = Get-Date
$deadline = $started.AddMinutes($Minutes)
$i = 0

function Convert-PromMetrics {
    param([string]$Text)
    $map = @{}
    foreach ($line in ($Text -split "`n")) {
        $line = $line.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) { continue }
        if ($line -match '^([^{\s]+)(\{[^}]+\})?\s+([-+0-9.eE]+)$') {
            $name = $matches[1]
            $labels = if ($matches[2]) { $matches[2] } else { "" }
            $key = "$name$labels"
            $value = [double]$matches[3]
            $map[$key] = $value
        }
    }
    return $map
}

function Metric-Sum {
    param($Metrics, [string]$Pattern)
    $sum = 0.0
    foreach ($key in $Metrics.Keys) {
        if ($key -match $Pattern) {
            $sum += [double]$Metrics[$key]
        }
    }
    return $sum
}

while ((Get-Date) -lt $deadline) {
    $i += 1
    $ts = Get-Date
    $pidText = $null
    $process = $null
    if (Test-Path ".tmp\scanner_collect.pid") {
        $pidText = Get-Content ".tmp\scanner_collect.pid" -ErrorAction SilentlyContinue
        if ($pidText -match '^\d+$') {
            $process = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue |
                Select-Object Id,ProcessName,StartTime,CPU,WorkingSet64
        }
    }

    try { $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/healthz" -TimeoutSec 5 } catch { $health = @{ error = $_.Exception.Message } }
    try { $status = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/spread/status" -TimeoutSec 10 } catch { $status = @{ error = $_.Exception.Message } }
    try { $metricsText = (Invoke-WebRequest -Uri "http://127.0.0.1:8000/metrics" -UseBasicParsing -TimeoutSec 10).Content } catch { $metricsText = ""; $metricsError = $_.Exception.Message }

    $metrics = Convert-PromMetrics $metricsText
    $enabledDisconnected = @()
    $stale = @()
    if ($status -and $status.venues) {
        foreach ($v in $status.venues) {
            $isKucoin = $v.venue -eq "kucoin"
            if (!$v.connected -and !$isKucoin) { $enabledDisconnected += "$($v.venue):$($v.market)" }
            if ($v.staleSymbols -gt 0) { $stale += "$($v.venue):$($v.market)=$($v.staleSymbols)" }
        }
    }

    $summary = [ordered]@{
        ts = $ts.ToString("o")
        elapsed_s = [int]($ts - $started).TotalSeconds
        pid = $pidText
        process_alive = $null -ne $process
        process = $process
        health = $health
        enabled_disconnected = $enabledDisconnected
        stale_symbols = $stale
        raw_drops = Metric-Sum $metrics '^ml_raw_samples_dropped_total'
        accepted_drops = Metric-Sum $metrics '^ml_accepted_samples_dropped_total'
        label_writer_drops = Metric-Sum $metrics '^ml_labels_dropped_writer_total'
        label_capacity_drops = Metric-Sum $metrics '^ml_labels_dropped_capacity_total'
        compaction_failures = Metric-Sum $metrics '^ml_dataset_compactions_total\{.*status="failure"'
        raw_emitted = Metric-Sum $metrics '^ml_raw_samples_emitted_total$'
        labels_created = Metric-Sum $metrics '^ml_labels_created_total$'
        labels_written_realized = Metric-Sum $metrics '^ml_labels_written_total\{outcome="realized"\}'
        labels_written_miss = Metric-Sum $metrics '^ml_labels_written_total\{outcome="miss"\}'
        labels_written_censored = Metric-Sum $metrics '^ml_labels_written_total\{outcome="censored"\}'
        opportunities_seen = Metric-Sum $metrics '^ml_opportunities_seen_total$'
        scanner_opportunities = Metric-Sum $metrics '^scanner_opportunities_total$'
        full_cycle_p99_ns = Metric-Sum $metrics '^scanner_spread_full_cycle_ns_p99$'
        spread_cycle_p99_ns = Metric-Sum $metrics '^scanner_spread_cycle_ns_p99$'
    }

    $snapshot = [ordered]@{
        summary = $summary
        status = $status
    }

    $path = Join-Path $OutDir ("snapshot_{0:000}.json" -f $i)
    $snapshot | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path
    $summary | ConvertTo-Json -Compress -Depth 8 | Add-Content -LiteralPath (Join-Path $OutDir "summary.jsonl")
    Start-Sleep -Seconds $IntervalSeconds
}
