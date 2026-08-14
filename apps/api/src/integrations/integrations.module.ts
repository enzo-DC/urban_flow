import { Module } from '@nestjs/common';
import { FOURNISSEUR_MOBILITE_TOKEN } from './fournisseur-mobilite.interface';
import { VeloToulouseProvider } from './gbfs/velo-toulouse.provider';

@Module({
  providers: [
    VeloToulouseProvider,
    {
      provide: FOURNISSEUR_MOBILITE_TOKEN,
      useFactory: (velo: VeloToulouseProvider) => [velo],
      inject: [VeloToulouseProvider],
    },
  ],
  exports: [FOURNISSEUR_MOBILITE_TOKEN],
})
export class IntegrationsModule {}
