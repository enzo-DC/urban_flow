import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { ImpactCarbone } from '@urbanflow/shared';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CarboneService } from './carbone.service';

@Controller('moi/impact')
@UseGuards(JwtAuthGuard)
export class CarboneController {
  constructor(private readonly carbone: CarboneService) {}

  @Get()
  monImpact(@Req() req: Request): Promise<ImpactCarbone> {
    return this.carbone.monImpact(req.userId!);
  }
}
