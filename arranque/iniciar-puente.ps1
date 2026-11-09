$ErrorActionPreference = "Stop"
$nombre = "Sismicidad puente"

$tarea = Get-ScheduledTask -TaskName $nombre -ErrorAction SilentlyContinue
if (-not $tarea) {
  Write-Host "Primero abri Instalar arranque.bat en esta carpeta."
  exit 1
}

Enable-ScheduledTask -TaskName $nombre | Out-Null
Start-ScheduledTask -TaskName $nombre

Write-Host ""
Write-Host "El programa quedo andando."
Write-Host "Este PC tiene que quedar prendido, en la red de la mina, y sin VPN."
Write-Host "Si se corta la red, vuelve a leer solo. El registro queda en arranque.log."
Write-Host ""
