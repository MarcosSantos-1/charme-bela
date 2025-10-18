# 🚀 Guia de Deploy - Charme & Bela

## 📋 Pré-requisitos

- Conta no GitHub
- Conta no Vercel (para frontend)
- Conta no Render (para backend)
- Banco de dados PostgreSQL no Neon (já configurado)

---

## 1️⃣ Deploy do Backend (Render)

### Passo 1: Criar Web Service no Render

1. Acesse: https://dashboard.render.com/
2. Clique em **"New +"** → **"Web Service"**
3. Conecte com GitHub: **MarcosSantos-1/charme-bela**
4. Configure:
   - **Name**: `charme-bela-backend`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes **Environment Variables**:

```
DATABASE_URL=postgresql://neondb_owner:...@ep-little-block-acmph6zx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://charme-bela.vercel.app
```

> ⚠️ **IMPORTANTE**: Use a mesma `DATABASE_URL` que você já tem no seu `.env` local!

### Passo 3: Deploy e Migrations

1. Clique em **"Create Web Service"**
2. Aguarde o build e deploy (5-10 min)
3. Após deploy, vá em **"Shell"** no Render e execute:
   ```bash
   npm run db:migrate:deploy
   npm run db:seed
   ```
4. **Anote a URL do backend**: `https://charme-bela-backend.onrender.com`

---

## 2️⃣ Deploy do Frontend (Vercel)

### Passo 1: Importar Projeto

1. Acesse: https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione: **MarcosSantos-1/charme-bela**
4. Configure:
   - **Project Name**: `charme-bela`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `charme-bela/web`

### Passo 2: Configurar Variáveis de Ambiente

Adicione no Vercel:

```
NEXT_PUBLIC_API_URL=https://charme-bela-backend.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=charme-bela-33906.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=charme-bela-33906
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=charme-bela-33906.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...:web:...
```

> 📝 **Copie as credenciais do Firebase** do seu `.env.local` atual!

### Passo 3: Deploy

1. Clique em **"Deploy"**
2. Aguarde build (3-5 min)
3. **Anote a URL do frontend**: `https://charme-bela.vercel.app`

### Passo 4: Atualizar CORS no Backend

Volte no **Render** → **Environment** → Edite:
```
FRONTEND_URL=https://charme-bela.vercel.app
```

Clique em **"Manual Deploy"** → **"Deploy latest commit"**

---

## 3️⃣ Verificar Deploy

### Backend

Teste: `https://charme-bela-backend.onrender.com/health`

**Deve retornar:**
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Frontend

Acesse: `https://charme-bela.vercel.app`

**Deve carregar** a landing page!

### Testar Login Admin

1. Acesse: `https://charme-bela.vercel.app/admin-login`
2. Login: `sonia.santana`
3. Senha: `2020`
4. ✅ Deve funcionar!

---

## 🔧 Comandos Úteis

### Deploy Manual (Render)
```bash
git push origin main
# Render faz deploy automático!
```

### Deploy Manual (Vercel)
```bash
git push origin main
# Vercel faz deploy automático!
```

### Rodar Migrations na Produção (Render Shell)
```bash
npm run db:migrate:deploy
```

### Ver Logs (Render)
```bash
# Vá em "Logs" no dashboard do Render
```

---

## ⚠️ IMPORTANTE - Firestore Rules

No Firebase Console, configure as regras do Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'MANAGER';
    }
  }
}
```

---

## 🎯 Checklist Final

- [ ] Backend no Render com migrations rodadas
- [ ] Frontend no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] CORS atualizado no backend
- [ ] Firestore rules configuradas
- [ ] Login admin funcionando
- [ ] Cadastro de cliente funcionando

---

## 🆘 Troubleshooting

### Backend não inicia no Render
- Verifique se `DATABASE_URL` está correta
- Rode `npm run db:migrate:deploy` no Shell

### Frontend não conecta no backend
- Verifique se `NEXT_PUBLIC_API_URL` aponta para o Render
- Verifique CORS no backend (`FRONTEND_URL`)

### Erro de autenticação
- Verifique credenciais do Firebase
- Configure Firestore rules

---

**Deploy concluído! 🎉**

