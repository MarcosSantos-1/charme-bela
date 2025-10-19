# 🚀 DEPLOY SIMPLIFICADO - Charme & Bela

## 🎉 BOA NOTÍCIA: Já está quase tudo pronto!

Você **NÃO precisa** reconfigurar o Firebase nem deletar nada!

---

## ✅ **O QUE JÁ ESTÁ FUNCIONANDO:**

- ✅ Firebase configurado (credenciais são públicas por design, é normal!)
- ✅ Admin não usa Firebase (login local: `sonia.santana` / `2020`)
- ✅ Email de verificação funciona automaticamente
- ✅ Código todo commitado no GitHub

---

## 📝 **CHECKLIST DE DEPLOY (15 minutos total)**

### **1️⃣ FIREBASE - Adicionar domínio (2 min)**

1. Abrir: https://console.firebase.google.com/project/charme-bela-33906/authentication/settings
2. Rolar até **Authorized domains**
3. Clicar **Add domain**
4. Colar: `seu-projeto.vercel.app` (pegar da Vercel)
5. **Add**

**Pronto!** Isso garante que só seu site pode usar o Firebase.

---

### **2️⃣ STRIPE - Configurar chaves (5 min)**

**Pegar chaves:**
1. https://dashboard.stripe.com/test/apikeys
2. Copiar:
   - `pk_test_...` (Publishable key)
   - `sk_test_...` (Secret key) - Clicar "Reveal"

**Criar webhook:**
1. https://dashboard.stripe.com/test/webhooks
2. **+ Add endpoint**
3. URL: `https://charme-bela-backend.onrender.com/stripe/webhook`
4. Selecionar eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
5. Copiar o **Signing secret** (whsec_...)

**Criar produtos (se ainda não tiver):**
1. https://dashboard.stripe.com/test/products
2. **+ Add product** (fazer 3x):
   - **Bronze:** R$ 99,90/mês
   - **Silver:** R$ 149,90/mês
   - **Gold:** R$ 199,90/mês
3. Copiar os **Price IDs** (price_...) de cada um

---

### **3️⃣ RENDER - Adicionar variáveis (5 min)**

1. https://dashboard.render.com/
2. Seu serviço → **Environment**
3. **Adicionar essas variáveis:**

```bash
# Banco de Dados (copiar do Neon)
DATABASE_URL = postgresql://...

# Stripe
STRIPE_SECRET_KEY = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
STRIPE_PUBLIC_KEY = pk_test_...
STRIPE_PRICE_BRONZE_ID = price_...
STRIPE_PRICE_SILVER_ID = price_...
STRIPE_PRICE_GOLD_ID = price_...

# Aplicação
NODE_ENV = production
PORT = 10000
FRONTEND_URL = https://seu-projeto.vercel.app
ALLOWED_ORIGINS = https://seu-projeto.vercel.app,http://localhost:3000
```

4. **Save changes** → Render vai redeployar automaticamente

---

### **4️⃣ VERCEL - Adicionar variáveis (3 min)**

1. https://vercel.com/dashboard
2. Seu projeto → **Settings** → **Environment Variables**
3. **Adicionar (para TODOS os ambientes):**

```bash
# Backend
NEXT_PUBLIC_API_URL = https://charme-bela-backend.onrender.com

# Firebase (já está no código, mas pode adicionar aqui também)
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyA1CKTLfGcmt5Xf68wvQhMD92J_vP_6F90
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = charme-bela-33906.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = charme-bela-33906
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = charme-bela-33906.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 690927382095
NEXT_PUBLIC_FIREBASE_APP_ID = 1:690927382095:web:2db390a82624c20c3ac43a
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-E4R62L9TGE

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY = pk_test_...
```

4. **Deployments** → **Redeploy** (sem cache)

---

## 🧪 **TESTAR (5 min)**

### **Backend:**
Abrir: `https://charme-bela-backend.onrender.com/health`
- Deve retornar: `{"status":"ok"}`

### **Frontend:**
1. Abrir: `https://seu-projeto.vercel.app`
2. **Cadastrar** uma conta de teste
3. **Fazer login**
4. **Assinar um plano** (usar cartão teste: `4242 4242 4242 4242`)
5. Fazer **login como admin** (`sonia.santana` / `2020`)
6. Verificar **notificação** de nova assinatura
7. Ver **receita do mês** no dashboard

---

## ❓ **DÚVIDAS FREQUENTES**

### **"E o email de verificação?"**
✅ Já funciona! O Firebase envia automaticamente quando alguém se cadastra.

### **"E o admin?"**
✅ Não precisa cadastrar! Admin usa login local hardcoded:
- Username: `sonia.santana`
- Password: `2020`

### **"Firebase precisa reconfigurar?"**
❌ NÃO! As chaves são públicas por design. 
✅ Só adicionar seu domínio Vercel nos "Authorized domains"

### **"Onde pego a URL da Vercel?"**
1. Vercel Dashboard → Seu projeto
2. Copiar: `https://nome-do-projeto.vercel.app`

### **"Onde pego a DATABASE_URL do Neon?"**
1. https://console.neon.tech/
2. Seu projeto → **Connection Details**
3. **Pooled connection** ✅
4. Copiar tudo: `postgresql://user:password@host/database?sslmode=require`

---

## 🎯 **ORDEM RECOMENDADA**

1. **Firebase** (2 min) → Adicionar domínio
2. **Stripe** (5 min) → Pegar chaves + webhook + produtos
3. **Render** (5 min) → Adicionar todas as env vars
4. **Aguardar deploy** (2-3 min) → Ver logs
5. **Vercel** (3 min) → Adicionar env vars + redeploy
6. **Testar** (5 min) → Cadastro → Login → Plano → Admin

**Total: ~20 minutos** ⏱️

---

## 🚨 **SE DER ERRO**

### **Render não sobe:**
- Ver **Logs** → Procurar linha vermelha
- Geralmente: `DATABASE_URL` errada

### **Stripe não funciona:**
- Ver console do browser (F12)
- Geralmente: `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` faltando na Vercel

### **Login não funciona:**
- Firebase → Authorized domains → Adicionar domínio Vercel

---

## 📚 **GUIAS COMPLETOS (Se precisar)**

- **Deploy detalhado:** `DEPLOYMENT_CHECKLIST.md`
- **Segurança Firebase:** `FIREBASE_SECURITY_CONFIG.md`

---

**Qualquer erro, cola aqui!** 💪

