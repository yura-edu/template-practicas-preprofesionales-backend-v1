import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { CreatePlacementDto } from './dto/create-placement.dto'
import { UploadDocumentDto } from './dto/upload-document.dto'
import { PlacementService } from './placement.service'

@Controller('placements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlacementController {
  constructor(private readonly service: PlacementService) {}

  @Post()
  @Roles(Role.COORDINATOR)
  create(@Body() dto: CreatePlacementDto) {
    return this.service.createFromApplication(dto.applicationId, dto.tutorId)
  }

  @Get('me')
  @Roles(Role.STUDENT)
  findMine(@Req() req: { user: { sub: number } }) {
    return this.service.findForStudent(req.user.sub)
  }

  @Patch(':id/activate')
  @Roles(Role.COORDINATOR)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id)
  }

  @Post(':id/documents')
  @Roles(Role.STUDENT, Role.COORDINATOR)
  addDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadDocumentDto,
    @Req() req: { user: { sub: number } },
  ) {
    return this.service.addDocument(id, dto, req.user.sub)
  }
}
