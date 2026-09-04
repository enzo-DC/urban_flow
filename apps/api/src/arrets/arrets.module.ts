import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ArretsController } from './arrets.controller';
import { ArretsService } from './arrets.service';

@Module({
  imports: [IntegrationsModule],
  controllers: [ArretsController],
  providers: [ArretsService],
})
export class ArretsModule {}
