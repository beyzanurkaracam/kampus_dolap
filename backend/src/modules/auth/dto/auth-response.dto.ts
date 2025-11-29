export class AuthResponseDto {
  access_token: string;
  user?: {
    id: number;
    email: string;
    fullName?: string;
    role: string;
  };
  admin?: {
    id: number;
    email: string;
    role: string;
  };
}