import {
  PrismaClient,
  ServiceCategory,
  MachineKind,
  MachineRentalDefaultRule,
} from '@prisma/client'

const prisma = new PrismaClient()

type SeedService = {
  name: string
  description: string
  category: ServiceCategory
  duration: number
  price: number
  machineKind?: MachineKind
  allowOnSubscription?: boolean
}

// Dados dos serviços baseados em tratamentos típicos de estética
const services: SeedService[] = [
  // ============================================
  // TRATAMENTOS FACIAIS
  // ============================================
  {
    name: 'Limpeza de Pele Profunda',
    description: 'Limpeza facial completa com extração, esfoliação e máscara. Ideal para todos os tipos de pele, promove limpeza profunda dos poros e renovação celular.',
    category: ServiceCategory.FACIAL,
    duration: 60,
    price: 120.00
  },
  {
    name: 'Peeling Químico',
    description: 'Tratamento renovador da pele com ácidos para manchas e rejuvenescimento. Reduz manchas, cicatrizes de acne e sinais de envelhecimento.',
    category: ServiceCategory.FACIAL,
    duration: 45,
    price: 180.00
  },
  {
    name: 'Microagulhamento',
    description: 'Estimulação de colágeno para cicatrizes e rejuvenescimento. Trata rugas, flacidez e cicatrizes com resultados visíveis.',
    category: ServiceCategory.FACIAL,
    duration: 90,
    price: 250.00
  },
  {
    name: 'Máscara de Ouro',
    description: 'Tratamento facial luxuoso com máscara de ouro 24k. Proporciona luminosidade, hidratação profunda e efeito lifting imediato.',
    category: ServiceCategory.FACIAL,
    duration: 60,
    price: 200.00
  },
  {
    name: 'Hidratação Facial Profunda',
    description: 'Tratamento intensivo de hidratação com ácido hialurônico e vitaminas. Restaura a barreira cutânea e proporciona viço à pele.',
    category: ServiceCategory.FACIAL,
    duration: 50,
    price: 130.00
  },
  {
    name: 'Tratamento para Acne',
    description: 'Protocolo especializado para controle e tratamento da acne. Inclui limpeza, extração e aplicação de produtos específicos.',
    category: ServiceCategory.FACIAL,
    duration: 70,
    price: 150.00
  },
  {
    name: 'LED Therapy Facial',
    description: 'Tratamento com luz LED para rejuvenescimento e tratamento de acne. Estimula colágeno e reduz inflamações.',
    category: ServiceCategory.FACIAL,
    duration: 40,
    price: 140.00
  },
  
  // ============================================
  // MASSAGENS
  // ============================================
  {
    name: 'Drenagem Linfática',
    description: 'Massagem terapêutica para redução de inchaço e toxinas. Melhora circulação e combate retenção de líquidos.',
    category: ServiceCategory.MASSAGEM,
    duration: 60,
    price: 100.00
  },
  {
    name: 'Massagem Modeladora',
    description: 'Massagem intensa para redução de medidas e celulite. Quebra nódulos de gordura e melhora contorno corporal.',
    category: ServiceCategory.MASSAGEM,
    duration: 60,
    price: 110.00
  },
  {
    name: 'Massagem Relaxante',
    description: 'Massagem corporal completa para alívio do estresse e tensões musculares. Promove bem-estar e relaxamento profundo.',
    category: ServiceCategory.MASSAGEM,
    duration: 60,
    price: 120.00
  },
  {
    name: 'Drenagem Pós-operatória',
    description: 'Drenagem especializada para recuperação pós-cirúrgica. Reduz edemas e acelera cicatrização.',
    category: ServiceCategory.MASSAGEM,
    duration: 60,
    price: 120.00
  },
  
  // ============================================
  // TRATAMENTOS CORPORAIS
  // ============================================
  {
    name: 'Criolipólise',
    description: 'Eliminação de gordura localizada por congelamento. Reduz até 25% da gordura na área tratada em uma sessão.',
    category: ServiceCategory.CORPORAL,
    duration: 90,
    price: 400.00,
    machineKind: MachineKind.CRYO,
    allowOnSubscription: false,
  },
  {
    name: 'Radiofrequência Corporal',
    description: 'Tratamento de flacidez e celulite com calor. Estimula produção de colágeno e elastina para pele mais firme.',
    category: ServiceCategory.CORPORAL,
    duration: 60,
    price: 150.00
  },
  {
    name: 'Endermologia',
    description: 'Tratamento mecânico para celulite e gordura localizada. Melhora circulação e aparência da pele.',
    category: ServiceCategory.CORPORAL,
    duration: 50,
    price: 130.00
  },
  {
    name: 'Carboxiterapia',
    description: 'Aplicação de CO2 para celulite e flacidez. Melhora oxigenação e circulação sanguínea.',
    category: ServiceCategory.CORPORAL,
    duration: 40,
    price: 160.00
  },
  {
    name: 'Lipoenzimática',
    description: 'Tratamento com enzimas para redução de medidas. Promove quebra de gordura localizada de forma não invasiva.',
    category: ServiceCategory.CORPORAL,
    duration: 50,
    price: 140.00
  },
  
  // ============================================
  // DEPILAÇÃO (CORPORAL)
  // ============================================
  {
    name: 'Depilação a Laser - Face',
    description: 'Depilação definitiva facial com tecnologia de ponta. Resultados duradouros e pele lisinha.',
    category: ServiceCategory.CORPORAL,
    duration: 30,
    price: 80.00,
    machineKind: MachineKind.LASER,
    allowOnSubscription: false,
  },
  {
    name: 'Depilação a Laser - Axilas',
    description: 'Depilação definitiva das axilas. Elimina pelos e manchas escuras.',
    category: ServiceCategory.CORPORAL,
    duration: 15,
    price: 60.00,
    machineKind: MachineKind.LASER,
    allowOnSubscription: false,
  },
  {
    name: 'Depilação a Laser - Virilha',
    description: 'Depilação definitiva da região da virilha. Conforto e praticidade no dia a dia.',
    category: ServiceCategory.CORPORAL,
    duration: 30,
    price: 120.00,
    machineKind: MachineKind.LASER,
    allowOnSubscription: false,
  },
  {
    name: 'Depilação a Laser - Pernas Completas',
    description: 'Depilação definitiva de pernas inteiras. Liberdade para usar o que quiser.',
    category: ServiceCategory.CORPORAL,
    duration: 60,
    price: 250.00,
    machineKind: MachineKind.LASER,
    allowOnSubscription: false,
  },
  {
    name: 'Depilação a Laser - Corpo Completo',
    description: 'Depilação definitiva corpo completo. Inclui todas as regiões desejadas.',
    category: ServiceCategory.CORPORAL,
    duration: 120,
    price: 450.00,
    machineKind: MachineKind.LASER,
    allowOnSubscription: false,
  },
  
  // ============================================
  // PÓS-OPERATÓRIO
  // ============================================
  {
    name: 'Ultrassom Pós-operatório',
    description: 'Tratamento com ultrassom para acelerar recuperação. Trata fibroses e melhora resultado final da cirurgia.',
    category: ServiceCategory.CORPORAL,
    duration: 45,
    price: 100.00
  },
  {
    name: 'Radiofrequência Pós-operatória',
    description: 'Tratamento para flacidez pós-cirúrgica. Melhora retração da pele e resultado estético.',
    category: ServiceCategory.CORPORAL,
    duration: 50,
    price: 140.00
  },
  
  // ============================================
  // TRATAMENTOS INJETÁVEIS (FACIAL)
  // ============================================
  {
    name: 'Aplicação de Botox',
    description: 'Aplicação de toxina botulínica para rugas e linhas de expressão. Resultado natural e duradouro.',
    category: ServiceCategory.FACIAL,
    duration: 30,
    price: 800.00
  },
  {
    name: 'Preenchimento com Ácido Hialurônico',
    description: 'Preenchimento facial para volume e rejuvenescimento. Harmonização natural do rosto.',
    category: ServiceCategory.FACIAL,
    duration: 45,
    price: 1200.00
  },
  {
    name: 'Enzima Dissolvedora',
    description: 'Aplicação de enzima para correção de preenchimentos ou redução de gordura localizada.',
    category: ServiceCategory.CORPORAL,
    duration: 30,
    price: 600.00
  },
  {
    name: 'Bioestimulador de Colágeno',
    description: 'Tratamento injetável que estimula produção natural de colágeno. Rejuvenescimento progressivo e natural.',
    category: ServiceCategory.FACIAL,
    duration: 40,
    price: 1500.00
  },
  {
    name: 'Skinbooster',
    description: 'Hidratação profunda injetável com ácido hialurônico. Pele radiante e hidratada por dentro.',
    category: ServiceCategory.FACIAL,
    duration: 30,
    price: 900.00
  }
]

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // Limpa apenas planos e config (mantém serviços e agendamentos)
  console.log('🧹 Limpando planos e config...')
  await prisma.subscription.deleteMany()
  await prisma.subscriptionPlan.deleteMany()
  await prisma.systemConfig.deleteMany()
  console.log('✅ Limpo!\n')
  
  // ============================================
  // CRIA OS SERVIÇOS (se não existirem)
  // ============================================
  const existingServices = await prisma.service.count()
  let createdServices: any[] = []
  
  if (existingServices === 0) {
    console.log('📝 Criando serviços...')
    for (const service of services) {
      const created = await prisma.service.create({
        data: service
      })
      createdServices.push(created)
      const categoryEmoji = created.category === 'FACIAL' ? '💆' : 
                           created.category === 'MASSAGEM' ? '💆‍♀️' : '🧘'
      console.log(`  ${categoryEmoji} ${created.name} [${created.category}] - R$ ${created.price}`)
    }

    const facialCount = createdServices.filter(s => s.category === 'FACIAL').length
    const massagemCount = createdServices.filter(s => s.category === 'MASSAGEM').length
    const corporalCount = createdServices.filter(s => s.category === 'CORPORAL').length
    
    console.log(`\n📈 Serviços criados:`)
    console.log(`  💆 Faciais: ${facialCount}`)
    console.log(`  💆‍♀️ Massagens: ${massagemCount}`)
    console.log(`  🧘 Corporais: ${corporalCount}`)
  } else {
    // Busca serviços existentes para vincular aos planos
    console.log(`📝 ${existingServices} serviços já existem, mantendo...`)
    createdServices = await prisma.service.findMany()

    // Garante flags de máquina em bases já existentes
    await prisma.service.updateMany({
      where: { name: { startsWith: 'Depilação a Laser' } },
      data: { machineKind: MachineKind.LASER, allowOnSubscription: false },
    })
    await prisma.service.updateMany({
      where: { name: { contains: 'Criolipólise' } },
      data: { machineKind: MachineKind.CRYO, allowOnSubscription: false },
    })
    createdServices = await prisma.service.findMany()
  }

  // ============================================
  // CRIA OS PLANOS DE ASSINATURA
  // ============================================
  console.log(`\n💎 Criando planos de assinatura...\n`)

  // Separar serviços por categoria para vincular aos planos
  const facialServices = createdServices.filter(s => s.category === 'FACIAL')
  const massagemServices = createdServices.filter(s => s.category === 'MASSAGEM')
  const corporalServices = createdServices.filter(s => s.category === 'CORPORAL')

  // PLANO BRONZE - Essencial Beauty
  const bronzeServices = [
    ...facialServices.filter(s => 
      s.name.includes('Limpeza de Pele') || 
      s.name.includes('LED Therapy') ||
      s.name.includes('Hidratação Facial')
    ),
    ...massagemServices.filter(s => 
      s.name.includes('Drenagem Linfática')
    ),
    ...corporalServices.filter(s => 
      s.name.includes('Carboxiterapia') ||
      s.name.includes('Endermologia')
    )
  ]

  const planBronze = await prisma.subscriptionPlan.create({
    data: {
      name: 'Essencial Beauty',
      tier: 'BRONZE',
      description: 'Cuidados faciais e corporais essenciais. Perfeito para quem quer começar a se cuidar com mais frequência. Inclui tratamentos básicos de pele e massagens relaxantes.',
      price: 200.00,
      maxTreatmentsPerMonth: 4,
      maxTreatmentsPerWeek: 999, // Sem limite semanal (valor alto)
      maxFacialPerMonth: null, // Sem limite de faciais
      services: {
        connect: bronzeServices.map(s => ({ id: s.id }))
      }
    }
  })
  console.log(`  🥉 ${planBronze.name} (BRONZE) - R$ ${planBronze.price}/mês`)
  console.log(`     └─ ${bronzeServices.length} serviços inclusos`)
  console.log(`     └─ ${planBronze.maxTreatmentsPerMonth} tratamentos/mês, máx 2/dia`)

  // PLANO PRATA - Plus Care
  const silverServices = [
    ...bronzeServices, // Todos do Bronze
    ...facialServices.filter(s => 
      s.name.includes('Tratamento para Acne') ||
      s.name.includes('Máscara de Ouro')
    ),
    ...massagemServices.filter(s => 
      s.name.includes('Massagem Modeladora') ||
      s.name.includes('Massagem Relaxante')
    ),
    ...corporalServices.filter(s => 
      s.name.includes('Radiofrequência Corporal') ||
      s.name.includes('Lipoenzimática')
    )
  ]

  const planSilver = await prisma.subscriptionPlan.create({
    data: {
      name: 'Plus Care',
      tier: 'SILVER',
      description: 'Tratamentos elaborados e tecnológicos. Inclui modelagem corporal e cuidados faciais avançados como radiofrequência e tratamentos específicos.',
      price: 300.00,
      maxTreatmentsPerMonth: 4,
      maxTreatmentsPerWeek: 999, // Sem limite semanal (valor alto)
      maxFacialPerMonth: null, // Sem limite de faciais
      services: {
        connect: [...new Set(silverServices)].map(s => ({ id: s.id }))
      }
    }
  })
  console.log(`  🥈 ${planSilver.name} (SILVER) - R$ ${planSilver.price}/mês`)
  console.log(`     └─ ${[...new Set(silverServices)].length} serviços inclusos`)
  console.log(`     └─ ${planSilver.maxTreatmentsPerMonth} tratamentos/mês, máx 2/dia`)

  // PLANO OURO - Premium Experience
  const goldServices = [
    ...silverServices, // Todos do Silver
    ...facialServices.filter(s => 
      s.name.includes('Microagulhamento') ||
      s.name.includes('Peeling Químico') ||
      s.name.includes('Skinbooster')
    ),
    ...massagemServices, // Todas as massagens
    ...corporalServices.filter(s =>
      (s.name.includes('Ultrassom Pós-operatório') ||
        s.name.includes('Drenagem Pós-operatória')) &&
      !s.machineKind
    )
  ]

  const planGold = await prisma.subscriptionPlan.create({
    data: {
      name: 'Premium Experience',
      tier: 'GOLD',
      description: 'Acesso total e exclusivo aos tratamentos mais avançados. Inclui microagulhamento, peelings intensos, skinbooster e máxima flexibilidade.',
      price: 450.00,
      maxTreatmentsPerMonth: 6,
      maxTreatmentsPerWeek: 999, // Sem limite semanal (valor alto)
      maxFacialPerMonth: null, // Sem limite de faciais
      services: {
        connect: [...new Set(goldServices)].map(s => ({ id: s.id }))
      }
    }
  })
  console.log(`  🥇 ${planGold.name} (GOLD) - R$ ${planGold.price}/mês`)
  console.log(`     └─ ${[...new Set(goldServices)].length} serviços inclusos`)
  console.log(`     └─ ${planGold.maxTreatmentsPerMonth} tratamentos/mês, máx 2/dia`)

  // ============================================
  // CRIA CONFIGURAÇÕES DO SISTEMA
  // ============================================
  console.log(`\n⚙️  Criando configurações do sistema...`)
  
  const config = await prisma.systemConfig.create({
    data: {
      minCancellationHours: 4,
      minRescheduleHours: 4,
      defaultStartTime: '09:00',
      defaultEndTime: '18:00',
      slotDuration: 30,
      maxSimultaneous: 1,
      minimumCommitmentMonths: 0,
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      maintenanceMode: false
    }
  })
  console.log(`  ✅ Configurações criadas com sucesso!`)
  console.log(`     └─ Cancelamento mínimo: ${config.minCancellationHours}h`)
  console.log(`     └─ Cancelamento de plano: livre (sem fidelidade)`)

  // ============================================
  // SETTINGS DE MÁQUINAS ALUGADAS
  // ============================================
  console.log(`\n🖨️  Configurando máquinas alugadas...`)
  await prisma.machineRentalSettings.upsert({
    where: { kind: MachineKind.LASER },
    update: {},
    create: {
      kind: MachineKind.LASER,
      defaultRule: MachineRentalDefaultRule.LAST_THURSDAY,
      exclusiveDay: true,
      suggestedReleaseDaysBefore: 14,
      lateCancelHours: 24,
      lateCancelFeePercent: 25,
    },
  })
  await prisma.machineRentalSettings.upsert({
    where: { kind: MachineKind.CRYO },
    update: {},
    create: {
      kind: MachineKind.CRYO,
      defaultRule: MachineRentalDefaultRule.SECOND_SATURDAY,
      exclusiveDay: false,
      suggestedReleaseDaysBefore: 14,
      lateCancelHours: 24,
      lateCancelFeePercent: 25,
    },
  })
  console.log(`  ✅ Laser (última quinta, dia exclusivo) + Crio (2º sábado)`)

  // ============================================
  // 9. DEPOIMENTOS
  // ============================================
  console.log('\n📝 Criando depoimentos...')
  
  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'Assinante Plano Ouro',
      avatar: 'M',
      text: 'Há 6 meses faço parte do Charme & Bela e minha pele nunca esteve tão bonita! A economia é real e os tratamentos são impecáveis. Super recomendo!',
      rating: 5,
      order: 1
    },
    {
      name: 'Ana Oliveira',
      role: 'Assinante Plano Prata',
      avatar: 'A',
      text: 'O melhor investimento que fiz em mim mesma! Faço limpeza de pele e tratamentos corporais todo mês. O plano vale cada centavo, economizo muito.',
      rating: 5,
      order: 2
    },
    {
      name: 'Julia Santos',
      role: 'Assinante Plano Bronze',
      avatar: 'J',
      text: 'Comecei com o plano Bronze e já vi resultados incríveis. A drenagem e limpeza de pele são maravilhosas. Equipe super atenciosa e profissional!',
      rating: 5,
      order: 3
    }
  ]
  
  for (const testimonialData of testimonials) {
    await prisma.testimonial.upsert({
      where: { id: 'temp-' + testimonialData.order },
      update: testimonialData,
      create: testimonialData
    })
  }
  
  console.log(`  ✅ ${testimonials.length} depoimentos criados com sucesso!`)

  console.log(`\n✨ Seed concluído com sucesso!`)
  console.log(`📊 Total de serviços: ${createdServices.length}`)
  console.log(`💎 Total de planos: 3`)
  console.log(`💬 Total de depoimentos: ${testimonials.length}`)
}

main()
  .catch((error) => {
    // Omit 'process.exit' for environments where 'process' may be undefined
    console.error('❌ Erro ao executar seed:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
