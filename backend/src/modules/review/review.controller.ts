import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtGuard } from '../guards/jwt.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('reviews')
@UseGuards(JwtGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(req.user.userId, dto);
  }

  @Get('seller/:sellerId')
  bySeller(@Param('sellerId') sellerId: string) {
    return this.reviewService.getSellerReviews(sellerId);
  }

  @Get('offer/:offerId')
  byOffer(@Request() req, @Param('offerId') offerId: string) {
    return this.reviewService.getReviewByOffer(offerId, req.user.userId);
  }
}
