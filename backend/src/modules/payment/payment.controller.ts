import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtGuard } from '../guards/jwt.guard';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtGuard)
  @Post('verify')
  async verifyPayment(@Request() req, @Body() dto: VerifyPaymentDto) {
    // req.user.userId JWT token'dan gelir
    return this.paymentService.verifyAndActivatePremium(req.user.userId, dto);
  }
}