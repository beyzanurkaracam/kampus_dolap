// backend/src/modules/comment/dto/create-comment.dto.ts

import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(2, { message: 'Yorum en az 2 karakter olmalıdır.' })
  @MaxLength(500, { message: 'Yorum en fazla 500 karakter olabilir.' })
  content: string;
}