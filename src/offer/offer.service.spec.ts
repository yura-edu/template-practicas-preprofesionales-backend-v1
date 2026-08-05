import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfferService } from './offer.service'

const prisma = {
  offer: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  application: { count: vi.fn() },
}

describe('OfferService', () => {
  let service: OfferService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OfferService(prisma as never)
  })

  it('publishes a DRAFT offer and stamps publishedAt', async () => {
    prisma.offer.findUnique.mockResolvedValue({ id: 1, status: 'DRAFT' })
    prisma.offer.update.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }))

    const result = await service.publish(1)

    expect(result.status).toBe('PUBLISHED')
    expect(result.publishedAt).toBeInstanceOf(Date)
  })

  it('rejects publishing an offer that is not DRAFT', async () => {
    prisma.offer.findUnique.mockResolvedValue({ id: 1, status: 'CLOSED' })

    await expect(service.publish(1)).rejects.toThrow(BadRequestException)
  })

  it('counts accepted applications for an offer', async () => {
    prisma.application.count.mockResolvedValue(3)

    await expect(service.acceptedCount(1)).resolves.toBe(3)
    expect(prisma.application.count).toHaveBeenCalledWith({
      where: { offerId: 1, status: 'ACCEPTED' },
    })
  })
})
