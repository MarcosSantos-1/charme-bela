# 🔥 Configuração de Segurança Firebase - Charme & Bela

## ⚠️ IMPORTANTE: apiKey NÃO é secret!

As credenciais do Firebase (`apiKey`, `authDomain`, etc.) são **públicas por design**. 
A segurança vem das **regras** e **domínios autorizados**, não das chaves!

---

## 🔐 CONFIGURAÇÕES DE SEGURANÇA (Faça AGORA!)

### **1️⃣ Authorized Domains (CRÍTICO!)**

**O que é:** Lista de domínios permitidos para fazer login via Firebase.

**Como configurar:**

1. [Firebase Console](https://console.firebase.google.com/)
2. Projeto: `charme-bela-33906`
3. **Authentication** → **Settings** → **Authorized domains**
4. **Adicionar domínios:**
   - [ ] `localhost` (desenvolvimento - já deve estar)
   - [ ] `seu-projeto.vercel.app` (produção Vercel)
   - [ ] `seu-dominio-preview.vercel.app` (se usar Preview do Vercel)

**Por que é importante:**
- ✅ Impede que alguém use suas credenciais em outro site
- ✅ Mesmo com `apiKey`, login só funciona nos domínios autorizados

---

### **2️⃣ Firebase Security Rules**

**Onde:** Firebase Console → **Firestore Database** → **Rules**

**Regras recomendadas:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura/escrita apenas para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Se usar Firestore Storage:**
Firebase Console → **Storage** → **Rules**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Apenas usuários autenticados podem fazer upload
      allow read: if true; // Imagens públicas
      allow write: if request.auth != null;
    }
  }
}
```

---

### **3️⃣ Email Templates (Opcional - Melhorar UX)**

**Email de Verificação:**

1. Firebase Console → **Authentication** → **Templates**
2. **Email address verification**
3. Editar template (português):

```
Assunto: Confirme seu email - Charme & Bela

Olá,

Obrigado por se cadastrar no Charme & Bela! 🌸

Para confirmar seu email, clique no link abaixo:

%LINK%

Se você não criou esta conta, ignore este email.

Com carinho,
Equipe Charme & Bela
```

**Recuperação de Senha:**

1. **Password reset**
2. Editar template:

```
Assunto: Redefinir sua senha - Charme & Bela

Olá,

Recebemos uma solicitação para redefinir sua senha.

Clique no link abaixo para criar uma nova senha:

%LINK%

Se você não solicitou esta alteração, ignore este email.

Com carinho,
Equipe Charme & Bela
```

---

### **4️⃣ Sign-in Methods (Verificar)**

Firebase Console → **Authentication** → **Sign-in method**

**Certifique que estão ATIVADOS:**
- [ ] **Email/Password** ✅
- [ ] **Google** ✅
- [ ] **Apple** (opcional, mas recomendado)

**Configuração Google:**
- Project support email: Seu email
- Authorized domains: Já configurado no passo 1

**Configuração Apple:**
- Precisa de Apple Developer Account ($99/ano)
- Se não tiver, desabilite ou deixe apenas como "coming soon"

---

### **5️⃣ User Management**

**Encontrar email do admin (se precisar):**

1. Firebase Console → **Authentication** → **Users**
2. Procurar por: `sonia.santana@charmeebela.com` ou email que você usa

**⚠️ IMPORTANTE:**
- O admin do sistema **NÃO precisa existir no Firebase!**
- Admin usa login local: `sonia.santana` / `2020`
- Apenas clientes precisam estar no Firebase

---

### **6️⃣ Quotas e Limites (Verificar)**

Firebase Console → **Usage and billing**

**Plano Spark (Gratuito) - Limites:**
- ✅ 50,000 leituras/dia (Firestore)
- ✅ 20,000 escritas/dia
- ✅ 10 GB de armazenamento
- ✅ 50,000 verificações de email/mês

**Monitorar:**
- Se passar dos limites, upgrade para Blaze (pay-as-you-go)
- Mas para salão de beleza, Spark é suficiente!

---

## 🎯 CHECKLIST DE SEGURANÇA RÁPIDO

### **Configurações Essenciais:**
- [ ] Adicionar domínio Vercel em "Authorized domains"
- [ ] Verificar Firestore Rules (autenticação obrigatória)
- [ ] Testar login Google no domínio de produção
- [ ] (Opcional) Personalizar templates de email

### **Configurações Extras (Quando tiver tempo):**
- [ ] Configurar Apple Sign-in (se tiver conta dev)
- [ ] Personalizar emails (português)
- [ ] Configurar alertas de quota (90% do limite)
- [ ] Backup regular do Firestore (exportar dados)

---

## ✅ VOCÊ **NÃO** PRECISA:

- ❌ Deletar o app Firebase
- ❌ Criar novas credenciais
- ❌ Atualizar `NEXT_PUBLIC_FIREBASE_*` na Vercel
- ❌ Redeployar frontend
- ❌ Migrar usuários

**As credenciais que já estão no código são SEGURAS!**

A única coisa que estava faltando era adicionar o domínio da Vercel nos "Authorized domains".

---

## 🚀 PRÓXIMO PASSO (1 minuto!)

1. [Abrir Firebase Console](https://console.firebase.google.com/project/charme-bela-33906/authentication/settings)
2. **Authentication** → **Settings** → **Authorized domains**
3. **Add domain** → Colar: `seu-projeto.vercel.app`
4. **Pronto!** ✅

---

**Mais fácil do que você pensava, né?** 😎

