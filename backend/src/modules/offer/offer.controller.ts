import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { OfferService } from './offer.service';
import { JwtGuard } from '../guards/jwt.guard';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';

@Controller('offers')
@UseGuards(JwtGuard)
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateOfferDto) {
    return this.offerService.createOffer(req.user.userId, dto);
  }

  @Get('received')
  getReceived(@Request() req) {
    return this.offerService.getOffersReceived(req.user.userId);
  }

  @Get('made')
  getMade(@Request() req) {
    return this.offerService.getOffersMade(req.user.userId);
  }

  @Post(':id/counter')
  counter(@Request() req, @Param('id') id: string, @Body() dto: CounterOfferDto) {
    return this.offerService.counterOffer(req.user.userId, id, dto.amount);
  }

  @Patch(':id/accept')
  accept(@Request() req, @Param('id') id: string) {
    return this.offerService.acceptOffer(req.user.userId, id);
  }

  @Patch(':id/reject')
  reject(@Request() req, @Param('id') id: string) {
    return this.offerService.rejectOffer(req.user.userId, id);
  }
}
