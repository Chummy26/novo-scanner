$ErrorActionPreference = 'SilentlyContinue'
Start-Sleep -Seconds 2400
try { Invoke-WebRequest -Method Post -Uri 'http://127.0.0.1:8000/api/admin/shutdown' -TimeoutSec 30 | Out-File -FilePath 'C:\Users\nicoolas\Pictures\novo sc anner\.tmp\collect-40m-20260508-023228\shutdown.response.txt' -Encoding utf8 } catch { $_.Exception.ToString() | Out-File -FilePath 'C:\Users\nicoolas\Pictures\novo sc anner\.tmp\collect-40m-20260508-023228\shutdown.error.txt' -Encoding utf8 }
Start-Sleep -Seconds 60
$proc = Get-Process -Id 29768 -ErrorAction SilentlyContinue
if ($proc) { Stop-Process -Id 29768 -Force }
