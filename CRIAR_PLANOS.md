# 🎯 Como Criar Assinaturas Manualmente

## Opção 1: Via Render Shell (Recomendado)

### Passo 1: Acessar Shell
1. Render Dashboard → Seu backend
2. **Shell** (menu lateral)

### Passo 2: Criar assinatura para você mesmo

Cole e execute este comando (TUDO de uma vez):

```javascript
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const u=await p.user.findFirst({where:{email:'marcotas203@gmail.com'}});const plan=await p.subscriptionPlan.findFirst({where:{tier:'GOLD'}});if(u&&plan){const sub=await p.subscription.create({data:{userId:u.id,planId:plan.id,status:'ACTIVE',startDate:new Date(),endDate:new Date(Date.now()+365*24*60*60*1000),minimumCommitmentEnd:new Date(Date.now()+90*24*60*60*1000)}});console.log('✅ Plano Ouro ativado!',sub.id)}else{console.log('❌ Usuário não encontrado')}await p.\$disconnect()})();"
```

**Se funcionar, deve aparecer:**
```
✅ Plano Ouro ativado! cmg...
```

---

## Opção 2: Criar via Script (Mais organizado)

### Passo 1: No Render Shell

```bash
# Criar arquivo temporário
cat > /tmp/create-sub.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar seu usuário
  const user = await prisma.user.findFirst({
    where: { email: 'marcotas203@gmail.com' }
  })
  
  if (!user) {
    console.log('❌ Usuário não encontrado')
    return
  }
  
  console.log('✅ Usuário encontrado:', user.name)
  
  // Buscar plano OURO
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { tier: 'GOLD' }
  })
  
  if (!plan) {
    console.log('❌ Plano OURO não encontrado')
    return
  }
  
  console.log('✅ Plano encontrado:', plan.name)
  
  // Verificar se já tem assinatura
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id }
  })
  
  if (existing) {
    console.log('⚠️ Já tem assinatura, atualizando...')
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
    console.log('✅ Assinatura atualizada:', updated.id)
  } else {
    console.log('🆕 Criando nova assinatura...')
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        minimumCommitmentEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 meses
      }
    })
    console.log('✅ Assinatura criada:', subscription.id)
  }
  
  await prisma.$disconnect()
}

main()
EOF

# Executar
node /tmp/create-sub.js
```

---

## Opção 3: Via Interface Admin (Depois de fixar)

**Futuramente** você pode criar uma página admin para gerenciar assinaturas:
- `/admin/planos` → Ativar plano para cliente

---

## 🔍 Verificar se funcionou

Após executar, **recarregue** a página do cliente:

1. Vá em: `https://charme-bela-j12z.vercel.app/cliente/plano`
2. Deve mostrar: **Plano Ouro Ativo** ✅
3. Sidebar deve mostrar: **Plano Ativo**

---

## 📋 Para outros clientes

Repita o comando mudando o email:

```javascript
// Trocar:
email: 'marcotas203@gmail.com'

// Por:
email: 'outro@email.com'
```

---

**Primeiro corrija o CORS, depois crie as assinaturas!** 🎯
