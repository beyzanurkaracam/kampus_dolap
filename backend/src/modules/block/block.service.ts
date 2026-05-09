import {
  Injectable,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedUser } from '../../entities/blocked-user.entity';
import { OfferService } from '../offer/offer.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockRepo: Repository<BlockedUser>,
    @Inject(forwardRef(() => OfferService))
    private readonly offerService: OfferService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async isEitherBlocked(userAId: string, userBId: string): Promise<boolean> {
    const found = await this.blockRepo.findOne({
      where: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    });
    return !!found;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<{ message: string }> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Kendinizi engelleyemezsiniz.');
    }

    const exists = await this.blockRepo.findOne({ where: { blockerId, blockedId } });
    if (exists) {
      return { message: 'Kullanıcı zaten engelli.' };
    }

    await this.blockRepo.save(this.blockRepo.create({ blockerId, blockedId }));

    // Aralarındaki aktif teklifleri iptal et.
    await this.offerService.cancelActiveBetween(blockerId, blockedId);

    // Aktif chat'lerin "ilk mesaj" kapısını kapat → yeni mesaj akışı durdurulur.
    await this.chatService.lockChatBetween(blockerId, blockedId);

    return { message: 'Kullanıcı engellendi.' };
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<{ message: string }> {
    const found = await this.blockRepo.findOne({ where: { blockerId, blockedId } });
    if (!found) throw new NotFoundException('Engelli kullanıcı bulunamadı.');
    await this.blockRepo.delete(found.id);
    return { message: 'Engel kaldırıldı.' };
  }

  async listBlocked(blockerId: string) {
    return this.blockRepo.find({
      where: { blockerId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });
  }
}
