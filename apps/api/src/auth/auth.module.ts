import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // JwtModule est ré-exporté : JwtAuthGuard est instancié par chaque module
  // consommateur (@UseGuards(JwtAuthGuard) crée sa propre instance via DI),
  // il lui faut donc JwtService disponible dans ce module-là aussi.
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
