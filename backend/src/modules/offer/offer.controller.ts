// backend/src/modules/offer/offer.controller.ts

import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { OfferService } from './offer.service';
import { JwtGuard } from '../guards/jwt.guard';
import { OfferStatus } from '../../entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';

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
    @Param('id') id: string,
    @Body() body: { amount: number; meetingPointId?: string; meetingTime?: string } // ✅ Opsiyonel konum/saat
  ) {
    return this.offerService.counterOffer(
      req.user.userId, 
      id, 
      body.amount,
      body.meetingPointId,
      body.meetingTime
    );
  }

  @Patch(':id/accept')
  acceptOffer(
    @Request() req, 
    @Param('id') id: string,
    @Body() acceptDto: AcceptOfferDto // Body eklendi
  ) {
    return this.offerService.acceptOfferWithMeeting(req.user.userId, id, acceptDto);
  }
  // Teklifi Reddet
  @Patch(':id/reject')
  rejectOffer(@Request() req, @Param('id') id: string) {
    return this.offerService.respondToOffer(req.user.userId, id, OfferStatus.REJECTED);
  }

  @Patch(':id/confirm-meeting')
  confirmMeeting(@Request() req, @Param('id') id: string) {
    return this.offerService.confirmMeeting(req.user.userId, id);
  }
}