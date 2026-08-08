import { Equals, IsBoolean, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @MinLength(12)
  password!: string;

  @IsBoolean()
  @Equals(true, {
    message: 'Le consentement RGPD est requis pour créer un compte.',
  })
  consentementRgpd!: boolean;
}
