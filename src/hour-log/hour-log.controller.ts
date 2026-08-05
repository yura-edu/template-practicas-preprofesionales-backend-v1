import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CreateHourLogDto } from './dto/create-hour-log.dto'
import { ReviewHourLogDto } from './dto/review-hour-log.dto'
import { HourLogService } from './hour-log.service'

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HourLogController {
  constructor(private readonly service: HourLogService) {}

  @Post('hour-logs')
  @Roles(Role.STUDENT)
  create(@Body() dto: CreateHourLogDto, @Req() req: { user: { sub: number } }) {
    return this.service.create(dto, req.user.sub)
  }

  @Get('placements/:id/hour-logs')
  listForPlacement(@Param('id', ParseIntPipe) id: number) {
    return this.service.listForPlacement(id)
  }

  @Get('placements/:id/progress')
  progress(@Param('id', ParseIntPipe) id: number) {
    return this.service.progressReport(id)
  }

  // N-05: @Roles(TUTOR) valida el rol, no la pertenencia al placement.
  @Patch('hour-logs/:id/review')
  @Roles(Role.TUTOR)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewHourLogDto,
    @Req() req: { user: { sub: number } },
  ) {
    return this.service.review(id, dto.status, req.user.sub, dto.note)
  }
}
