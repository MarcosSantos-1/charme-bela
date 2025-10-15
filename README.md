# Charme & Bela - Sistema de Gestão de Clínica de Estética

## 🎉 MVP Completo e Funcional!

Sistema full-stack moderno para gestão de clínica de estética com autenticação, dashboard admin, landing page e muito mais.

---

## ✨ O Que Foi Construído

### 🔐 Autenticação (Firebase)
- ✅ Login com email/senha
- ✅ Login com Google
- ✅ Login com Apple
- ✅ Proteção de rotas
- ✅ Perfis de usuário (Cliente e Gestor)

### 🎨 Frontend (Next.js 15 + Tailwind CSS)
- ✅ Landing page estilizada e responsiva
- ✅ Página de login completa
- ✅ Página de serviços/procedimentos para clientes
- ✅ Dashboard admin completo:
  - Dashboard com estatísticas
  - Calendário de agendamentos (visualização semanal)
  - Gestão de clientes
  - Gestão de serviços
  - Visualização de anamneses
  - Configurações (horários, contato, endereço)

### 🔧 Backend (Node.js + Fastify + Prisma)
- ✅ API REST completa
- ✅ 31 serviços pré-cadastrados
- ✅ Rotas de anamnese (CRUD completo)
- ✅ Sistema de logs coloridos
- ✅ Validação e tratamento de erros

### 💾 Banco de Dados (PostgreSQL + Prisma)
- ✅ Schema completo com 8 tabelas
- ✅ Relacionamentos configurados
- ✅ Seed com dados de exemplo

---

## 🚀 Como Rodar o Projeto

### 1. Backend

```bash
cd backend
npm install

# Configure o .env com sua connection string do Neon
# DATABASE_URL="postgresql://..."

npm run db:migrate    # Criar tabelas
npm run db:seed       # Popular dados
npm run dev           # Iniciar servidor
```

**Backend rodando em:** `http://localhost:3333`

### 2. Frontend

```bash
cd charme-bela/web
npm install
npm run dev
```

**Frontend rodando em:** `http://localhost:3000`

---

## 📋 Credenciais de Acesso

### 🔥 SETUP FIREBASE (OBRIGATÓRIO)

**1. Criar usuário admin no Firebase Authentication:**
   - Acesse: https://console.firebase.google.com/project/charme-bela-33906/authentication/users
   - Add user → Email: `sonia.santana@charmeebela.com` | Senha: `20314139` (mínimo 6 caracteres)
   - **COPIE O UID** que aparece na lista

**2. Criar perfil no Firestore:**
   - Acesse: https://console.firebase.google.com/project/charme-bela-33906/firestore
   - Start collection → Collection ID: `users`
   - Document ID: **Cole o UID que você copiou**
   - Add fields:
     - `email` (string): sonia.santana@charmeebela.com
     - `name` (string): Sônia Santana
     - `role` (string): MANAGER
     - `firebaseUid` (string): cole o UID novamente
   - Save

**3. Teste:**
   - Acesse: http://localhost:3000/admin-login
   - Username: `sonia.santana`
   - Senha: `2020` (o sistema converte internamente para a senha do Firebase)
   - ✅ Deve funcionar!

### 📍 URLs de Acesso

**Admin:** http://localhost:3000/admin-login  
**Cliente:** http://localhost:3000/login  
**Landing:** http://localhost:3000

---

## 🐛 Troubleshooting

### "Usuário admin ainda não foi criado no Firebase"
→ Você precisa criar o usuário no Firebase Console (Authentication)

### Fica carregando infinito após login
→ Abra o console do navegador (F12) e veja os logs coloridos
→ Verifique se o Firestore está habilitado no Firebase

### "Permission denied" no Firestore
→ Vá no Firebase Console → Firestore → Rules
→ Temporariamente use (DESENVOLVIMENTO APENAS):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 🛣️ Rotas da API

### Health Check
- `GET /health` - Verifica status do servidor

### Serviços
- `GET /services` - Lista todos os serviços
- `GET /services/:id` - Busca um serviço
- `POST /services` - Cria novo serviço

### Anamnese
- `GET /anamnesis` - Lista todas as anamneses
- `GET /anamnesis/user/:id` - Busca anamnese de um usuário
- `POST /anamnesis` - Cria nova anamnese
- `PUT /anamnesis/:id` - Atualiza anamnese
- `DELETE /anamnesis/:id` - Deleta anamnese

