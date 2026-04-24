// backend/src/modules/comment/comment.controller.ts

import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Query,
  } from '@nestjs/common';
  import { CommentService } from './comment.service';
  import { JwtGuard } from '../guards/jwt.guard';
  import { CreateCommentDto } from './dto/create-comment.dto';
  import { ReplyCommentDto } from './dto/reply-comment.dto';
  
  @Controller('comments')
  export class CommentController {
    constructor(private readonly commentService: CommentService) {}
  
    // ── Yeni ana yorum oluştur (Alıcı) ──
    @UseGuards(JwtGuard)
    @Post()
    create(@Request() req, @Body() dto: CreateCommentDto) {
      return this.commentService.createComment(req.user.userId, dto);
    }
  
    // ── Yanıt ver (Thread sahibi veya satıcı) ──
    @UseGuards(JwtGuard)
    @Post('reply')
    reply(@Request() req, @Body() dto: ReplyCommentDto) {
      return this.commentService.replyToComment(req.user.userId, dto);
    }
  
    // ── Ürün yorumlarını listele ──
    // Giriş yapmış kullanıcı varsa gizli yorumları da görebilir (yetki dahilinde)
    @Get('product/:productId')
    async getProductComments(
      @Param('productId') productId: string,
      @Query('viewerId') viewerId?: string,
    ) {
      return this.commentService.getProductComments(productId, viewerId);
    }
  
    // ── Auth'lu kullanıcı ile ürün yorumlarını listele (önerilen) ──
    @UseGuards(JwtGuard)
    @Get('product/:productId/auth')
    async getProductCommentsAuth(
      @Param('productId') productId: string,
      @Request() req,
    ) {
      return this.commentService.getProductComments(productId, req.user.userId);
    }
  
    // ── Yorum sil (Sadece yorum sahibi) ──
    @UseGuards(JwtGuard)
    @Delete(':id')
    delete(@Request() req, @Param('id') id: string) {
      return this.commentService.deleteComment(req.user.userId, id);
    }
  }