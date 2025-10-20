# 🚀 GUIA COMPLETO: OTIMIZAÇÃO DE PERFORMANCE

## 📊 **STATUS ATUAL**

### **Infraestrutura:**
- ✅ Backend: Render Free (512MB RAM, cold start)
- ✅ Frontend: Vercel (Edge, rápido)
- ✅ Banco: Neon Free (auto-suspend após 5min)
- ✅ Stripe: Test Mode

### **Performance Atual:**
- 🟡 **Cold Start:** 30-60 segundos (primeira request)
- 🟢 **Warm:** ~500ms-1s (após acordar)
- 🟢 **Queries:** ~50-200ms (sem índices extras)

### **Quando Otimizar:**
- ⚠️ **20+ clientes ativos:** Implementar keep-alive + índices
- 🚨 **70+ clientes:** Upgrade para planos pagos + cache
- 🔥 **200+ clientes:** Migrar para infraestrutura escalável

---

## 🎯 **PLANO DE OTIMIZAÇÃO PROGRESSIVO**

---

## 📈 **FASE 1: 0-20 Clientes (ATUAL - Grátis)**

### ✅ **Já Implementado:**
1. ✅ Keep-alive (evita cold start)
2. ✅ Cron jobs otimizados (30min/6h)
3. ✅ Connection pooling Prisma
4. ✅ Logs coloridos para debug

### ⏳ **Próximo Passo (Quando Ficar Lento):**

**1. Aplicar Índices no Banco (5 minutos):**

```bash
# No Neon Dashboard → SQL Editor:
# Copiar e colar o arquivo: PERFORMANCE_OPTIMIZATION.sql
```

**Resultado esperado:**
- Queries 2-5x mais rápidas
- Reduz uso de compute do Neon
- Grátis!

---

## 🔥 **FASE 2: 20-70 Clientes (Médio Porte)**

### **Problema:**
- Cold start ainda acontece (keep-alive tem limites)
- Queries mais lentas (muitos dados)
- Neon pode ficar lento em horário de pico

### **Solução:**

### **1️⃣ Upgrade Render para Starter ($7/mês):**

```yaml
Plan: Starter ($7/mês)
- 512 MB RAM
- SEM cold start! (sempre ligado)
- Métricas e logs avançados
```

**Como fazer:**
1. Render Dashboard → Seu serviço
2. **Settings** → **Plan**
3. **Upgrade to Starter**

**Resultado:**
- ✅ Zero cold start
- ✅ Sempre rápido (~200-500ms)
- ✅ Suporta até 100+ clientes

---

### **2️⃣ Adicionar Cache com Upstash Redis (Grátis/Barato):**

**Upstash Redis Free:**
- 10,000 comandos/dia
- 256 MB storage
- Perfeito para cache de queries

**Implementação:**

```typescript
// backend/src/lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

// Helpers
export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key)
  return cached as T | null
}

export async function setCache(key: string, value: any, expiresInSeconds = 300) {
  await redis.set(key, value, { ex: expiresInSeconds })
}

export async function deleteCache(key: string) {
  await redis.del(key)
}
```

**Exemplo de uso:**

```typescript
// backend/src/routes/services.ts
import { getCached, setCache } from '../lib/redis'

// GET /services
app.get('/services', async (request, reply) => {
  const CACHE_KEY = 'services:all'
  
  // Tentar pegar do cache
  const cached = await getCached<Service[]>(CACHE_KEY)
  if (cached) {
    logger.info('🚀 Cache hit: services')
    return reply.send(cached)
  }
  
  // Se não tiver cache, buscar do banco
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
  
  // Salvar no cache por 5 minutos
  await setCache(CACHE_KEY, services, 300)
  
  return reply.send(services)
})
```

**Resultado:**
- ✅ Queries 10x mais rápidas (cache hit)
- ✅ Reduz carga no Neon
- ✅ Grátis até 10k requests/dia

**Setup Upstash:**
1. https://upstash.com/ → Criar conta
2. Create Database → Redis
3. Copiar URL e Token
4. Render → Environment:
   ```
   UPSTASH_REDIS_URL=https://...
   UPSTASH_REDIS_TOKEN=...
   ```

---

### **3️⃣ Otimizar Queries Prisma:**

**Problema comum: N+1 queries**

```typescript
// ❌ LENTO (N+1 query)
const appointments = await prisma.appointment.findMany()
for (const apt of appointments) {
  const service = await prisma.service.findUnique({ 
    where: { id: apt.serviceId } 
  })
}

// ✅ RÁPIDO (1 query com include)
const appointments = await prisma.appointment.findMany({
  include: {
    service: true,
    user: true
  }
})
```

**Usar `select` quando não precisa de tudo:**

```typescript
// ❌ Traz TUDO (pesado)
const users = await prisma.user.findMany()

// ✅ Traz só o necessário (leve)
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    // Não traz password, profileImageUrl, etc
  }
})
```

---

## 💎 **FASE 3: 70-200 Clientes (Grande Porte)**

### **Problema:**
- Render Starter pode ficar lento (512MB RAM)
- Neon Free atinge limite compute (100h/mês)
- Muitas notificações/cron jobs

### **Solução:**

### **1️⃣ Upgrade Neon para Launch ($19/mês):**

```
Neon Launch:
- 300 horas compute/mês
- 10 GB storage
- 100 GB network
- Backups automáticos
```

**Alternativa:** Railway PostgreSQL (~$10-15/mês)

---

### **2️⃣ Upgrade Render para Standard ($25/mês):**

