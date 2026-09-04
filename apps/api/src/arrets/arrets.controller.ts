import { Controller, Get, Query } from '@nestjs/common';
import type { ArretTransport } from '@urbanflow/shared';
import { OtpClientService } from '../integrations/otp/otp-client.service';
import { ZoneArretsDto } from './dto/zone-arrets.dto';

@Controller('arrets')
export class ArretsController {
  constructor(private readonly otp: OtpClientService) {}

  @Get()
  parZone(@Query() zone: ZoneArretsDto): Promise<ArretTransport[]> {
    return this.otp.arretsDansZone(
      zone.minLat,
      zone.minLon,
      zone.maxLat,
      zone.maxLon,
    );
  }
}
