import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LieuxController } from './lieux.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [LieuxController],
})
export class LieuxModule {}
