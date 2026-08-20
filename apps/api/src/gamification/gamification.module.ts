import { Module } from '@nestjs/common';
import { GamificationListener } from './gamification.listener';

@Module({
  providers: [GamificationListener],
})
export class GamificationModule {}
