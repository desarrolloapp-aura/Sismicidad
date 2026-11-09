$ErrorActionPreference = "Stop"
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $aqui
$script = Join-Path $aqui "arranque-sala.ps1"
$nombre = "Sismicidad puente"

if (-not (Test-Path $script)) {
  Write-Host "Falta arranque-sala.ps1 en esta carpeta."
  exit 1
}

$accion = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" -WorkingDirectory $root
$disparo = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 9999)
$tarea = New-ScheduledTask -Action $accion -Trigger $disparo -Principal $principal -Settings $ajustes
Register-ScheduledTask -TaskName $nombre -InputObject $tarea -Force | Out-Null
Disable-ScheduledTask -TaskName $nombre | Out-Null

Write-Host ""
Write-Host "Listo. El arranque quedo instalado y apagado."
Write-Host "Cuando el PC este en la mina, abri Iniciar puente.bat."
Write-Host "Ahi arranca con Windows, se vuelve a abrir si se corta, y no usa VPN."
Write-Host ""
