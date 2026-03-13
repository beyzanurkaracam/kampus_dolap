// backend/src/modules/offer/dto/create-offer.dto.ts

import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateOfferDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}