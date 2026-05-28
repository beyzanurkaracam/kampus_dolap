import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @IsNotEmpty({ message: 'Email alanı zorunludur' })
  @Matches(/^[^\s@]+@[^\s@]+\.(edu(\.[a-z]{2,})?|ac\.[a-z]{2,})$/i, {
    message: 'Sadece üniversite email adresleri (.edu.tr, .edu, .ac.uk) kabul edilir',
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Şifre alanı zorunludur' })
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @MaxLength(64, { message: 'Şifre en fazla 64 karakter olabilir' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Ad soyad alanı zorunludur' })
  @MinLength(2, { message: 'Ad soyad en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Ad soyad en fazla 100 karakter olabilir' })
  fullName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}