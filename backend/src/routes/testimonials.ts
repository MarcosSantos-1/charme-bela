import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'

export async function testimonialRoutes(app: FastifyInstance) {
  // GET - Listar todos os depoimentos (ou apenas ativos para landing page)
  app.get('/testimonials', async (request, reply) => {
    logger.route('GET', '/testimonials')
    
    try {
      const { activeOnly } = request.query as { activeOnly?: string }
      
      const testimonials = await prisma.testimonial.findMany({
        where: activeOnly === 'true' ? { isActive: true } : undefined,
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ]
      })
      
      logger.success(`${testimonials.length} depoimentos encontrados`)
      return reply.status(200).send({
        success: true,
        data: testimonials
      })
    } catch (error) {
      logger.error('Erro ao buscar depoimentos:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar depoimentos'
      })
    }
  })

  // GET - Buscar um depoimento por ID
  app.get('/testimonials/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('GET', `/testimonials/${id}`)
    
    try {
      const testimonial = await prisma.testimonial.findUnique({
        where: { id }
      })
      
      if (!testimonial) {
        logger.warning(`Depoimento não encontrado: ${id}`)
        return reply.status(404).send({
          success: false,
          error: 'Depoimento não encontrado'
        })
      }
      
      logger.success('Depoimento encontrado')
      return reply.status(200).send({
        success: true,
        data: testimonial
      })
    } catch (error) {
      logger.error('Erro ao buscar depoimento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar depoimento'
      })
    }
  })

  // POST - Criar novo depoimento
  app.post('/testimonials', async (request, reply) => {
    logger.route('POST', '/testimonials')
    
    try {
      const {
        name,
        role,
        avatar,
        text,
        rating,
        photoUrl,
        order
      } = request.body as {
        name: string
        role: string
        avatar: string
        text: string
        rating?: number
        photoUrl?: string
        order?: number
      }
      
      if (!name || !role || !avatar || !text) {
        return reply.status(400).send({
          success: false,
          error: 'Campos obrigatórios: name, role, avatar, text'
        })
      }
      
      const testimonial = await prisma.testimonial.create({
        data: {
          name,
          role,
          avatar: avatar.toUpperCase(),
          text,
          rating: rating || 5,
          photoUrl,
          order: order || 0
        }
      })
      
      logger.success(`Depoimento criado: ${testimonial.id}`)
      return reply.status(201).send({
        success: true,
        data: testimonial
      })
    } catch (error) {
      logger.error('Erro ao criar depoimento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar depoimento'
      })
    }
  })

  // PUT - Atualizar depoimento
  app.put('/testimonials/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/testimonials/${id}`)
    
    try {
      const {
        name,
        role,
        avatar,
        text,
        rating,
        photoUrl,
        order,
        isActive
      } = request.body as {
        name?: string
        role?: string
        avatar?: string
        text?: string
        rating?: number
        photoUrl?: string
        order?: number
        isActive?: boolean
      }
      
      const testimonial = await prisma.testimonial.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(role && { role }),
          ...(avatar && { avatar: avatar.toUpperCase() }),
          ...(text && { text }),
          ...(rating !== undefined && { rating }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(order !== undefined && { order }),
          ...(isActive !== undefined && { isActive })
        }
      })
      
      logger.success(`Depoimento atualizado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: testimonial
      })
    } catch (error) {
      logger.error('Erro ao atualizar depoimento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar depoimento'
      })
    }
  })

  // DELETE - Deletar (soft delete) depoimento
  app.delete('/testimonials/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/testimonials/${id}`)
    
    try {
      const testimonial = await prisma.testimonial.update({
        where: { id },
        data: { isActive: false }
      })
      
      logger.success(`Depoimento desativado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: testimonial
      })
    } catch (error) {
      logger.error('Erro ao deletar depoimento:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar depoimento'
      })
    }
  })
}

