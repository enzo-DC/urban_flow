import { Body, Controller, Post } from '@nestjs/common';
import type { ReponseItineraires } from '@urbanflow/shared';
import { RequeteItineraireDto } from './dto/requete-itineraire.dto';
import { ItinerairesService } from './itineraires.service';

@Controller('itineraires')
export class ItinerairesController {
  constructor(private readonly itineraires: ItinerairesService) {}

  @Post()
  planifier(
    @Body() requete: RequeteItineraireDto,
  ): Promise<ReponseItineraires> {
    return this.itineraires.planifier(requete);
  }
}
