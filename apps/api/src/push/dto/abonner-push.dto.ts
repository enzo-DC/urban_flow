import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

// Reproduit exactement PushSubscriptionJSON (navigateur) : endpoint + keys.
// expirationTime accepte tel quel (souvent null) mais jamais exploite.
export class AbonnerPushDto {
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @IsOptional()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}
