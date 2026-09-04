import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ArretsController } from './arrets.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [ArretsController],
})
export class ArretsModule {}
