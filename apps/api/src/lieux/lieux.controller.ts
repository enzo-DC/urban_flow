import { Controller, Get, Query } from '@nestjs/common';
import type { LieuGeocode } from '@urbanflow/shared';
import { TisseoGeocodageService } from '../integrations/geocoding/tisseo-geocodage.service';
import { RechercheLieuDto } from './dto/recherche-lieu.dto';

@Controller('lieux')
export class LieuxController {
  constructor(private readonly geocodage: TisseoGeocodageService) {}

  @Get('recherche')
  rechercher(@Query() query: RechercheLieuDto): Promise<LieuGeocode[]> {
    return this.geocodage.rechercherAdresse(query.q);
  }
}
