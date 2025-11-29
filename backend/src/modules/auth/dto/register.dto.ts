export class RegisterDto {
  email: string;
  password: string;
  fullName: string;
  department?: string; // Bölüm bilgisi (opsiyonel)
  phone?: string; // Telefon (opsiyonel)
}