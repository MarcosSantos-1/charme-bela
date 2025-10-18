# 💎 Charme & Bela - Sistema de Gestão de Clínica de Estética

Sistema full-stack completo para gestão de clínica de estética com agendamentos, planos de assinatura, anamnese digital e muito mais.

---

## 🎯 Funcionalidades Implementadas

### 👤 Área do Cliente
- ✅ **Autenticação completa** (Email, Google, Apple)
- ✅ **Dashboard** com próximos agendamentos e status do plano
- ✅ **Agendamentos** com calendário interativo e reagendamento
- ✅ **Anamnese Digital** em 5 etapas com validação
- ✅ **Perfil** com edição de dados
- ✅ **Histórico** de tratamentos
- ✅ **Meu Plano** com controle de sessões mensais
- ✅ **Catálogo de Serviços** com filtros por categoria

### 👨‍💼 Área Admin
- ✅ **Dashboard** com estatísticas e métricas
- ✅ **Agendamentos** com calendário e gestão completa
- ✅ **Clientes** com busca e filtros
- ✅ **Serviços** CRUD completo com categorias
- ✅ **Anamneses** visualização e gestão
- ✅ **Vouchers** sistema de descontos e brindes
- ✅ **Configurações** (horários, contato, endereço, preços)
- ✅ **Landing Page** gestão de depoimentos

### 💼 Regras de Negócio
- ✅ **Planos de Assinatura** (Bronze, Prata, Ouro)
- ✅ **Controle de Sessões** por mês
- ✅ **Agendamentos Admin** com pagamento na clínica
- ✅ **Sistema de Vouchers** (desconto, tratamento grátis, mês grátis)
- ✅ **Política de Cancelamento** (8h de antecedência)
- ✅ **Horários Flexíveis** para admin (6h-21h)
- ✅ **Preços Dinâmicos** centralizados no sistema

---

## 🛠️ Tecnologias

### Backend
- **Node.js 20+** com TypeScript
- **Fastify 5.6** - Framework web rápido
- **Prisma 6.17** - ORM moderno
- **PostgreSQL** - Banco de dados (Neon)
- **Sistema de logs** coloridos e detalhados

### Frontend
- **Next.js 15.5** - React framework
- **React 19.1** - UI library
- **Tailwind CSS 4.1** - Estilização
- **Firebase** - Autenticação
- **TypeScript 5** - Type safety
- **React Hot Toast** - Notificações
- **date-fns** - Manipulação de datas

---

## 🚀 Como Rodar Localmente

### 1. Backend

```bash
cd backend
npm install

# Configure .env com sua connection string do Neon
cp .env.example .env
# Edite DATABASE_URL no .env

# Migrations e seed
npm run db:generate
npm run db:migrate
npm run db:seed

# Rodar servidor
npm run dev
```

**Backend em:** `http://localhost:3333`

### 2. Frontend

```bash
cd charme-bela/web
npm install

# Configure .env.local com credenciais do Firebase
cp .env.example .env.local
# Edite as variáveis do Firebase

# Rodar aplicação
npm run dev
```

**Frontend em:** `http://localhost:3000`

---

## 📊 Estrutura do Banco de Dados

### Principais Models
- `User` - Usuários (clientes e admin)
- `Service` - Serviços/tratamentos (31 cadastrados)
- `SubscriptionPlan` - Planos (Bronze, Prata, Ouro)
- `Subscription` - Assinaturas ativas
- `Appointment` - Agendamentos
- `AnamnesisForm` - Fichas de anamnese
- `Voucher` - Descontos e brindes
- `Testimonial` - Depoimentos para landing page
- `SystemConfig` - Configurações do sistema

---

## 🔐 Credenciais de Teste

### Admin
- **URL**: `http://localhost:3000/admin-login`
- **Username**: `sonia.santana`
- **Senha**: `2020`

### Cliente (Criar novo)
- **URL**: `http://localhost:3000/cadastro`
- Use qualquer email válido

---

## 🌐 Deploy

### Backend (Render)
1. Crie Web Service conectado ao GitHub
2. Configure variáveis de ambiente (DATABASE_URL, etc)
3. Deploy automático a cada push

**Ver guia completo em:** [DEPLOY.md](DEPLOY.md)

### Frontend (Vercel)
1. Importe projeto do GitHub
2. Configure root directory: `charme-bela/web`
3. Adicione variáveis de ambiente do Firebase
4. Deploy automático a cada push

### Banco de Dados (Neon)
- ✅ Já configurado
- Connection string: `postgresql://...neon.tech/neondb`

---

## 📱 Funcionalidades Destacadas

### 🗓️ Sistema de Agendamentos
- Calendário interativo
- Horários configuráveis
- Bloqueio de datas passadas
- Reagendamento com 8h de antecedência
- Cancelamento com política de tempo mínimo
- Agendamentos admin (pagamento na clínica)

### 💳 Planos de Assinatura
- **Bronze**: 4 sessões/mês - R$ 119,90
- **Prata**: 4 sessões + 2 faciais/mês - R$ 139,90
- **Ouro**: 6 sessões + 2 faciais/mês - R$ 169,90
- Controle de uso mensal
- Preços dinâmicos (configuráveis pelo admin)

### 📋 Anamnese Digital
- 5 etapas completas
- Validação de idade (mínimo 10 anos)
- Termo de consentimento digital
- Dados persistentes
- Visualização formatada

### 🎁 Sistema de Vouchers
- Desconto percentual
- Tratamento grátis
- Mês de plano grátis
- Controle de validade
- Histórico de uso

---

## 📂 Estrutura do Projeto

```
charme-bela/
├── backend/
│   ├── src/
│   │   ├── routes/         # Rotas da API
│   │   ├── lib/            # Prisma client
│   │   └── utils/          # Logger
│   ├── prisma/
│   │   ├── schema.prisma   # Schema do banco
│   │   ├── migrations/     # Migrations SQL
│   │   └── seed.ts         # Dados iniciais
│   └── package.json
│
├── charme-bela/web/
│   ├── app/
│   │   ├── admin/          # Páginas admin
│   │   ├── cliente/        # Páginas cliente
│   │   └── (auth)/         # Páginas públicas
│   ├── components/         # Componentes reutilizáveis
│   ├── contexts/           # Context API (Auth)
│   ├── lib/                # API client, hooks
│   └── package.json
│
├── assets/                 # Imagens e documentos
├── DEPLOY.md              # Guia de deploy
└── README.md
```

---

## 🔗 Links Úteis

- **GitHub**: https://github.com/MarcosSantos-1/charme-bela
- **Backend (Render)**: `https://charme-bela-backend.onrender.com`
- **Frontend (Vercel)**: `https://charme-bela.vercel.app`
- **Banco (Neon)**: Dashboard PostgreSQL

---

## 👨‍💻 Desenvolvedor

**Marcos Santos**
- Email: marccosv.dev@outlook.com
- GitHub: [@MarcosSantos-1](https://github.com/MarcosSantos-1)

---

## 📄 Licença

Este projeto é propriedade da **Clínica Charme & Bela**.

---

**🎉 Sistema completo e pronto para produção!** 🚀
