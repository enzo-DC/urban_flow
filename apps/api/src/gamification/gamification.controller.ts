import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { GamificationResume } from '@urbanflow/shared';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GamificationService } from './gamification.service';

@Controller('moi/gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get()
  monResume(@Req() req: Request): Promise<GamificationResume> {
    return this.gamification.monResume(req.userId!);
  }
}
