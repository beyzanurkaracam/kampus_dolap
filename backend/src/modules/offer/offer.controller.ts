// backend/src/modules/offer/offer.controller.ts

import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { OfferService } from './offer.service';
import { JwtGuard } from '../guards/jwt.guard';
import { OfferStatus } from '../../entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';

@Controller('offers')
@UseGuards(JwtGuard)
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  create(@Request() req, @Body() createOfferDto: CreateOfferDto) {
    return this.offerService.createOffer(req.user.userId, createOfferDto);
  }

  // Bana gelen teklifler (Satıcıyım)
  @Get('received')
  getReceived(@Request() req) {
    return this.offerService.getOffersReceived(req.user.userId);
  }

  // Yaptığım teklifler (Alıcıyım)
  @Get('made')
  getMade(@Request() req) {
    return this.offerService.getOffersMade(req.user.userId);
  }
  @Post(':id/counter')
  counter(
    @Request() req, 
    @Param('id') id: string, // Eski teklif ID'si
    @Body('amount') amount: number // Body'den sadece { amount: 500 } bekliyoruz
  ) {
    return this.offerService.counterOffer(req.user.userId, id, amount);
  }

  // Teklifi Kabul Et
  @Patch(':id/accept')
  acceptOffer(@Request() req, @Param('id') id: string) {
    return this.offerService.respondToOffer(req.user.userId, id, OfferStatus.ACCEPTED);
  }

  // Teklifi Reddet
  @Patch(':id/reject')
  rejectOffer(@Request() req, @Param('id') id: string) {
    return this.offerService.respondToOffer(req.user.userId, id, OfferStatus.REJECTED);
  }
}