import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Dados dos serviços baseados em tratamentos típicos de estética
const services = [
  // Tratamentos Faciais
  {
    name: 'Limpeza de Pele Profunda',
    description: 'Limpeza facial completa com extração, esfoliação e máscara. Ideal para todos os tipos de pele, promove limpeza profunda dos poros e renovação celular.',
    duration: 60,
    price: 120.00
  },
  {
    name: 'Peeling Químico',
    description: 'Tratamento renovador da pele com ácidos para manchas e rejuvenescimento. Reduz manchas, cicatrizes de acne e sinais de envelhecimento.',
    duration: 45,
    price: 180.00
  },
  {
    name: 'Microagulhamento',
    description: 'Estimulação de colágeno para cicatrizes e rejuvenescimento. Trata rugas, flacidez e cicatrizes com resultados visíveis.',
    duration: 90,
    price: 250.00
  },
  {
    name: 'Máscara de Ouro',
    description: 'Tratamento facial luxuoso com máscara de ouro 24k. Proporciona luminosidade, hidratação profunda e efeito lifting imediato.',
    duration: 60,
    price: 200.00
  },
  {
    name: 'Hidratação Facial Profunda',
    description: 'Tratamento intensivo de hidratação com ácido hialurônico e vitaminas. Restaura a barreira cutânea e proporciona viço à pele.',
    duration: 50,
    price: 130.00
  },
  {
    name: 'Tratamento para Acne',
    description: 'Protocolo especializado para controle e tratamento da acne. Inclui limpeza, extração e aplicação de produtos específicos.',
    duration: 70,
    price: 150.00
  },
  {
    name: 'LED Therapy Facial',
    description: 'Tratamento com luz LED para rejuvenescimento e tratamento de acne. Estimula colágeno e reduz inflamações.',
    duration: 40,
    price: 140.00
  },
  
  // Tratamentos Corporais
  {
    name: 'Drenagem Linfática',
    description: 'Massagem terapêutica para redução de inchaço e toxinas. Melhora circulação e combate retenção de líquidos.',
    duration: 60,
    price: 100.00
  },
  {
    name: 'Massagem Modeladora',
    description: 'Massagem intensa para redução de medidas e celulite. Quebra nódulos de gordura e melhora contorno corporal.',
    duration: 60,
    price: 110.00
  },
  {
    name: 'Criolipólise',
    description: 'Eliminação de gordura localizada por congelamento. Reduz até 25% da gordura na área tratada em uma sessão.',
    duration: 90,
    price: 400.00
  },
  {
    name: 'Radiofrequência Corporal',
    description: 'Tratamento de flacidez e celulite com calor. Estimula produção de colágeno e elastina para pele mais firme.',
    duration: 60,
    price: 150.00
  },
  {
    name: 'Endermologia',
    description: 'Tratamento mecânico para celulite e gordura localizada. Melhora circulação e aparência da pele.',
    duration: 50,
    price: 130.00
  },
  {
    name: 'Carboxiterapia',
    description: 'Aplicação de CO2 para celulite e flacidez. Melhora oxigenação e circulação sanguínea.',
    duration: 40,
    price: 160.00
  },
  {
    name: 'Massagem Relaxante',
    description: 'Massagem corporal completa para alívio do estresse e tensões musculares. Promove bem-estar e relaxamento profundo.',
    duration: 60,
    price: 120.00
  },
  {
    name: 'Lipoenzimática',
    description: 'Tratamento com enzimas para redução de medidas. Promove quebra de gordura localizada de forma não invasiva.',
    duration: 50,
    price: 140.00
  },
  
  // Depilação
  {
    name: 'Depilação a Laser - Face',
    description: 'Depilação definitiva facial com tecnologia de ponta. Resultados duradouros e pele lisinha.',
    duration: 30,
    price: 80.00
  },
  {
    name: 'Depilação a Laser - Axilas',
    description: 'Depilação definitiva das axilas. Elimina pelos e manchas escuras.',
    duration: 15,
    price: 60.00
  },
  {
    name: 'Depilação a Laser - Virilha',
    description: 'Depilação definitiva da região da virilha. Conforto e praticidade no dia a dia.',
    duration: 30,
    price: 120.00
  },
  {
    name: 'Depilação a Laser - Pernas Completas',
    description: 'Depilação definitiva de pernas inteiras. Liberdade para usar o que quiser.',
    duration: 60,
    price: 250.00
  },
  {
    name: 'Depilação a Laser - Corpo Completo',
    description: 'Depilação definitiva corpo completo. Inclui todas as regiões desejadas.',
    duration: 120,
    price: 450.00
  },
  
  // Pós-operatório
  {
    name: 'Drenagem Pós-operatória',
    description: 'Drenagem especializada para recuperação pós-cirúrgica. Reduz edemas e acelera cicatrização.',
    duration: 60,
    price: 120.00
  },
  {
    name: 'Ultrassom Pós-operatório',
    description: 'Tratamento com ultrassom para acelerar recuperação. Trata fibroses e melhora resultado final da cirurgia.',
    duration: 45,
    price: 100.00
  },
  {
    name: 'Radiofrequência Pós-operatória',
    description: 'Tratamento para flacidez pós-cirúrgica. Melhora retração da pele e resultado estético.',
    duration: 50,
    price: 140.00
  },
  
  // Tratamentos Injetáveis
  {
    name: 'Aplicação de Botox',
    description: 'Aplicação de toxina botulínica para rugas e linhas de expressão. Resultado natural e duradouro.',
    duration: 30,
    price: 800.00
  },
  {
    name: 'Preenchimento com Ácido Hialurônico',
    description: 'Preenchimento facial para volume e rejuvenescimento. Harmonização natural do rosto.',
    duration: 45,
    price: 1200.00
  },
  {
    name: 'Enzima Dissolvedora',
    description: 'Aplicação de enzima para correção de preenchimentos ou redução de gordura localizada.',
    duration: 30,
    price: 600.00
  },
  {
    name: 'Bioestimulador de Colágeno',
    description: 'Tratamento injetável que estimula produção natural de colágeno. Rejuvenescimento progressivo e natural.',
    duration: 40,
    price: 1500.00
  },
  {
    name: 'Skinbooster',
    description: 'Hidratação profunda injetável com ácido hialurônico. Pele radiante e hidratada por dentro.',
    duration: 30,
    price: 900.00
  }
]

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // Limpa a tabela de serviços antes de popular
  console.log('🧹 Limpando tabela de serviços...')
  await prisma.service.deleteMany()
  console.log('✅ Tabela limpa!\n')

  // Cria os serviços
  console.log('📝 Criando serviços...')
  for (const service of services) {
    const created = await prisma.service.create({
      data: service
    })
    console.log(`  ✅ ${created.name} - R$ ${created.price}`)
  }

  console.log(`\n✨ Seed concluído com sucesso!`)
  console.log(`📊 Total de serviços criados: ${services.length}`)
}

main()
  .catch((error) => {
    console.error('❌ Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

