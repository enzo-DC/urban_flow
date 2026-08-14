import { Controller, Get, Query } from '@nestjs/common';
import type { LieuGeocode } from '@urbanflow/shared';
import { NominatimGeocodageService } from '../integrations/geocoding/nominatim-geocodage.service';
import { RechercheLieuDto } from './dto/recherche-lieu.dto';

@Controller('lieux')
export class LieuxController {
  constructor(private readonly geocodage: NominatimGeocodageService) {}

  @Get('recherche')
  rechercher(@Query() query: RechercheLieuDto): Promise<LieuGeocode[]> {
    return this.geocodage.rechercherAdresse(query.q);
  }
}
