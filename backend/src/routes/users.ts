import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { notifyAdminNewClientRegistered, notifyWelcome } from '../utils/notifications'

export async function usersRoutes(app: FastifyInstance) {
  // GET - Buscar aniversariantes do mês
  app.get('/users/birthdays', async (request, reply) => {
    logger.route('GET', '/users/birthdays')
    
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1 // 1-12
      
      // Buscar todos os clientes com anamnese
      const users = await prisma.user.findMany({
        where: {
          role: 'CLIENT',
          isActive: true,
          anamnesisForm: {
            isNot: null
          }
        },
        include: {
          anamnesisForm: true
        }
      })
      
      // Filtrar aniversariantes do mês
      const birthdays = users
        .map(user => {
          if (!user.anamnesisForm) return null
          
          const personalData = user.anamnesisForm.personalData as any
          if (!personalData?.birthDate) return null
          
          // Validar se birthDate é uma data válida
          const birthDate = new Date(personalData.birthDate)
          if (isNaN(birthDate.getTime())) {
            logger.warning(`Data de nascimento inválida para ${user.name}`)
            return null
          }
          
          const birthMonth = birthDate.getMonth() + 1
          
          // Apenas do mês atual
          if (birthMonth !== currentMonth) return null
          
          // Calcular idade corretamente
          let age = now.getFullYear() - birthDate.getFullYear()
          const monthDiff = now.getMonth() - birthDate.getMonth()
          const dayDiff = now.getDate() - birthDate.getDate()
          
          // Ajustar idade se ainda não fez aniversário este ano
          if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--
          }
          
          // Filtrar idades inválidas (menor que 16 ou maior que 120)
          if (age < 16 || age > 120) {
            logger.warning(`Idade inválida calculada para ${user.name}: ${age} anos`)
            return null
          }
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            birthDate: personalData.birthDate,
            birthDay: birthDate.getDate(),
            birthMonth,
            age
          }
        })
        .filter(b => b !== null)
        .sort((a: any, b: any) => a.birthDay - b.birthDay) // Ordenar por dia
      
      logger.success(`Retornando ${birthdays.length} aniversariantes do mês ${currentMonth}`)
      
      return reply.status(200).send({
        success: true,
        data: birthdays
      })
    } catch (error: any) {
      logger.error('Erro ao buscar aniversariantes:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar aniversariantes',
        details: error.message
      })
    }
  })
  
  // GET - Listar todos os usuários (com filtros opcionais)
  app.get('/users', async (request, reply) => {
    logger.route('GET', '/users')
    
    try {
      const { role, isActive } = request.query as { role?: string, isActive?: string }
      
      const users = await prisma.user.findMany({
        where: {
          ...(role && { role: role.toUpperCase() as any }),
          ...(isActive !== undefined && { isActive: isActive === 'true' })
        },
        include: {
          subscription: {
            include: {
              plan: true
            }
          },
          anamnesisForm: {
            select: {
              id: true,
              termsAccepted: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              appointments: true,
              vouchers: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      logger.success(`Retornando ${users.length} usuários`)
      return reply.status(200).send({
        success: true,
        data: users
      })
    } catch (error) {
      logger.error('Erro ao buscar usuários:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar usuários'
      })
    }
  })

  // GET - Buscar usuário por Firebase UID
  app.get('/users/firebase/:firebaseUid', async (request, reply) => {
    const { firebaseUid } = request.params as { firebaseUid: string }
    logger.route('GET', `/users/firebase/${firebaseUid}`)
    
    try {
      const user = await prisma.user.findUnique({
        where: { firebaseUid },
        include: {
          subscription: {
            include: {
              plan: {
                include: {
                  services: true
                }
              }
            }
          },
          anamnesisForm: true,
          appointments: {
            include: {
              service: true
            },
            orderBy: { startTime: 'desc' },
            take: 10
          },
          vouchers: {
            where: { isUsed: false },
            orderBy: { createdAt: 'desc' }
          },
          monthlyUsage: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 1
          }
        }
      })
      
      if (!user) {
        logger.warning(`Usuário não encontrado: ${firebaseUid}`)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      logger.success(`Usuário encontrado: ${user.name}`)
      return reply.status(200).send({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Erro ao buscar usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar usuário'
      })
    }
  })

  // GET - Buscar usuário por ID
  app.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/users/${id}`)
    
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: {
                include: {
                  services: true
                }
              }
            }
          },
          anamnesisForm: true,
          appointments: {
            include: {
              service: true
            },
            orderBy: { startTime: 'desc' },
            take: 10 // Últimos 10 agendamentos
          },
          vouchers: {
            where: { isUsed: false },
            orderBy: { createdAt: 'desc' }
          },
          monthlyUsage: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 3 // Últimos 3 meses
          }
        }
      })
      
      if (!user) {
        logger.warning(`Usuário não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      // Se tem subscription ativa, calcular remaining e limits
      let userData: any = { ...user }
      if (user.subscription && user.subscription.status === 'ACTIVE') {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()
        
        logger.debug(`Calculando usage para usuário ${id}: mês ${month}/${year}`)
        
        const monthlyUsage = await prisma.monthlyUsage.findUnique({
          where: {
            userId_month_year: { userId: id, month, year }
          }
        })
        
        const maxPerMonth = user.subscription.plan.maxTreatmentsPerMonth
        const usedThisMonth = monthlyUsage?.totalTreatments || 0
        const remainingThisMonth = maxPerMonth - usedThisMonth
        
        logger.debug(`📊 Usage: usado=${usedThisMonth}, max=${maxPerMonth}, remaining=${remainingThisMonth}`)
        
        userData.subscription = {
          ...user.subscription,
          currentMonthUsage: {
            totalTreatments: usedThisMonth
          },
          limits: {
            maxPerMonth: maxPerMonth,
            maxPerDay: 3
          },
          remaining: {
            thisMonth: remainingThisMonth
          }
        }
      }
      
      logger.success(`Usuário encontrado: ${user.name}`)
      return reply.status(200).send({
        success: true,
        data: userData
      })
    } catch (error) {
      logger.error('Erro ao buscar usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar usuário'
      })
    }
  })

  // POST - Criar novo usuário (admin pode criar clientes)
  app.post('/users', async (request, reply) => {
    logger.route('POST', '/users')
    
    try {
      const { 
        name, 
        email, 
        phone, 
        firebaseUid,
        role,
        createdBy 
      } = request.body as {
        name: string
        email: string
        phone?: string
        firebaseUid?: string
        role?: string
        createdBy?: string
      }
      
      logger.debug('Criando novo usuário:', { name, email, role })
      
      // Verifica se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        logger.warning(`Email já cadastrado: ${email}`)
        return reply.status(400).send({
          success: false,
          error: 'Email já cadastrado'
        })
      }
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          firebaseUid,
          role: role ? role.toUpperCase() as any : 'CLIENT',
          createdBy
        },
        include: {
          subscription: true,
          anamnesisForm: true
        }
      })
      
      // Se é um cliente, notifica admin e envia boas-vindas
      if (user.role === 'CLIENT') {
        // Notifica admin sobre novo cliente
        await notifyAdminNewClientRegistered({
          clientName: user.name,
          email: user.email,
          userId: user.id
        })
        
        // Envia boas-vindas ao cliente
        await notifyWelcome(user.id, user.name)
      }
      
      logger.success(`Usuário criado com sucesso: ${user.name} (ID: ${user.id})`)
      return reply.status(201).send({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Erro ao criar usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar usuário'
      })
    }
  })

  // PUT - Atualizar usuário
  app.put('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/users/${id}`)
    
    try {
      const { 
        name, 
        email, 
        phone, 
        profileImageUrl,
        isActive 
      } = request.body as {
        name?: string
        email?: string
        phone?: string
        profileImageUrl?: string
        isActive?: boolean
      }
      
      // Verifica se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id }
      })
      
      if (!existingUser) {
        logger.warning(`Usuário não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Usuário não encontrado'
        })
      }
      
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone !== undefined && { phone }),
          ...(profileImageUrl !== undefined && { profileImageUrl }),
          ...(isActive !== undefined && { isActive })
        },
        include: {
          subscription: {
            include: {
              plan: true
            }
          },
          anamnesisForm: true
        }
      })
      
      logger.success(`Usuário atualizado: ${user.name}`)
      return reply.status(200).send({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar usuário'
      })
    }
  })

  // DELETE - Desativar usuário (soft delete)
  app.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/users/${id}`)
    
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          isActive: false
        }
      })
      
      logger.success(`Usuário desativado: ${user.name}`)
      return reply.status(200).send({
        success: true,
        message: 'Usuário desativado com sucesso',
        data: user
      })
    } catch (error) {
      logger.error('Erro ao desativar usuário:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao desativar usuário'
      })
    }
  })
}

