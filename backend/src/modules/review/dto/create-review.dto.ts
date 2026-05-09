import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  offerId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
