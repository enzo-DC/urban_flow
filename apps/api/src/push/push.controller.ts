import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AbonnerPushDto } from './dto/abonner-push.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  // Public : la cle VAPID publique n'est pas un secret, elle doit justement
  // etre connue du navigateur pour souscrire (applicationServerKey).
  @Get('cle-publique')
  clePublique(): { clePublique: string } {
    return { clePublique: this.push.clePublique() };
  }

  @Post('abonnement')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async abonner(
    @Req() req: Request,
    @Body() dto: AbonnerPushDto,
  ): Promise<void> {
    await this.push.abonner(req.userId!, dto);
  }

  @Delete('abonnement')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async desabonner(
    @Req() req: Request,
    @Query('endpoint') endpoint: string,
  ): Promise<void> {
    await this.push.desabonner(req.userId!, endpoint);
  }
}
