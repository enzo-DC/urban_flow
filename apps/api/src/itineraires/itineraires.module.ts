import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ItinerairesController } from './itineraires.controller';
import { ItinerairesService } from './itineraires.service';

@Module({
  imports: [IntegrationsModule],
  controllers: [ItinerairesController],
  providers: [ItinerairesService],
})
export class ItinerairesModule {}
