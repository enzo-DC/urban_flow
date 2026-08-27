import {
  MODES_TRANSPORT,
  type CritereTri,
  type ModeTransport,
} from '@urbanflow/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  ValidateNested,
} from 'class-validator';

const CRITERES_TRI: CritereTri[] = ['duree', 'co2', 'prix'];

class CoordonneesDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}

export class RequeteItineraireDto {
  @ValidateNested()
  @Type(() => CoordonneesDto)
  depart!: CoordonneesDto;

  @ValidateNested()
  @Type(() => CoordonneesDto)
  arrivee!: CoordonneesDto;

  @IsOptional()
  @IsArray()
  @IsIn(MODES_TRANSPORT, { each: true })
  modesAutorises?: ModeTransport[];

  @IsOptional()
  @IsIn(CRITERES_TRI)
  critereTri?: CritereTri;

  @IsOptional()
  @IsBoolean()
  accessible?: boolean;
}
