import { Controller, Post, Body, Get, Headers, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('detect-university')
  async detectUniversity(@Query('email') email: string) {
    return this.authService.detectUniversityFromEmail(email);
  }

  // Brute force koruması: dakikada en fazla 5 kayıt denemesi
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.registerUser(dto);
  }

  // Brute force koruması: dakikada en fazla 5 giriş denemesi
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('verify')
  async verify(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { valid: false };
    }
    const decoded = await this.authService.validateToken(token);
    return { valid: true, user: decoded };
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Post('resend-code')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resendCode(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getFullProfile(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post('profile/update')
  async updateProfile(
    @Request() req,
    @Body() updateData: { fullName?: string; phone?: string; profilePhoto?: string },
  ) {
    return this.authService.updateUserProfile(req.user.userId, updateData);
  }

  @UseGuards(JwtGuard)
  @Post('fcm-token')
  async saveFcmToken(@Request() req, @Body() body: { token: string }) {
    return this.authService.saveFcmToken(req.user.userId, body.token);
  }
}