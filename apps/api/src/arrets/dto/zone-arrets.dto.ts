import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';

export class ZoneArretsDto {
  @Type(() => Number)
  @IsLatitude()
  minLat!: number;

  @Type(() => Number)
  @IsLongitude()
  minLon!: number;

  @Type(() => Number)
  @IsLatitude()
  maxLat!: number;

  @Type(() => Number)
  @IsLongitude()
  maxLon!: number;
}
