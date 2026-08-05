import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ApplicationStatus, OfferStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateOfferDto } from './dto/create-offer.dto'

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOfferDto) {
    return this.prisma.offer.create({ data: { ...dto, status: OfferStatus.DRAFT } })
  }

  findAll() {
    return this.prisma.offer.findMany({
      where: { status: OfferStatus.PUBLISHED },
      orderBy: { publishedAt: 'desc' },
      include: { company: true },
    })
  }

  async findOne(id: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id }, include: { company: true } })
    if (!offer) throw new NotFoundException('oferta no encontrada')
    return offer
  }

  async publish(id: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id } })
    if (!offer) throw new NotFoundException('oferta no encontrada')
    if (offer.status !== OfferStatus.DRAFT) {
      throw new BadRequestException('solo se publican ofertas en DRAFT')
    }
    return this.prisma.offer.update({
      where: { id },
      data: { status: OfferStatus.PUBLISHED, publishedAt: new Date() },
    })
  }

  async close(id: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id } })
    if (!offer) throw new NotFoundException('oferta no encontrada')
    if (offer.status !== OfferStatus.PUBLISHED) {
      throw new BadRequestException('solo se cierran ofertas publicadas')
    }
    return this.prisma.offer.update({ where: { id }, data: { status: OfferStatus.CLOSED } })
  }

  // Cuenta las postulaciones ya aceptadas para una oferta.
  acceptedCount(offerId: number): Promise<number> {
    return this.prisma.application.count({
      where: { offerId, status: ApplicationStatus.ACCEPTED },
    })
  }
}
