// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, Headers, Query, UseGuards, Request } from '@nestjs/common';
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

  @Post('register')
  async register(
    @Body() dto: RegisterDto
  ) {
    console.log('RegisterDto alındı2232:');

    return this.authService.registerUser(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.loginUser(dto);
  }

  @Post('admin-login')
  async adminLogin(@Body() dto: LoginDto) {
    console.log('Admin login attempt for:', dto.email);
    return this.authService.loginAdmin(dto);
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
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmail(body.email, body.code);
  }

  @Post('resend-code')
  async resendCode(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  async getProfile(@Request() req, @Headers() headers) {
    console.log('Profile endpoint çağrıldı');
    console.log('Headers:', headers);
    console.log('req.user:', req.user);
    return this.authService.getUserProfile(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post('profile/update')
  async updateProfile(@Request() req, @Body() updateData: { fullName?: string; phone?: string; profilePhoto?: string }) {
    return this.authService.updateUserProfile(req.user.userId, updateData);
  }
}
