import { MODES_TRANSPORT, type ModeTransport } from '@urbanflow/shared';
import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateProfilDto {
  @IsOptional()
  @IsArray()
  @IsIn(MODES_TRANSPORT, { each: true })
  modesPreferes?: ModeTransport[];

  @IsOptional()
  @IsBoolean()
  besoinsAccessibilite?: boolean;
}
