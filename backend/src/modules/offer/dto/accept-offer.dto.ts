import { IsString, IsUUID, IsISO8601 } from 'class-validator';

export class AcceptOfferDto {
  @IsUUID()
  meetingPointId: string;

  @IsISO8601() // Tarih formatı kontrolü (YYYY-MM-DDTHH:MM:SSZ)
  meetingTime: string;
}