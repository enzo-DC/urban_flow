import { IsString, MinLength } from 'class-validator';

export class RechercheLieuDto {
  @IsString()
  @MinLength(3)
  q!: string;
}
