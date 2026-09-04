import { Controller, Get, Query } from '@nestjs/common';
import type { ArretTransport, ProchainPassage } from '@urbanflow/shared';
import { ArretsService } from './arrets.service';
import { ProchainsPassagesDto } from './dto/prochains-passages.dto';
import { ZoneArretsDto } from './dto/zone-arrets.dto';

@Controller('arrets')
export class ArretsController {
  constructor(private readonly arrets: ArretsService) {}

  @Get()
  parZone(@Query() zone: ZoneArretsDto): Promise<ArretTransport[]> {
    return this.arrets.parZone(
      zone.minLat,
      zone.minLon,
      zone.maxLat,
      zone.maxLon,
    );
  }

  @Get('prochains-passages')
  prochainsPassages(
    @Query() query: ProchainsPassagesDto,
  ): Promise<ProchainPassage[]> {
    return this.arrets.prochainsPassages(query.id);
  }
}
