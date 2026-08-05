import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateEvaluationDto } from './dto/create-evaluation.dto'

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: CreateEvaluationDto, evaluatorId: number) {
    const placement = await this.prisma.placement.findUnique({ where: { id: dto.placementId } })
    if (!placement) throw new NotFoundException('placement no encontrado')

    return this.prisma.evaluation.create({
      data: {
        placementId: dto.placementId,
        evaluatorId,
        kind: dto.kind,
        period: dto.period,
        scores: dto.scores as unknown as object,
        comment: dto.comment,
        submittedAt: new Date(),
      },
    })
  }

  listForPlacement(placementId: number) {
    return this.prisma.evaluation.findMany({
      where: { placementId, deletedAt: null },
      orderBy: { submittedAt: 'desc' },
    })
  }
}
