import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnregistrerTrajetDto } from './dto/enregistrer-trajet.dto';
import { TrajetsService, type TrajetEnregistre } from './trajets.service';

@Controller('trajets')
@UseGuards(JwtAuthGuard)
export class TrajetsController {
  constructor(private readonly trajets: TrajetsService) {}

  @Post()
  enregistrer(
    @Req() req: Request,
    @Body() dto: EnregistrerTrajetDto,
  ): Promise<TrajetEnregistre> {
    return this.trajets.enregistrer(req.userId!, dto);
  }
}
