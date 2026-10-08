$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$pagina = "https://sismicidad.desarrolloapp.workers.dev"
$secretoPath = Join-Path $root "puente.secreto"
$cloudflared = Join-Path $root "cloudflared.exe"
$log = Join-Path $root "puente-cloudflared.log"

Write-Host ""
Write-Host "Deja esta ventana abierta. Si la cierras, se corta el puente."
Write-Host ""

if (-not (Test-Path $cloudflared)) {
  Write-Host "Falta cloudflared.exe en esta carpeta."
  Read-Host "Enter para cerrar"
  exit 1
}
if (-not (Test-Path $secretoPath)) {
  Write-Host "Falta puente.secreto en esta carpeta."
  Read-Host "Enter para cerrar"
  exit 1
}

$python = Join-Path $root "python-portable\python.exe"
if (-not (Test-Path $python)) {
  $python = Join-Path $root "venv\Scripts\python.exe"
}
if (-not (Test-Path $python)) {
  Write-Host "Falta el programa. Esta carpeta tiene que copiarse completa."
  Read-Host "Enter para cerrar"
  exit 1
}

$env:SISMICO_MODO = "mina"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "set SISMICO_MODO=mina&& `"$python`" -m uvicorn app.main:app --host 127.0.0.1 --port 8030" -WorkingDirectory (Join-Path $root "backend")

if (Test-Path $log) { Remove-Item $log -Force }
Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--url", "http://127.0.0.1:8030", "--logfile", $log, "--loglevel", "info")

$direccion = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 2
  if (-not (Test-Path $log)) { continue }
  $texto = Get-Content -Path $log -Raw -ErrorAction SilentlyContinue
  if ($texto -match "https://[a-z0-9-]+\.trycloudflare\.com") {
    $direccion = $Matches[0]
    break
  }
}

if (-not $direccion) {
  Write-Host "No aparecio la direccion del puente. Revisa la otra ventana."
  Read-Host "Enter para cerrar"
  exit 1
}

$secreto = (Get-Content -Path $secretoPath -Raw).Trim()
$cuerpo = @{ url = $direccion } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "$pagina/api/puente" -Headers @{ "x-puente-secreto" = $secreto } -ContentType "application/json" -Body $cuerpo | Out-Null
  Write-Host "Pagina avisada. Los datos salen por:"
  Write-Host $direccion
} catch {
  Write-Host "La pagina no recibio la direccion."
  Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "No cierres las ventanas."
Write-Host ""
Read-Host "Enter para cerrar esta ventana"
