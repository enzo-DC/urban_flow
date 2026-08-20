import { MODES_TRANSPORT, type ModeTransport } from '@urbanflow/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CoordonneesDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

// Volontairement pas de champ "trace" : le trace GPS brut n'est jamais
// accepte en entree (RGPD, minimisation) — avec forbidNonWhitelisted actif
// globalement, l'envoyer ferait meme rejeter la requete (400), ce n'est
// pas qu'un champ ignore en silence.
class SegmentEffectueDto {
  @IsIn(MODES_TRANSPORT)
  mode!: ModeTransport;

  @ValidateNested()
  @Type(() => CoordonneesDto)
  depart!: CoordonneesDto;

  @ValidateNested()
  @Type(() => CoordonneesDto)
  arrivee!: CoordonneesDto;

  @IsInt()
  @Min(0)
  distanceMetres!: number;

  @IsInt()
  @Min(0)
  dureeSecondes!: number;

  @IsOptional()
  @IsString()
  operateur?: string;
}

// Pas de dureeSecondes/co2Grammes au niveau itineraire non plus : toujours
// recalcules cote serveur a partir des segments, jamais fait confiance a un
// total fourni par le client.
export class EnregistrerTrajetDto {
  @ValidateNested()
  @Type(() => CoordonneesDto)
  depart!: CoordonneesDto;

  @ValidateNested()
  @Type(() => CoordonneesDto)
  arrivee!: CoordonneesDto;

  @ValidateNested({ each: true })
  @Type(() => SegmentEffectueDto)
  @ArrayMinSize(1)
  segments!: SegmentEffectueDto[];
}
