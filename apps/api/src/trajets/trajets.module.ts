import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrajetsController } from './trajets.controller';
import { TrajetsService } from './trajets.service';

@Module({
  imports: [AuthModule],
  controllers: [TrajetsController],
  providers: [TrajetsService],
})
export class TrajetsModule {}
