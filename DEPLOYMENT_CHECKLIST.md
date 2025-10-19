# 🚀 CHECKLIST DE DEPLOY - Charme & Bela

## ✅ **PRÉ-REQUISITOS**

Antes de começar, tenha em mãos:
- [ ] Acesso ao [Render Dashboard](https://dashboard.render.com/)
- [ ] Acesso ao [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Acesso ao [Neon Console](https://console.neon.tech/)
- [ ] Acesso ao [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard) (Test Mode)
- [ ] Acesso ao [Firebase Console](https://console.firebase.google.com/)

---

## 🔥 **PARTE 1: FIREBASE (NOVO - POR SEGURANÇA)**

### **1.1 Criar Novas Credenciais:**

1. Acesse: https://console.firebase.google.com/
2. Projeto: `charme-bela-33906`
3. **⚙️ Project Settings** → **Your apps**
4. **❌ DELETAR o app web antigo** (credenciais vazaram)
5. **➕ Add app** → **Web** (</>)
6. Nome: `Charme & Bela Web - Produção`
7. ✅ Firebase Hosting: **SIM**
8. **Copiar TODAS as credenciais:**

```javascript
// Salve em um bloco de notas temporário:
apiKey: "AIzaSy...",
authDomain: "charme-bela-33906.firebaseapp.com",
projectId: "charme-bela-33906",
storageBucket: "charme-bela-33906.firebasestorage.app",
messagingSenderId: "690927382095",
appId: "1:690927382095:web:...",
measurementId: "G-..."
```

### **1.2 Configurar Segurança:**

1. **Authentication** → **Settings** → **Authorized domains**
2. **Adicionar:**
   - [ ] `seu-dominio.vercel.app`
   - [ ] `localhost` (já deve estar)

3. **Firebase Console** → **⚙️ Settings** → **Service accounts**
4. **Database secrets** → Verificar se está tudo ok

---

## 🐘 **PARTE 2: NEON (DATABASE)**

1. Acesse: https://console.neon.tech/
2. Seu projeto → **Connection Details**
3. Selecione: **Pooled connection** ✅
4. **Copiar a string completa:**

```
postgresql://user:password@host/database?sslmode=require
```

5. **Salvar** em bloco de notas (você vai precisar no Render)

---

## 💳 **PARTE 3: STRIPE (TEST MODE)**

### **3.1 API Keys:**

1. Acesse: https://dashboard.stripe.com/test/dashboard
2. **CERTIFIQUE que está em "Test Mode"** (toggle superior direito)
3. **Developers** → **API Keys**
4. **Copiar:**
   - [ ] **Publishable key** (pk_test_...) 
   - [ ] **Secret key** (sk_test_...) - Clicar em "Reveal test key"

### **3.2 Webhook (Importante!):**

1. **Developers** → **Webhooks**
2. **+ Add endpoint**
3. **Endpoint URL:**
   ```
   https://charme-bela-backend.onrender.com/stripe/webhook
   ```
   ⚠️ **ATENÇÃO:** Substitua `charme-bela-backend` pelo nome real do seu serviço no Render!

4. **Selecionar eventos:**
   - [ ] `checkout.session.completed`
   - [ ] `invoice.payment_succeeded`
   - [ ] `invoice.payment_failed`
   - [ ] `customer.subscription.deleted`
   - [ ] `payment_intent.succeeded`

5. **Add endpoint**
6. **Copiar o "Signing secret"** (whsec_...)

### **3.3 Price IDs dos Planos:**

1. **Products** → **Prices**
2. Você precisa ter 3 produtos criados:
   - **Bronze** (ou equivalente)
   - **Silver** (ou equivalente)
   - **Gold** (ou equivalente)

3. **Copiar os Price IDs:**
   - [ ] Bronze: `price_XXXXXXXXX`
   - [ ] Silver: `price_XXXXXXXXX`
   - [ ] Gold: `price_XXXXXXXXX`

⚠️ **Se não tiver os produtos ainda:**
1. **Products** → **+ Add product**
2. Criar cada plano com:
   - Nome
   - Descrição
   - Preço mensal (R$ em centavos: R$ 99,90 = 9990)
   - Recorrência: Mensal

---

## 🎨 **PARTE 4: RENDER (BACKEND)**

### **4.1 Verificar Serviço:**

1. Acesse: https://dashboard.render.com/
2. Localize seu serviço: `charme-bela-backend` (ou nome que você deu)
3. **Verificar status:**
   - 🟢 **Live** = Tudo ok
   - 🔴 **Build failed** = Precisa redeployar

### **4.2 Configurar Environment Variables:**

1. No serviço → **Environment** (menu lateral)
2. **Adicionar/Atualizar essas variáveis:**

```bash
# DATABASE
DATABASE_URL = postgresql://user:password@host/database?sslmode=require

# STRIPE (Test Mode)
STRIPE_SECRET_KEY = sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET = whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PUBLIC_KEY = pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PRICE_BRONZE_ID = price_XXXXXXXXX
STRIPE_PRICE_SILVER_ID = price_XXXXXXXXX
STRIPE_PRICE_GOLD_ID = price_XXXXXXXXX

# APLICAÇÃO
NODE_ENV = production
PORT = 10000
FRONTEND_URL = https://seu-dominio.vercel.app
ALLOWED_ORIGINS = https://seu-dominio.vercel.app,http://localhost:3000
```

⚠️ **Substitua:**
- `seu-dominio.vercel.app` pela URL real da Vercel
- Todos os `XXXXXXXXX` pelas chaves reais copiadas

3. **Salvar mudanças**
4. Render vai **redeployar automaticamente**

### **4.3 Aguardar Deploy:**

1. **Logs** → Acompanhar o build
2. Aguardar aparecer:
   ```
   ✅ Servidor iniciado
   🔗 Rodando em: http://0.0.0.0:10000
   🔗 Teste: https://charme-bela-backend.onrender.com/health
   ```

3. **Testar:**
   - Abrir: `https://charme-bela-backend.onrender.com/health`
   - Deve retornar: `{"status":"ok"}`

---

## ⚡ **PARTE 5: VERCEL (FRONTEND)**

### **5.1 Verificar Projeto:**

1. Acesse: https://vercel.com/dashboard
2. Localize seu projeto: `charme-bela` (ou nome que você deu)
3. **Copiar a URL:** `https://seu-projeto.vercel.app`

### **5.2 Configurar Environment Variables:**

1. Projeto → **Settings** → **Environment Variables**
2. **Adicionar TODAS essas variáveis para TODOS os ambientes** (Production, Preview, Development):

```bash
# API BACKEND (Render)
NEXT_PUBLIC_API_URL = https://charme-bela-backend.onrender.com

# FIREBASE (Novas credenciais da Parte 1)
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = charme-bela-33906.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = charme-bela-33906
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = charme-bela-33906.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 690927382095
NEXT_PUBLIC_FIREBASE_APP_ID = 1:690927382095:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-...

# STRIPE (Test Mode - Public Key apenas!)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY = pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **Importante:**
- Marcar as 3 opções: **Production**, **Preview**, **Development**
- Não confundir: Frontend usa **pk_test_** (public), Backend usa **sk_test_** (secret)

3. **Salvar**

### **5.3 Redeployar:**

1. **Deployments** → **Latest deployment**
2. **⋯ Menu** → **Redeploy**
3. ✅ **Use existing Build Cache** = NÃO (desmarcar)
4. **Redeploy**

### **5.4 Aguardar Deploy:**

1. Acompanhar logs
2. Aguardar: **Building... → Deploying... → Ready**
3. **Testar:**
   - Abrir: `https://seu-projeto.vercel.app`
   - Login deve funcionar
   - Cadastro deve funcionar

---

## 🧪 **PARTE 6: TESTAR INTEGRAÇÃO COMPLETA**

### **6.1 Testar Backend (Render):**

- [ ] `https://seu-backend.onrender.com/health` → Status OK
- [ ] `https://seu-backend.onrender.com/services` → Lista de serviços

### **6.2 Testar Frontend (Vercel):**

- [ ] Login funciona (Firebase)
- [ ] Cadastro funciona
- [ ] Dashboard carrega
- [ ] Notificações aparecem

### **6.3 Testar Stripe:**

**Como Cliente:**
1. Fazer login
2. **Planos** → Escolher um plano
3. **Assinar** → Deve redirecionar para Stripe Checkout
4. Usar cartão de teste: `4242 4242 4242 4242`
   - Validade: Qualquer data futura
   - CVC: Qualquer 3 dígitos
   - CEP: Qualquer
5. **Confirmar pagamento**
6. Deve voltar para o sistema com plano ativo

**Como Admin:**
1. Verificar se chegou notificação de "Nova assinatura"
2. **Dashboard** → Verificar se "Receita do Mês" atualizou
3. **Atividades Recentes** → Deve aparecer o pagamento

### **6.4 Testar Webhook Stripe:**

1. **Stripe Dashboard** → **Developers** → **Webhooks**
2. Seu endpoint → **Logs**
3. Deve aparecer eventos como:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`

---

## 🐛 **PROBLEMAS COMUNS**

### **❌ Render: "Application failed to respond"**

**Solução:**
1. Render → **Logs**
2. Procurar por erros (vermelho)
3. Geralmente é:
   - `DATABASE_URL` incorreta
   - Prisma não gerou (buildar novamente)

**Fix:**
```bash
# Manual Deploy
Render → Manual Deploy → Deploy latest commit
```

---

### **❌ Vercel: "Failed to fetch" no console**

**Solução:**
1. Verificar `NEXT_PUBLIC_API_URL` está correto
2. Testar URL manualmente: `https://seu-backend.onrender.com/health`
3. Se não abrir = Render está offline

---

### **❌ Stripe: "Invalid webhook signature"**

**Solução:**
1. Verificar `STRIPE_WEBHOOK_SECRET` no Render
2. Comparar com: Stripe → Webhooks → Seu endpoint → Signing secret
3. Se diferentes: Atualizar no Render e redeployar

---

### **❌ Firebase: "Auth domain not authorized"**

**Solução:**
1. Firebase Console → Authentication → Settings → Authorized domains
2. Adicionar: `seu-projeto.vercel.app`

---

## ✅ **CHECKLIST FINAL**

### **Render (Backend):**
- [ ] Status: 🟢 Live
- [ ] `/health` retorna `{"status":"ok"}`
- [ ] Environment variables configuradas (10 no total)
- [ ] Logs sem erros críticos

### **Vercel (Frontend):**
- [ ] Status: ✅ Ready
- [ ] Site abre sem erros
- [ ] Environment variables configuradas (10 no total)
- [ ] Console sem erros críticos

### **Integrações:**
- [ ] Login funciona (Firebase)
- [ ] Planos redirecionam para Stripe
- [ ] Pagamento de teste funciona
- [ ] Notificações de pagamento aparecem no admin
- [ ] Receita do mês atualiza no dashboard

---

## 🎉 **DEPLOY CONCLUÍDO!**

Se todos os checkboxes acima estão marcados, **PARABÉNS!** 🚀

Seu sistema está 100% funcional em produção (test mode)!

---

## 🔄 **PRÓXIMOS PASSOS (FUTURO):**

Quando estiver pronto para **PRODUÇÃO REAL (Stripe Live Mode)**:

1. **Stripe:** Ativar conta real (fornecer documentos)
2. **Trocar:** Todas as keys `test` por `live`
3. **Criar:** Produtos reais (com preços reais)
4. **Atualizar:** Webhook URL no Stripe Live
5. **Testar:** Com cartão real (valor baixo tipo R$ 1,00)
6. **Avisar:** Stripe que está em produção

---

**Qualquer dúvida, volta aqui!** 💪

