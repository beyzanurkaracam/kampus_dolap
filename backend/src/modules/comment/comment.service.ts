// backend/src/modules/comment/comment.service.ts

import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, IsNull } from 'typeorm';
  import { Comment } from '../../entities/comment.entity';
  import { Product } from '../../entities/product.entity';
  import { User } from '../../entities/user.entity';
  import { RedisService } from '../redis/redis.service';
  import { EmailService } from '../auth/email.service';
  import { NotificationType } from '../../entities/notification.entity';    
  import { CreateCommentDto } from './dto/create-comment.dto';
  import { ReplyCommentDto } from './dto/reply-comment.dto';
import { NotificationService } from '../notification/notification.service';
  
  // ── KÜFÜR / KARA LİSTE KELİMELERİ ──
  const BLACKLISTED_WORDS = [
    'bok', 'sik', 'amk', 'orospu', 'piç', 'gerizekalı',
    'salak', 'aptal', 'mal', 'dangalak', 'hıyar', 'göt',
    'yavşak', 'şerefsiz', 'kaltak', 'pezevenk',
  ];
  
  @Injectable()
  export class CommentService {
    private readonly MAX_COMMENTS_PER_MINUTE = 3;
  
    constructor(
      @InjectRepository(Comment)
      private commentRepository: Repository<Comment>,
      @InjectRepository(Product)
      private productRepository: Repository<Product>,
      @InjectRepository(User)
      private userRepository: Repository<User>,
      private redisService: RedisService,
      private emailService: EmailService,
      private notificationService: NotificationService, // ✅ YENİ
    ) {}
  
    // ═══════════════════════════════════════════════════════════
    // 1. YENİ ANA YORUM OLUŞTUR (Alıcı → Ürüne soru/yorum)
    // ═══════════════════════════════════════════════════════════
    async createComment(userId: string, dto: CreateCommentDto): Promise<Comment> {
      await this.checkRateLimit(userId);
  
      const product = await this.productRepository.findOne({
        where: { id: dto.productId },
        relations: ['seller'],
      });
      if (!product) throw new NotFoundException('Ürün bulunamadı.');
      if (product.status === 'sold')
        throw new BadRequestException('Satılmış ürünlere yorum yapılamaz.');
  
      if (product.sellerId === userId)
        throw new BadRequestException('Kendi ürününüze yorum yapamazsınız. Gelen yorumlara yanıt verebilirsiniz.');
  
      const sanitizedContent = this.filterContent(dto.content);
  
      const comment = this.commentRepository.create({
        content: sanitizedContent,
        productId: dto.productId,
        authorId: userId,
        threadStarterId: userId,
        sellerId: product.sellerId,
        isPublic: false,
      });
  
      const saved = await this.commentRepository.save(comment);
  
      // ✅ YENİ: Veritabanına bildirim kaydı at (Satıcıya)
      const commentAuthor = await this.userRepository.findOne({ where: { id: userId } });
      this.notificationService.createNotification({
        recipientId: product.sellerId,
        senderId: userId,
        type: NotificationType.COMMENT,
        title: 'Yeni Yorum',
        message: `${commentAuthor?.fullName || 'Birisi'} "${product.title}" ürününe yorum yaptı: "${sanitizedContent.substring(0, 80)}${sanitizedContent.length > 80 ? '...' : ''}"`,
        referenceId: product.id,
        referenceType: 'product',
      }).catch(err => console.error('Bildirim oluşturma hatası:', err));
  
      // Email bildirimi (fire-and-forget, mevcut sistem)
      this.sendNotificationEmail(
        product.seller,
        userId,
        product.title,
        'Ürününüze yeni bir soru/yorum yapıldı.',
      );
  
      return this.commentRepository.findOne({
        where: { id: saved.id },
        relations: ['author', 'replies', 'replies.author'],
      }) as Promise<Comment>;
    }
  
    // ═══════════════════════════════════════════════════════════
    // 2. YANIT VER (Sadece thread sahibi + satıcı yazabilir)
    // ═══════════════════════════════════════════════════════════
    async replyToComment(userId: string, dto: ReplyCommentDto): Promise<Comment> {
      await this.checkRateLimit(userId);
  
      const parentComment = await this.commentRepository.findOne({
        where: { id: dto.parentId },
        relations: ['product', 'product.seller'],
      });
      if (!parentComment) throw new NotFoundException('Yanıt verilecek yorum bulunamadı.');
  
      if (parentComment.product.status === 'sold')
        throw new BadRequestException('Satılmış ürünlere yanıt verilemez.');
  
      const rootComment = parentComment.parentId
        ? await this.findRootComment(parentComment)
        : parentComment;
  
      const isThreadStarter = userId === rootComment.threadStarterId;
      const isSeller = userId === rootComment.sellerId;
  
      if (!isThreadStarter && !isSeller) {
        throw new ForbiddenException(
          'Bu yorum silsilesine sadece soruyu soran kişi ve ürün sahibi yanıt verebilir.',
        );
      }
  
      const sanitizedContent = this.filterContent(dto.content);
  
      const shouldMakePublic = isSeller && !rootComment.isPublic;
  
      const reply = this.commentRepository.create({
        content: sanitizedContent,
        productId: rootComment.productId,
        authorId: userId,
        threadStarterId: rootComment.threadStarterId,
        sellerId: rootComment.sellerId,
        parentId: dto.parentId,
        isPublic: shouldMakePublic ? true : rootComment.isPublic,
      });
  
      const savedReply = await this.commentRepository.save(reply);
  
      if (shouldMakePublic) {
        await this.makeThreadPublic(rootComment.id);
      }
  
      // ✅ YENİ: Karşı tarafa bildirim gönder
      const recipientId = userId === rootComment.sellerId
        ? rootComment.threadStarterId
        : rootComment.sellerId;
  
      const replyAuthor = await this.userRepository.findOne({ where: { id: userId } });
  
      this.notificationService.createNotification({
        recipientId,
        senderId: userId,
        type: NotificationType.COMMENT_REPLY,
        title: isSeller ? 'Satıcı Yanıt Verdi' : 'Yeni Yanıt',
        message: `${replyAuthor?.fullName || 'Birisi'} "${parentComment.product.title}" ürünündeki yorumunuza yanıt verdi: "${sanitizedContent.substring(0, 80)}${sanitizedContent.length > 80 ? '...' : ''}"`,
        referenceId: parentComment.product.id,
        referenceType: 'product',
      }).catch(err => console.error('Yanıt bildirim hatası:', err));
  
      // Email bildirimi
      const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
      if (recipient) {
        const product = parentComment.product;
        this.sendNotificationEmail(
          recipient,
          userId,
          product.title,
          isSeller
            ? 'Satıcı sorunuza yanıt verdi.'
            : 'Alıcı yorumunuza yanıt gönderdi.',
        );
      }
  
      return this.commentRepository.findOne({
        where: { id: savedReply.id },
        relations: ['author'],
      }) as Promise<Comment>;
    }
  
    // ═══════════════════════════════════════════════════════════
    // 3. ÜRÜN YORUMLARINI LİSTELE (Gizlilik kuralına uygun)
    // ═══════════════════════════════════════════════════════════
    async getProductComments(
      productId: string,
      viewerId?: string,
    ): Promise<any[]> {
      const rootComments = await this.commentRepository.find({
        where: { productId, parentId: IsNull() },
        relations: ['author', 'replies', 'replies.author', 'replies.replies', 'replies.replies.author'],
        order: { createdAt: 'DESC' },
      });
  
      return rootComments
        .filter((comment) => {
          if (comment.isPublic) return true;
          if (!viewerId) return false;
          return viewerId === comment.threadStarterId || viewerId === comment.sellerId;
        })
        .map((comment) => this.formatCommentResponse(comment, viewerId));
    }
  
    // ═══════════════════════════════════════════════════════════
    // 4. YORUM SİL
    // ═══════════════════════════════════════════════════════════
    async deleteComment(userId: string, commentId: string): Promise<{ message: string }> {
      const comment = await this.commentRepository.findOne({
        where: { id: commentId },
      });
  
      if (!comment) throw new NotFoundException('Yorum bulunamadı.');
      if (comment.authorId !== userId)
        throw new ForbiddenException('Sadece kendi yorumunuzu silebilirsiniz.');
  
      await this.commentRepository.remove(comment);
  
      return { message: 'Yorum başarıyla silindi.' };
    }
  
    // ═══════════════════════════════════════════════════════════
    //                  YARDIMCI METOTLAR
    // ═══════════════════════════════════════════════════════════
  
    private async findRootComment(comment: Comment): Promise<Comment> {
      if (!comment.parentId) return comment;
      const parent = await this.commentRepository.findOne({
        where: { id: comment.parentId },
      });
      if (!parent) return comment;
      return this.findRootComment(parent);
    }
  
    private async makeThreadPublic(rootCommentId: string): Promise<void> {
      await this.commentRepository.update(rootCommentId, { isPublic: true });
      const children = await this.commentRepository.find({
        where: { parentId: rootCommentId },
      });
      for (const child of children) {
        await this.commentRepository.update(child.id, { isPublic: true });
        await this.makeThreadPublic(child.id);
      }
    }
  
    private async checkRateLimit(userId: string): Promise<void> {
      const key = `comment_rate:${userId}`;
      const count = await this.redisService.incr(key);
      if (count === 1) {
        await this.redisService.expire(key, 60);
      }
      if (count > this.MAX_COMMENTS_PER_MINUTE) {
        const ttl = await this.redisService.ttl(key);
        throw new BadRequestException(
          `Çok sık yorum yapıyorsunuz. Lütfen ${ttl} saniye bekleyin.`,
        );
      }
    }
  
    private filterContent(content: string): string {
      let filtered = content;
      for (const word of BLACKLISTED_WORDS) {
        const regex = new RegExp(word, 'gi');
        filtered = filtered.replace(regex, '***');
      }
      return filtered.trim();
    }
  
    private async sendNotificationEmail(
      recipient: User,
      senderUserId: string,
      productTitle: string,
      message: string,
    ): Promise<void> {
      try {
        if (!recipient?.email) return;
        const recipientName = recipient.fullName || 'Kullanıcı';
  
        if ((this.emailService as any).transporter) {
          await (this.emailService as any).transporter.sendMail({
            to: recipient.email,
            subject: `Kampüs Dolap - ${productTitle} için yeni yorum`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Merhaba ${recipientName},</h2>
                <p><strong>"${productTitle}"</strong> ürününde yeni bir gelişme var:</p>
                <p style="background: #f0f8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #007AFF;">
                  ${message}
                </p>
                <p>Uygulamayı açarak detayları görebilirsiniz.</p>
                <hr/>
                <p style="color: #999; font-size: 12px;">Kampüs Dolap Ekibi</p>
              </div>
            `,
          });
        } else {
          console.log('\n' + '='.repeat(50));
          console.log('📧 YORUM BİLDİRİM E-POSTASI');
          console.log('='.repeat(50));
          console.log(`Alıcı: ${recipient.email} (${recipientName})`);
          console.log(`Ürün: ${productTitle}`);
          console.log(`Mesaj: ${message}`);
          console.log('='.repeat(50) + '\n');
        }
      } catch (error) {
        console.error('Yorum bildirim email hatası:', error);
      }
    }
  
    private formatCommentResponse(comment: Comment, viewerId?: string): any {
      return {
        id: comment.id,
        content: comment.content,
        isPublic: comment.isPublic,
        createdAt: comment.createdAt,
        author: comment.author
          ? {
              id: comment.author.id,
              fullName: comment.author.fullName,
              profilePhoto: comment.author.profilePhoto,
            }
          : null,
        threadStarterId: comment.threadStarterId,
        sellerId: comment.sellerId,
        parentId: comment.parentId,
        canReply:
          !!viewerId &&
          (viewerId === comment.threadStarterId || viewerId === comment.sellerId),
        canDelete: !!viewerId && viewerId === comment.authorId,
        replies: (comment.replies || [])
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((r) => this.formatCommentResponse(r, viewerId)),
      };
    }
  }