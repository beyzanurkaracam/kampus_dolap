// backend/src/modules/comment/dto/reply-comment.dto.ts

import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class ReplyCommentDto {
  @IsUUID()
  parentId: string;

  @IsString()
  @MinLength(2, { message: 'Yanıt en az 2 karakter olmalıdır.' })
  @MaxLength(500, { message: 'Yanıt en fazla 500 karakter olabilir.' })
  content: string;
}