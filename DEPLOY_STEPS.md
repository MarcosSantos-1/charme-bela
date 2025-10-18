# 🚀 Passos Detalhados para Deploy

## ✅ Git Push - CONCLUÍDO!

Código enviado para: https://github.com/MarcosSantos-1/charme-bela

---

## 1️⃣ BACKEND - Deploy no Render

### Passo 1: Acessar Render
1. Acesse: https://dashboard.render.com/
2. Faça login (ou crie conta)

### Passo 2: Criar Web Service
1. Clique em **"New +"** (canto superior direito)
2. Selecione **"Web Service"**
3. Conecte com **GitHub** se ainda não conectou
4. Selecione o repositório: **MarcosSantos-1/charme-bela**

### Passo 3: Configurar o Service

**Basic Configuration:**
```
Name: charme-bela-backend
Region: Oregon (US West)
Branch: main
Root Directory: backend
Runtime: Node
```

**Build & Deploy:**
```
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
```

**Instance Type:**
```
Free (para começar)
```

### Passo 4: Environment Variables

Clique em **"Advanced"** e adicione:

```
DATABASE_URL
Value: postgresql://neondb_owner:SEU_PASSWORD@ep-little-block-acmph6zx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
(⚠️ COPIE do seu .env local atual!)

NODE_ENV
Value: production

PORT
Value: 10000

FRONTEND_URL
Value: https://SEU-PROJETO.vercel.app
(⚠️ Você vai pegar isso depois do deploy do frontend)
```

### Passo 5: Deploy
1. Clique em **"Create Web Service"**
2. Aguarde 5-10 minutos
3. Status deve ficar **"Live"** (verde)
4. **COPIE A URL**: `https://charme-bela-backend.onrender.com`

### Passo 6: Rodar Migrations
1. No Render, vá em **"Shell"** (menu lateral)
2. Execute:
```bash
npm run db:migrate:deploy
npm run db:seed
```
3. Aguarde concluir (30s-1min)

### Passo 7: Testar
Abra no navegador: `https://charme-bela-backend.onrender.com/health`

**Deve retornar:**
```json
{"status":"ok","timestamp":"2025-10-18T..."}
```

✅ **Backend funcionando!**

---

## 2️⃣ FRONTEND - Deploy no Vercel

### Passo 1: Acessar Vercel
1. Acesse: https://vercel.com/
2. Faça login com GitHub

### Passo 2: Importar Projeto
1. Clique em **"Add New..."** → **"Project"**
2. Procure por **"charme-bela"**
3. Clique em **"Import"**

### Passo 3: Configurar Projeto

**Framework Preset:**
```
Next.js (detecta automaticamente)
```

**Root Directory:**
```
charme-bela/web
```

**Build Command:**
```
npm run build
(usa o padrão do Next.js)
```

### Passo 4: Environment Variables

Clique em **"Environment Variables"** e adicione:

```
NEXT_PUBLIC_API_URL
Value: https://charme-bela-backend.onrender.com
(⚠️ Use a URL do Render que você copiou!)

NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIza... (copie do seu .env.local)

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: charme-bela-33906.firebaseapp.com

NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: charme-bela-33906

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: charme-bela-33906.appspot.com

NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: ... (copie do seu .env.local)

NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:...:web:... (copie do seu .env.local)
```

### Passo 5: Deploy
1. Clique em **"Deploy"**
2. Aguarde 3-5 minutos
3. Status deve ficar **"Ready"**
4. **COPIE A URL**: `https://charme-bela-xxxx.vercel.app`

### Passo 6: Atualizar CORS no Backend
1. Volte no **Render**
2. Vá em **"Environment"**
3. Edite `FRONTEND_URL` para a URL do Vercel
4. Clique em **"Manual Deploy"** → **"Deploy latest commit"**

### Passo 7: Testar
Abra no navegador: `https://charme-bela-xxxx.vercel.app`

**Deve carregar** a landing page! ✅

---

## 3️⃣ CONFIGURAR FIREBASE PARA PRODUÇÃO

### Adicionar domínio autorizado
1. Firebase Console: https://console.firebase.google.com/project/charme-bela-33906/authentication/settings
2. **Authorized domains** → Add domain
3. Adicione: `charme-bela-xxxx.vercel.app`

### Configurar Firestore Rules
1. Vá em **Firestore Database** → **Rules**
2. Cole:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'MANAGER';
    }
  }
}
```
3. **Publish**

---

## 🎯 TESTAR SISTEMA EM PRODUÇÃO

### 1. Testar Login Admin
1. Acesse: `https://SEU-FRONTEND.vercel.app/admin-login`
2. Username: `sonia.santana`
3. Senha: `2020`
4. ✅ Deve logar e ir para dashboard

### 2. Testar Cadastro de Cliente
1. Acesse: `https://SEU-FRONTEND.vercel.app/cadastro`
2. Crie uma conta
3. Verifique email
4. ✅ Deve logar e ir para dashboard do cliente

### 3. Testar Agendamento
1. Como cliente, vá em "Serviços"
2. Escolha um tratamento
3. Agende
4. ✅ Deve aparecer na agenda

### 4. Testar Admin
1. Como admin, vá em "Agendamentos"
2. Veja o calendário
3. Crie um agendamento
4. ✅ Deve funcionar

---

## 🔄 DEPLOYS FUTUROS (Automático!)

Sempre que você fizer:
```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

**O que acontece:**
- ✅ Vercel faz deploy automático do frontend
- ✅ Render faz deploy automático do backend
- ⏱️ Aguarde 3-5min para cada um

---

## 🆘 Problemas Comuns

### Backend: "Application failed to respond"
**Solução:**
1. Render → Shell → `npm run db:migrate:deploy`
2. Verifique logs: Render → Logs

### Frontend: "Failed to compile"
**Solução:**
1. Vercel → Deployments → Ver logs
2. Verifique variáveis de ambiente

### "CORS error" no frontend
**Solução:**
1. Backend Render → Environment → `FRONTEND_URL`
2. Deve estar: `https://SEU-FRONTEND.vercel.app` (SEM barra no final)
3. Redeploy backend

### Firebase "unauthorized domain"
**Solução:**
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add: `SEU-FRONTEND.vercel.app`

---

## 📊 Monitoramento

### Render (Backend)
- **Logs**: https://dashboard.render.com/ → Seu service → Logs
- **Metrics**: CPU, Memory usage
- **Events**: Deploy history

### Vercel (Frontend)
- **Analytics**: https://vercel.com/SEU-PROJETO/analytics
- **Deployments**: Histórico de deploys
- **Logs**: Runtime logs

### Neon (Database)
- **Dashboard**: https://console.neon.tech/
- **Queries**: Monitoring
- **Branches**: Para testes

---

**🎉 Deploy completo! Sistema em produção!** 🚀

