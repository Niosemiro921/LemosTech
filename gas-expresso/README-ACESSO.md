# Acesso ao Sistema pelo Celular / Outra Máquina (Rede Local)

Como ainda não fizemos deploy, o sistema precisa ser iniciado manualmente e vinculado a todas as interfaces de rede (`0.0.0.0`) para ser acedido pelo telemóvel ou outra máquina na mesma rede Wi-Fi.

## Alterações Feitas

### 1. Backend (`gas-expresso/backend/src/main.ts`)
- Alterado o `app.listen(port, '0.0.0.0')` para escutar em todas as interfaces de rede.
- Alterado o `CORS` para `origin: true`, permitindo qualquer origem (necessário quando acedido de outro IP).

### 2. Frontend (`gas-expresso/frontend/vite.config.ts`)
- Adicionado `server: { host: true }` para que o Vite sirva em `0.0.0.0` (não apenas `localhost`).

### 3. API Client (`gas-expresso/frontend/src/lib/api.ts`)
- Já estava configurado para usar automaticamente o `window.location.hostname` e `protocol`, portanto, quando aceder `http://192.168.1.x:5173`, as requisições API vão para `http://192.168.1.x:5048/api/v1` automaticamente.

## Como Iniciar

1. Abra um terminal na pasta raiz (`gas-expresso`).
2. Execute:

```powershell
# No PowerShell
.\start-in-rede.ps1
```

3. Anote o IP mostrado (ex: `192.168.18.6`).
4. No telemóvel (mesma rede Wi-Fi), aceda:

```
http://<IP>:5173
```

Exemplo:
```
http://192.168.18.6:5173
```

## Portas Utilizadas

| Serviço | Porta | Endereço |
|--------|-------|----------|
| Backend (API) | 5048 | `http://<IP>:5048/api/v1` |
| Frontend (UI) | 5173 | `http://<IP>:5173` |

## Se Não Funcionar

- Verifique se está na mesma rede Wi-Fi.
- Confirme que o firewall do Windows permite as portas `5048` e `5173`:
  - Painel de Controlo > Sistema e Segurança > Firewall do Windows > Permitir um aplicativo ou recurso.
- Pode ser necessário adicionar uma regra de entrada para as portas `5048` e `5173`.
