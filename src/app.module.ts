import { Module } from '@nestjs/common'
import { ApplicationModule } from './application/application.module'
import { AuthModule } from './auth/auth.module'
import { CompanyModule } from './company/company.module'
import { HourLogModule } from './hour-log/hour-log.module'
import { OfferModule } from './offer/offer.module'
import { PlacementModule } from './placement/placement.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [PrismaModule, AuthModule, CompanyModule, OfferModule, ApplicationModule, PlacementModule, HourLogModule],
})
export class AppModule {}
