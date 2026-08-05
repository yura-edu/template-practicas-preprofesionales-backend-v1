import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('credenciales inválidas')
    }
    // N-08: firmado sin expiresIn — el token no caduca.
    const accessToken = await this.jwt.signAsync({ sub: user.id, email, role: user.role })
    return {
      accessToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role as Role },
    }
  }
}
