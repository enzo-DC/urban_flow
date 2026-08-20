import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CarboneController } from './carbone.controller';
import { CarboneListener } from './carbone.listener';
import { CarboneService } from './carbone.service';

@Module({
  imports: [AuthModule],
  controllers: [CarboneController],
  providers: [CarboneListener, CarboneService],
})
export class CarboneModule {}