---

## 📊 Serviços Cadastrados (31 no total)

### Tratamentos Faciais (7)
- Limpeza de Pele Profunda - R$ 120
- Peeling Químico - R$ 180
- Microagulhamento - R$ 250
- Máscara de Ouro - R$ 200
- Hidratação Facial Profunda - R$ 130
- Tratamento para Acne - R$ 150
- LED Therapy Facial - R$ 140

### Tratamentos Corporais (8)
- Drenagem Linfática - R$ 100
- Massagem Modeladora - R$ 110
- Criolipólise - R$ 400
- Radiofrequência Corporal - R$ 150
- Endermologia - R$ 130
- Carboxiterapia - R$ 160
- Massagem Relaxante - R$ 120
- Lipoenzimática - R$ 140

### Depilação (5)
- Face - R$ 80
- Axilas - R$ 60
- Virilha - R$ 120
- Pernas Completas - R$ 250
- Corpo Completo - R$ 450

### Pós-operatório (3)
- Drenagem - R$ 120
- Ultrassom - R$ 100
- Radiofrequência - R$ 140

### Injetáveis (5)
- Botox - R$ 800
- Preenchimento Ácido Hialurônico - R$ 1.200
- Enzima Dissolvedora - R$ 600
- Bioestimulador de Colágeno - R$ 1.500
- Skinbooster - R$ 900

---

## 🎨 Páginas Criadas

### Públicas
- `/` - Landing page (Home)
- `/servicos` - Catálogo de serviços
- `/login` - Página de login

### Área Admin (Requer autenticação)
- `/admin` - Dashboard com estatísticas
- `/admin/agendamentos` - Calendário e gestão de agendamentos
- `/admin/clientes` - Lista e gestão de clientes
- `/admin/servicos` - Gestão de serviços oferecidos
- `/admin/anamneses` - Visualização de fichas de anamnese
- `/admin/configuracoes` - Configurações da clínica

---

## 🔥 Funcionalidades Implementadas

✅ **Autenticação completa** com Firebase  
✅ **Dashboard admin** com estatísticas em tempo real  
✅ **Calendário de agendamentos** com visualização semanal  
✅ **Gestão de clientes** com busca e filtros  
✅ **Catálogo de serviços** responsivo e bonito  
✅ **Landing page** profissional e moderna  
✅ **Sistema de logs** coloridos no backend  
✅ **API REST** completa e documentada  
✅ **Proteção de rotas** por perfil de usuário  
✅ **Design responsivo** para mobile  

---

## 📱 Design Responsivo

Todas as páginas são totalmente responsivas:
- ✅ Desktop (1920px+)
- ✅ Laptop (1024px)
- ✅ Tablet (768px)
- ✅ Mobile (320px+)

---

## 🎨 Paleta de Cores

- **Rosa Principal:** `#db2777` (pink-600)
- **Rosa Claro:** `#fdf2f8` (pink-50)
- **Branco:** `#ffffff`
- **Cinza:** `#6b7280` (gray-500)

---

## 🔮 Próximas Features

- [ ] Sistema de agendamentos (integração completa)
- [ ] Formulário de anamnese digital em etapas
- [ ] Integração com Stripe para pagamentos
- [ ] Sistema de assinaturas e pacotes
- [ ] Notificações por email/WhatsApp
- [ ] Dashboard do cliente
- [ ] Relatórios e analytics
- [ ] App mobile (React Native)

---

## 📚 Tecnologias Utilizadas

### Backend
- Node.js 20+
- Fastify 5.6
- Prisma 6.17
- TypeScript 5.9
- PostgreSQL

### Frontend
- Next.js 15.5
- React 19.1
- Tailwind CSS 4.1
- TypeScript 5
- Firebase (Auth + Firestore)
- Lucide React (ícones)
- date-fns (datas)
- react-hot-toast (notificações)

---

## 📞 Informações

**Desenvolvido por:** Marcos Santos  
**Email:** marccosv.dev@outlook.com  
**GitHub:** https://github.com/MarcosSantos-1/charme-bela

---

## 📄 Licença

Este projeto é propriedade da Clínica Charme & Bela.

---

**🎉 Sistema completo e funcionando! Bora crescer!** 🚀
