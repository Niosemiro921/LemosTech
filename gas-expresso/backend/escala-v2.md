# Roteiro: V1 → Escalável (PostGIS + Cache + Distribuído)

## 1. PostGIS — substituição de Float por geometry (urgente para 500k drivers)

### Schema (`prisma/schema.prisma`)
```prisma
// Antes
latitude  Float?
longitude Float?

// Depois (exemplo para DriverProfile)
location Point @db.Geometry(Point, 4326)
```
- Remover `latitude`/`longitude` separados; usar campo único `location`
- Criar índice espacial: `@@index([location])` com `@@map("gist_location")` (PostGIS GIST)

### Banco PostgreSQL
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE "DriverProfile" ADD COLUMN location geometry(Point, 4326);
UPDATE "DriverProfile" SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
CREATE INDEX gist_driver_location ON "DriverProfile" USING GIST (location);
```

### Código (`dispatch.service.ts`)
- Substituir `haversine()` manual por `ST_DWithin(location, ST_MakePoint(lng, lat), distanceMeters)`
- `findCandidates()` passa a usar query espacial em vez de filtro JS

---

## 2. Cache (Redis) — evitar overload no quote/dispatch

| Endpoint | Cache | TTL |
|---|---|---|
| `POST /orders/quote` | Redis: `quote:{itemsHash}:{lat}:{lng}` | 30 sec |
| `GET /drivers/me/offers` | Redis: `offers:{driverId}` | 5 sec |
| `GET /orders/mine/:id/tracking` | Redis: `tracking:{orderId}` | 10 sec |

---

## 3. Arquitetura distribuída

- **Docker Compose** com 3 serviços: `api`, `pg`, `redis`
- **Load balancer** (nginx / traefik) frente ao `api`
- **Chat/Realtime**: `Socket.io` + Redis adapter (`@socket.io/redis-adapter`) — evita estado por instância

---

## 4. Segurança / Produção

- `CORS` restrito a domínio oficial (hoje `origin: true` — aberto)
- Rate limit (`@nestjs/throttler`) em `POST /orders/quote` e `POST /orders`
- HTTPS + certificados
- Backup automático da `gas_expresso` PostgreSQL

---

## Prioridade de execução

1. PostGIS no `DriverProfile`/`SupplierProfile`
2. Cache Redis no `quote()`
3. Load balancer + Docker
4. Segurança/CORS
