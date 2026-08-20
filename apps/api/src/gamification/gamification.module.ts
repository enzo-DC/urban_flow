import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationController } from './gamification.controller';
import { GamificationListener } from './gamification.listener';
import { GamificationService } from './gamification.service';

@Module({
  imports: [AuthModule],
  controllers: [GamificationController],
  providers: [GamificationListener, GamificationService],
})
export class GamificationModule {}
