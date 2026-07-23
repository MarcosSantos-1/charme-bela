// Script para criar assinatura manualmente
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSubscription() {
  try {
    console.log('🔍 Buscando planos...')
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true }
    })
    
    console.log('📋 Planos disponíveis:')
    plans.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.tier}) - R$ ${p.price}`)
    })
    
    console.log('\n🔍 Buscando usuários...')
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT' }
    })
    
    console.log('👥 Usuários (clientes):')
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} - ${u.email}`)
    })
    
    // Criar assinatura para Marcos Vinicius (exemplo)
    const marcos = users.find(u => u.email === 'marcotas203@gmail.com')
    const goldPlan = plans.find(p => p.tier === 'GOLD')
    
    if (marcos && goldPlan) {
      console.log('\n✨ Criando assinatura OURO para Marcos Vinicius...')
      
      const subscription = await prisma.subscription.create({
        data: {
          userId: marcos.id,
          planId: goldPlan.id,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null,
        }
      })
      
      console.log('✅ Assinatura criada:', subscription.id)
      console.log('   → Status:', subscription.status)
      console.log('   → Plano:', goldPlan.name)
      console.log('   → Válida até:', subscription.endDate.toLocaleDateString('pt-BR'))
    } else {
      console.log('\n⚠️ Usuário ou plano não encontrado')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createSubscription()

