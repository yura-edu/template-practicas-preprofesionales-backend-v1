import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { type Checkpoint, decodeCheckpoint, encodeCheckpoint } from './checkpoint'
import type { SyncOperationInput, SyncOperationResult } from './dto/push.dto'

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async pull(userId: number, since: string | undefined, limit: number) {
    const cursor = decodeCheckpoint(since)
    // N-03: solo se compara updatedAt. cursor.id se decodifica pero nunca
    // entra al where, así que las filas con el mismo milisegundo se saltan.
    const where = cursor ? { updatedAt: { gt: new Date(cursor.updatedAt) } } : {}
    const order = { updatedAt: 'asc' as const }

    const [placements, hourLogs, documents, evaluations] = await Promise.all([
      this.prisma.placement.findMany({ where: { ...where, studentId: userId }, orderBy: order, take: limit }),
      this.prisma.hourLog.findMany({ where, orderBy: order, take: limit }),
      this.prisma.document.findMany({ where, orderBy: order, take: limit }),
      this.prisma.evaluation.findMany({ where, orderBy: order, take: limit }),
    ])

    const newest = [...placements, ...hourLogs, ...documents, ...evaluations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    const checkpoint: Checkpoint | null = newest
      ? { updatedAt: new Date(newest.updatedAt).toISOString(), id: newest.id }
      : cursor

    return {
      changes: { placements, hourLogs, documents, evaluations },
      checkpoint: checkpoint ? encodeCheckpoint(checkpoint) : null,
      hasMore: hourLogs.length === limit,
    }
  }

  async push(userId: number, ops: SyncOperationInput[]) {
    const results: SyncOperationResult[] = []
    for (const op of ops) {
      // D-01: sync_operations se escribe pero NUNCA se consulta antes de
      // aplicar. Un reintento con el mismo clientOpId aplica dos veces.
      const result = await this.applyOperation(op)
      try {
        await this.prisma.syncOperation.create({
          data: { clientOpId: op.clientOpId, userId, response: result as unknown as object },
        })
      } catch {
        // clientOpId es la clave primaria: un reintento choca con el
        // registro previo. El log de sync_operations se ignora, pero la
        // operación de negocio ya se aplicó arriba — eso es D-01.
      }
      results.push(result)
    }
    return { results }
  }

  private async applyOperation(op: SyncOperationInput): Promise<SyncOperationResult> {
    if (op.entity !== 'hourLog') {
      return { clientOpId: op.clientOpId, status: 'rejected', server: null, reason: 'entidad no sincronizable desde el cliente' }
    }

    if (op.op === 'create') {
      const created = await this.prisma.hourLog.create({
        data: {
          placementId: Number(op.payload.placementId),
          date: new Date(String(op.payload.date)),
          startTime: String(op.payload.startTime),
          endTime: String(op.payload.endTime),
          hours: Number(op.payload.hours),
          activity: String(op.payload.activity),
          status: 'SUBMITTED',
        },
      })
      return { clientOpId: op.clientOpId, status: 'applied', server: created as never, reason: null }
    }

    if (op.op === 'update') {
      // N-01: last-write-wins puro. baseVersion se recibe y se ignora, así que
      // una edición offline pisa el APPROVED/REJECTED que ya puso el tutor.
      const updated = await this.prisma.hourLog.update({
        where: { id: Number(op.payload.id) },
        data: {
          date: new Date(String(op.payload.date)),
          startTime: String(op.payload.startTime),
          endTime: String(op.payload.endTime),
          hours: Number(op.payload.hours),
          activity: String(op.payload.activity),
          version: { increment: 1 },
        },
      })
      return { clientOpId: op.clientOpId, status: 'applied', server: updated as never, reason: null }
    }

    const deleted = await this.prisma.hourLog.update({
      where: { id: Number(op.payload.id) },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    })
    return { clientOpId: op.clientOpId, status: 'applied', server: deleted as never, reason: null }
  }
}
