import { Module } from '@nestjs/common';
import { FOURNISSEUR_MOBILITE_TOKEN } from './fournisseur-mobilite.interface';
import { VeloToulouseProvider } from './gbfs/velo-toulouse.provider';
import { YegoScooterProvider } from './yego/yego-scooter.provider';

@Module({
  providers: [
    VeloToulouseProvider,
    YegoScooterProvider,
    {
      provide: FOURNISSEUR_MOBILITE_TOKEN,
      useFactory: (velo: VeloToulouseProvider, yego: YegoScooterProvider) => [
        velo,
        yego,
      ],
      inject: [VeloToulouseProvider, YegoScooterProvider],
    },
  ],
  exports: [FOURNISSEUR_MOBILITE_TOKEN],
})
export class IntegrationsModule {}
