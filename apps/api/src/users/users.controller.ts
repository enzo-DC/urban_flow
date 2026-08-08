import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfilDto } from './dto/update-profil.dto';
import { UsersService } from './users.service';

@Controller('moi')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  me(@Req() req: Request) {
    return this.usersService.getProfile(req.userId!);
  }

  @Patch('profil')
  updateProfil(@Req() req: Request, @Body() dto: UpdateProfilDto) {
    return this.usersService.updateProfil(req.userId!, dto);
  }

  @Get('export')
  @Header(
    'Content-Disposition',
    'attachment; filename="urbanflow-donnees.json"',
  )
  export(@Req() req: Request) {
    return this.usersService.exportData(req.userId!);
  }

  @Delete()
  @HttpCode(204)
  async remove(@Req() req: Request): Promise<void> {
    await this.usersService.deleteAccount(req.userId!);
  }
}
