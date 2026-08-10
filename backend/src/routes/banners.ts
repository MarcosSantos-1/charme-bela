import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { logger } from '../utils/logger'
import { isValidHomeBannerSize } from '../constants/homeBanner'

type BannerLocation = 'LANDING' | 'CLIENT'

const MAX_IMAGE_CHARS = 1_400_000 // ~1MB base64

function parseLocation(value: unknown): BannerLocation | null {
  if (typeof value !== 'string') return null
  const upper = value.toUpperCase()
  if (upper === 'LANDING' || upper === 'CLIENT') return upper
  if (value === 'landing') return 'LANDING'
  if (value === 'cliente' || value === 'client') return 'CLIENT'
  return null
}

export async function bannerRoutes(app: FastifyInstance) {
  // GET - Listar banners (público quando activeOnly; admin lista todos)
  app.get('/banners', async (request, reply) => {
    logger.route('GET', '/banners')

    try {
      const { location, activeOnly } = request.query as {
        location?: string
        activeOnly?: string
      }

      const parsedLocation = location ? parseLocation(location) : null
      if (location && !parsedLocation) {
        return reply.status(400).send({
          success: false,
          error: 'location inválido. Use LANDING ou CLIENT'
        })
      }

      const banners = await prisma.banner.findMany({
        where: {
          ...(parsedLocation ? { location: parsedLocation } : {}),
          ...(activeOnly === 'true' ? { isActive: true } : {})
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      })

      logger.success(`${banners.length} banner(s) encontrados`)
      return reply.status(200).send({
        success: true,
        data: banners
      })
    } catch (error) {
      logger.error('Erro ao buscar banners:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar banners'
      })
    }
  })

  // POST - Criar banner (auth via hook global; admin local em AUTH_ENFORCE=false)
  app.post('/banners', async (request, reply) => {
    logger.route('POST', '/banners')

    try {
      const {
        title,
        imageUrl,
        location,
        sortOrder,
        isActive,
        imageWidth,
        imageHeight
      } = request.body as {
        title?: string
        imageUrl?: string
        location?: string
        sortOrder?: number
        isActive?: boolean
        imageWidth?: number
        imageHeight?: number
      }

      const parsedLocation = parseLocation(location)
      if (!title?.trim() || !imageUrl || !parsedLocation) {
        return reply.status(400).send({
          success: false,
          error: 'Campos obrigatórios: title, imageUrl, location (LANDING|CLIENT)'
        })
      }

      if (imageUrl.length > MAX_IMAGE_CHARS) {
        return reply.status(400).send({
          success: false,
          error: 'Imagem muito grande. Use JPEG/WebP comprimido (máx. ~1MB)'
        })
      }

      if (
        typeof imageWidth === 'number' &&
        typeof imageHeight === 'number' &&
        !isValidHomeBannerSize(imageWidth, imageHeight)
      ) {
        return reply.status(400).send({
          success: false,
          error: 'Proporção inválida. Use 1200×600 (2:1)'
        })
      }

      const maxOrder = await prisma.banner.aggregate({
        where: { location: parsedLocation },
        _max: { sortOrder: true }
      })

      const banner = await prisma.banner.create({
        data: {
          title: title.trim(),
          imageUrl,
          location: parsedLocation,
          sortOrder: sortOrder ?? ((maxOrder._max.sortOrder ?? -1) + 1),
          isActive: isActive !== false
        }
      })

      logger.success(`Banner criado: ${banner.id}`)
      return reply.status(201).send({
        success: true,
        data: banner
      })
    } catch (error) {
      logger.error('Erro ao criar banner:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar banner'
      })
    }
  })

  // PUT - Reordenar banners de uma localização (orderedIds = posição 01, 02, 03…)
  app.put('/banners/reorder', async (request, reply) => {
    logger.route('PUT', '/banners/reorder')

    try {
      const { location, orderedIds } = request.body as {
        location?: string
        orderedIds?: string[]
      }

      const parsedLocation = parseLocation(location)
      if (!parsedLocation || !Array.isArray(orderedIds) || orderedIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Envie location e orderedIds (array de ids na ordem desejada)'
        })
      }

      await prisma.$transaction(
        orderedIds.map((id, index) =>
          prisma.banner.updateMany({
            where: { id, location: parsedLocation },
            data: { sortOrder: index }
          })
        )
      )

      const banners = await prisma.banner.findMany({
        where: { location: parsedLocation },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      })

      logger.success(`Banners reordenados (${parsedLocation}): ${orderedIds.length}`)
      return reply.status(200).send({
        success: true,
        data: banners
      })
    } catch (error) {
      logger.error('Erro ao reordenar banners:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao reordenar banners'
      })
    }
  })

  // PUT - Atualizar banner
  app.put('/banners/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('PUT', `/banners/${id}`)

    try {
      const {
        title,
        imageUrl,
        location,
        sortOrder,
        isActive,
        imageWidth,
        imageHeight
      } = request.body as {
        title?: string
        imageUrl?: string
        location?: string
        sortOrder?: number
        isActive?: boolean
        imageWidth?: number
        imageHeight?: number
      }

      const parsedLocation = location !== undefined ? parseLocation(location) : undefined
      if (location !== undefined && !parsedLocation) {
        return reply.status(400).send({
          success: false,
          error: 'location inválido. Use LANDING ou CLIENT'
        })
      }

      if (imageUrl && imageUrl.length > MAX_IMAGE_CHARS) {
        return reply.status(400).send({
          success: false,
          error: 'Imagem muito grande. Use JPEG/WebP comprimido (máx. ~1MB)'
        })
      }

      if (
        typeof imageWidth === 'number' &&
        typeof imageHeight === 'number' &&
        !isValidHomeBannerSize(imageWidth, imageHeight)
      ) {
        return reply.status(400).send({
          success: false,
          error: 'Proporção inválida. Use 1200×600 (2:1)'
        })
      }

      const banner = await prisma.banner.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(parsedLocation && { location: parsedLocation }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive })
        }
      })

      logger.success(`Banner atualizado: ${id}`)
      return reply.status(200).send({
        success: true,
        data: banner
      })
    } catch (error) {
      logger.error('Erro ao atualizar banner:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar banner'
      })
    }
  })

  // DELETE - Remover banner (hard delete)
  app.delete('/banners/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    logger.route('DELETE', `/banners/${id}`)

    try {
      await prisma.banner.delete({ where: { id } })
      logger.success(`Banner removido: ${id}`)
      return reply.status(200).send({
        success: true,
        message: 'Banner removido'
      })
    } catch (error) {
      logger.error('Erro ao remover banner:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover banner'
      })
    }
  })
}
