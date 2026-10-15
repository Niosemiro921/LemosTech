$BASE = "http://localhost:5048/api/v1"
$PHONE = "923000010"
$PASSWORD = "Demo@123"

Write-Host "1. Login..."
$login = Invoke-RestMethod -Method Post -Uri "$BASE/auth/login" `
  -Headers @{"Content-Type"="application/json"} `
  -Body (@{phone=$PHONE; password=$PASSWORD; role="DRIVER"} | ConvertTo-Json)

$token = $login.accessToken
Write-Host "Token recebido. User status: $($login.user.status)"

Write-Host "Token JWT (base64 decodificado):"
$json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($token.Split('.')[1] -replace '-','+' -replace '_','/')))
$json | ConvertFrom-Json | ConvertTo-Json -Depth 3
Write-Host ""
Write-Host "2. POST drivers/me/online..."
Invoke-RestMethod -Method Post -Uri "$BASE/drivers/me/online" `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body (@{latitude=-8.8139; longitude=13.233} | ConvertTo-Json)
Write-Host "Online enviado."

Write-Host "3. GET drivers/me..."
$result = Invoke-RestMethod -Method Get -Uri "$BASE/drivers/me" `
  -Headers @{"Authorization"="Bearer $token"}
Write-Host ($result | ConvertTo-Json -Depth 3)
