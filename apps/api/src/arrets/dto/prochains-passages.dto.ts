import { IsNotEmpty, IsString } from 'class-validator';

export class ProchainsPassagesDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
