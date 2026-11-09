$ErrorActionPreference = "Continue"
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $aqui
Set-Location $root

$pagina = "https://sismicidad.desarrolloapp.workers.dev"
$secretoPath = Join-Path $root "puente.secreto"
$cloudflared = Join-Path $aqui "cloudflared.exe"
$logTunel = Join-Path $aqui "arranque-tunel.log"
$logPropio = Join-Path $aqui "arranque.log"
$avisada = $null
$lectura = $null
$tunel = $null

function Anotar([string]$mensaje) {
  $linea = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $mensaje
  Add-Content -Path $logPropio -Value $linea -ErrorAction SilentlyContinue
}

function PuertoAbierto {
  $cliente = $null
  try {
    $cliente = New-Object System.Net.Sockets.TcpClient
    $espera = $cliente.BeginConnect("127.0.0.1", 8030, $null, $null)
    $abrio = $espera.AsyncWaitHandle.WaitOne(500, $false) -and $cliente.Connected
    if ($abrio) { $cliente.EndConnect($espera) }
    return $abrio
  } catch {
    return $false
  } finally {
    if ($cliente) { $cliente.Close() }
  }
}

$python = Join-Path $root "python-portable\python.exe"
if (-not (Test-Path $python)) { $python = Join-Path $root "venv\Scripts\python.exe" }
if (-not (Test-Path $python) -or -not (Test-Path $cloudflared) -or -not (Test-Path $secretoPath)) {
  Anotar "Falta python, cloudflared.exe o puente.secreto en esta carpeta."
  exit 1
}

$env:SISMICO_MODO = "mina"
$env:SISMICO_LOG = $logPropio
$secreto = (Get-Content -Path $secretoPath -Raw).Trim()
Anotar "Arranque de sala iniciado."

while ($true) {
  $lecturaViva = $lectura -and -not $lectura.HasExited
  if (-not (PuertoAbierto) -and -not $lecturaViva) {
    $env:SISMICO_MODO = "mina"
    $env:SISMICO_LOG = $logPropio
    $lectura = Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8030") -WorkingDirectory (Join-Path $root "backend") -WindowStyle Hidden -PassThru
    Anotar "Lectura iniciada."
  }

  $tunelVivo = $tunel -and -not $tunel.HasExited
  if (-not $tunelVivo) {
    if (Test-Path $logTunel) { Remove-Item $logTunel -Force -ErrorAction SilentlyContinue }
    $tunel = Start-Process -FilePath $cloudflared -ArgumentList @("tunnel", "--protocol", "http2", "--url", "http://127.0.0.1:8030", "--logfile", $logTunel, "--loglevel", "info") -WindowStyle Hidden -PassThru
    $avisada = $null
    Anotar "Tunel iniciado por HTTP/2."
  }

  if (Test-Path $logTunel) {
    $texto = Get-Content -Path $logTunel -Raw -ErrorAction SilentlyContinue
    $coincidencias = [regex]::Matches([string]$texto, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($coincidencias.Count -gt 0) {
      $direccion = $coincidencias[$coincidencias.Count - 1].Value
      if ($direccion -ne $avisada) {
        try {
          $cuerpo = @{ url = $direccion } | ConvertTo-Json
          Invoke-RestMethod -Method Post -Uri "$pagina/api/puente" -Headers @{ "x-puente-secreto" = $secreto } -ContentType "application/json" -Body $cuerpo | Out-Null
          $avisada = $direccion
          Anotar "Pagina avisada: $direccion"
        } catch {
          Anotar "La pagina no recibio la direccion. Se reintenta."
        }
      }
    }
  }

  Start-Sleep -Seconds 5
}
