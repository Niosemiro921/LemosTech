# ==============================================================================
# GAS EXPRESSO - Iniciar o sistema na rede local (sem deploy)
# ==============================================================================
# Este script inicia o backend e o frontend vinculados a todas as interfaces
# de rede, permitindo acesso via IP + porta a partir de outro telemovel ou
# outra maquina na mesma rede Wi-Fi.
#
# Backend : http://<IP>:5048/api/v1
# Frontend: http://<IP>:5173
# ==============================================================================

$ErrorActionPreference = "Stop"
$backendPort = 5048
$frontendPort = 5173

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   GAS EXPRESSO - Acesso na rede local (IP + porta)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Detectar IPv4 local (exclui loopback e interfaces virtuais)
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike "Loopback*" -and
    $_.InterfaceAlias -notlike "*VMware*" -and
    $_.InterfaceAlias -notlike "*VirtualBox*" -and
    $_.IPAddress -notlike "169.254*" -and
    $_.IPAddress -notmatch "^127\."
} | Select-Object -ExpandProperty IPAddress) -join ", "

if (-not $ip) {
    Write-Host "[AVISO] Nao foi possivel detectar o IP local automaticamente." -ForegroundColor Yellow
    $ip = "192.168.1.x"
}

Write-Host "Enderecos IP detectados: $ip" -Foreground Green
Write-Host ""

Write-Host "Backend API  : http://$ip:$backendPort/api/v1" -ForegroundColor Green
Write-Host "Frontend UI  : http://$ip:$frontendPort" -ForegroundColor Green
Write-Host ""

Write-Host "Como aceder pelo telemovel / outra maquina:" -ForegroundColor Yellow
Write-Host "  1. Conecte o telemovel na mesma rede Wi-Fi deste PC."
Write-Host "  2. Abra o navegador e aceda ao endereco acima."
Write-Host ""
Write-Host "Como funciona o acesso automatico ao backend:" -ForegroundColor Yellow
Write-Host "  - O frontend usa a URL da pagina corrente (window.location)"
Write-Host "  - Se aceder http://192.168.1.x:5173, as requisicoes API sao feitas"
Write-Host "    para http://192.168.1.x:5048/api/v1 automaticamente."
Write-Host ""
Write-Host "Dicas:" -ForegroundColor Yellow
Write-Host "  - Certifique-se de que o firewall do Windows permite as portas $backendPort e $frontendPort."
Write-Host "  - Se o telemovel nao conseguir aceder, verifique se esta na mesma rede Wi-Fi."
Write-Host ""
Write-Host "Pressione Ctrl+C para parar ambos os servidores." -ForegroundColor DarkGray
Write-Host ""

# Iniciar backend em background (NestJS com listen em 0.0.0.0 no main.ts)
Write-Host "Iniciando backend..." -ForegroundColor White
$backendJob = Start-Job -ScriptBlock {
    $env:PORT = $using:backendPort
    $env:CORS_ORIGIN = "*"
    cd "$using:PSScriptRoot\backend"
    npm run start:dev
}

# Iniciar frontend em background (Vite com --host)
Write-Host "Iniciando frontend..." -ForegroundColor White
$frontendJob = Start-Job -ScriptBlock {
    cd "$using:PSScriptRoot\frontend"
    npm run dev -- --host --port $using:frontendPort
}

Write-Host "Servidores iniciados em segundo plano." -ForegroundColor Green
Write-Host "Acesse: http://$ip:$frontendPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para parar: Stop-Job -Name backendJob; Stop-Job -Name frontendJob" -ForegroundColor DarkGray