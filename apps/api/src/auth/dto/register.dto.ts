import { PASSWORD_MIN_LENGTH } from '@urbanflow/shared';
import { Equals, IsBoolean, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Le consentement RGPD est requis pour créer un compte.',
  })
  consentementRgpd!: boolean;
}
