import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FOURNISSEUR_MOBILITE_TOKEN } from './fournisseur-mobilite.interface';
import { NominatimGeocodageService } from './geocoding/nominatim-geocodage.service';
import { VeloToulouseProvider } from './gbfs/velo-toulouse.provider';
import { TisseoGtfsRtService } from './gtfs-rt/tisseo-gtfs-rt.service';
import { OtpClientService } from './otp/otp-client.service';
import { YegoScooterProvider } from './yego/yego-scooter.provider';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    VeloToulouseProvider,
    YegoScooterProvider,
    TisseoGtfsRtService,
    OtpClientService,
    NominatimGeocodageService,
    {
      provide: FOURNISSEUR_MOBILITE_TOKEN,
      useFactory: (velo: VeloToulouseProvider, yego: YegoScooterProvider) => [
        velo,
        yego,
      ],
      inject: [VeloToulouseProvider, YegoScooterProvider],
    },
  ],
  exports: [
    FOURNISSEUR_MOBILITE_TOKEN,
    TisseoGtfsRtService,
    OtpClientService,
    NominatimGeocodageService,
  ],
})
export class IntegrationsModule {}
