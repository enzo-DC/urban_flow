import { Module } from '@nestjs/common';
import { GamificationListener } from './gamification.listener';
import { GamificationService } from './gamification.service';

@Module({
  providers: [GamificationListener, GamificationService],
})
export class GamificationModule {}