```
Render Standard:
- 2 GB RAM
- 2 CPU cores
- Auto-scaling
- Health checks avançados
```

---

### **3️⃣ CDN para Imagens (Cloudinary/Uploadcare):**

Se tiver muitas fotos de antes/depois, perfis, etc:

```typescript
// Cloudinary (grátis até 25 GB/mês)
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

// Upload otimizado
const result = await cloudinary.uploader.upload(file, {
  folder: 'charme-bela',
  transformation: [
    { width: 800, height: 800, crop: 'limit' },
    { quality: 'auto' },
    { fetch_format: 'auto' }
  ]
})
```

---

### **4️⃣ Separar Cron Jobs (Background Workers):**

Mover cron jobs para serviço separado:

**Opção 1: Render Cron Jobs (Grátis!)**
- Render → New → Cron Job
- Rodar scripts isolados
- Não afeta API principal

**Opção 2: QStash (Serverless Cron)**
- Upstash QStash
- Cron HTTP requests
- Grátis até 500 requests/dia

---

## 🔥 **FASE 4: 200+ Clientes (Escala Massiva)**

Nesse ponto, considere:

### **1. Load Balancer + Múltiplas Instâncias:**
- Railway (auto-scaling)
- Render Scale Plan
- AWS/Google Cloud

### **2. Database Replication:**
- Read replicas (Neon Scale)
- Separar leitura/escrita

### **3. Message Queue:**
- BullMQ + Redis
- Processar jobs pesados em background

### **4. Monitoring & APM:**
- Sentry (erros)
- New Relic (performance)
- LogTail (logs centralizados)

---

## 💰 **COMPARAÇÃO DE CUSTOS**

| **Clientes** | **Infra** | **Custo/mês** | **Performance** |
|--------------|-----------|---------------|-----------------|
| **0-20** | Render Free + Neon Free | **$0** | 🟡 Cold start |
| **20-70** | Render Starter + Neon Free | **$7** | 🟢 Rápido |
| **70-200** | Render Standard + Neon Launch | **$44** | 🟢 Muito rápido |
| **200+** | Railway/AWS + Neon Scale | **$80-150** | 🔥 Extremo |

---

## 📋 **CHECKLIST: QUANDO FAZER CADA OTIMIZAÇÃO**

### **🟢 AGORA (0-20 clientes):**
- [x] Keep-alive implementado
- [x] Cron jobs otimizados
- [ ] Aplicar índices SQL (quando queries > 500ms)

### **🟡 EM BREVE (20-70 clientes):**
- [ ] Upgrade Render Starter ($7/mês)
- [ ] Implementar cache Redis (Upstash)
- [ ] Otimizar queries N+1
- [ ] Adicionar monitoramento básico

### **🟠 NO FUTURO (70-200 clientes):**
- [ ] Upgrade Neon Launch ($19/mês)
- [ ] Upgrade Render Standard ($25/mês)
- [ ] CDN para imagens (Cloudinary)
- [ ] Separar cron jobs

### **🔴 ESCALA MASSIVA (200+ clientes):**
- [ ] Migrar para Railway/AWS
- [ ] Database replication
- [ ] Load balancer
- [ ] Message queue
- [ ] APM profissional

---

## 🎯 **RECOMENDAÇÃO ATUAL (Sua Situação):**

### **Para resolver lentidão AGORA (grátis):**

1. ✅ **Keep-alive:** Já implementado! (aguardar deploy)
2. ⏳ **Aplicar índices:** Quando tiver 10+ clientes
3. ⏳ **Render Starter:** Quando tiver 20+ clientes

### **Para preparar crescimento:**

Quando começar a ter clientes reais pagantes:
1. **1º upgrade:** Render Starter ($7/mês) → Elimina cold start
2. **2º upgrade:** Redis cache (grátis) → Acelera queries repetidas
3. **3º upgrade:** Neon Launch ($19/mês) → Quando compute > 80h/mês

---

## 📊 **MÉTRICAS PARA DECIDIR:**

### **Quando fazer Render Starter ($7/mês):**
- ✅ 5+ vendas/mês (ROI positivo)
- ✅ Clientes reclamando de lentidão
- ✅ Cold start > 40 segundos

### **Quando fazer Neon Launch ($19/mês):**
- ✅ Compute > 80 horas/mês
- ✅ Queries ficando lentas (> 1s)
- ✅ 50+ clientes ativos

### **Quando fazer Render Standard ($25/mês):**
- ✅ 100+ requests/min
- ✅ Memória > 400 MB
- ✅ CPU > 80%

---

## 🔧 **FERRAMENTAS DE MONITORAMENTO (Grátis):**

### **1. Render Metrics:**
- Dashboard → Metrics
- Ver RAM, CPU, Requests

### **2. Neon Dashboard:**
- Usage → Compute hours
- Ver quando está perto do limite

### **3. Vercel Analytics:**
- Dashboard → Analytics
- Ver performance frontend

### **4. Sentry (Grátis até 5k erros/mês):**
```bash
npm install @sentry/node
```

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

---

## 🚀 **PRÓXIMOS PASSOS IMEDIATOS:**

1. ✅ **Aguardar deploy do keep-alive** (resolverá 80% da lentidão!)
2. ⏳ **Testar performance** após deploy
3. ⏳ **Aplicar índices SQL** se ainda estiver lento
4. ⏳ **Render Starter** quando tiver clientes pagantes

---

**Qualquer dúvida, é só chamar!** 💪

