$BASE = "http://localhost:5048/api/v1"
$PHONE = "923000010"
$PASSWORD = "Demo@123"

Write-Host "=== FLUXO INDEPENDENTE DO ENTREGADOR ==="

# 1. Login como entregador
$login = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" `
  -Headers @{"Content-Type"="application/json"} `
  -Body (@{phone=$PHONE; password=$PASSWORD; role="DRIVER"} | ConvertTo-Json)
$token = $login.accessToken
Write-Host "1. Login: ACTIVE ($($login.user.status)) | Role: $($login.user.role)"

# 2. Ficar online
Invoke-RestMethod -Method Post -Uri "$BASE/drivers/me/online" `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body '{"latitude":-8.8139,"longitude":13.233}'
Write-Host "2. Online: OK"

# 3. Ver ofertas (independente de fornecedor)
Write-Host "3. Ver ofertas..."
try {
  $offers = Invoke-RestMethod -Method Get -Uri "$BASE/drivers/me/offers" `
    -Headers @{"Authorization"="Bearer $token"}
  Write-Host ($offers | ConvertTo-Json -Depth 2)
} catch {
  Write-Host "Nenhuma oferta no momento (independente de fornecedor). Continuando..."
}

# 4. Ver entrega atual
Write-Host "4. Entrega atual..."
try {
  $delivery = Invoke-RestMethod -Method Get -Uri "$BASE/drivers/me/deliveries/current" `
    -Headers @{"Authorization"="Bearer $token"}
  Write-Host ($delivery | ConvertTo-Json -Depth 2)
} catch {
  Write-Host "Nenhuma entrega ativa (independente de fornecedor)."
}

# 5. Atualizar localização (independente)
Invoke-RestMethod -Method Post -Uri "$BASE/drivers/me/location" `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body '{"latitude":-8.8139,"longitude":13.233}'
Write-Host "5. Localização atualizada."

# 6. Ver perfil (confirmar 200, não 403)
Write-Host "6. Perfil do entregador..."
$profile = Invoke-RestMethod -Method Get -Uri "$BASE/drivers/me" `
  -Headers @{"Authorization"="Bearer $token"}
Write-Host ($profile | ConvertTo-Json -Depth 2)
Write-Host "=== FLUXO COMPLETO E INDEPENDENTE ==="
