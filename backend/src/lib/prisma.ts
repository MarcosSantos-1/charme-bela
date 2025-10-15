import { PrismaClient } from '@prisma/client'

// Criando uma instância global do Prisma Client
// Isso evita múltiplas conexões no ambiente de desenvolvimento
const prismaClientSingleton = () => {
  console.log('🔌 Inicializando Prisma Client...')
  
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Logs detalhados para debug
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

// Testando conexão ao inicializar
prisma.$connect()
  .then(() => {
    console.log('✅ Conectado ao banco de dados PostgreSQL com sucesso!')
  })
  .catch((error: unknown) => {
    console.error('❌ Erro ao conectar ao banco de dados:', error)
    process.exit(1)
  })

export { prisma }

