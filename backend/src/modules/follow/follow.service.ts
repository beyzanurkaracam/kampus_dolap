import {
    Injectable,
    BadRequestException,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Follow } from '../../entities/follow.entity';
  import { User } from '../../entities/user.entity';
  
  @Injectable()
  export class FollowService {
    constructor(
      @InjectRepository(Follow)
      private followRepository: Repository<Follow>,
      @InjectRepository(User)
      private userRepository: Repository<User>,
    ) {}
  
    // 1. Takip Et
    async followUser(followerId: string, targetUserId: string) {
      if (followerId === targetUserId) {
        throw new BadRequestException('Kendinizi takip edemezsiniz.');
      }
  
      // Hedef kullanıcı var mı?
      const targetUser = await this.userRepository.findOne({
        where: { id: targetUserId },
      });
      if (!targetUser) throw new NotFoundException('Kullanıcı bulunamadı.');
  
      // Zaten takip ediyor muyum?
      const existingFollow = await this.followRepository.findOne({
        where: { followerId, followingId: targetUserId },
      });
  
      if (existingFollow) {
        throw new BadRequestException('Zaten bu kullanıcıyı takip ediyorsunuz.');
      }
  
      // Kayıt oluştur
      const follow = this.followRepository.create({
        followerId,
        followingId: targetUserId,
      });
  
      await this.followRepository.save(follow);
      return { message: 'Kullanıcı takip edildi.', isFollowing: true };
    }
  
    // 2. Takipten Çık (Unfollow)
    async unfollowUser(followerId: string, targetUserId: string) {
      const follow = await this.followRepository.findOne({
        where: { followerId, followingId: targetUserId },
      });
  
      if (!follow) {
        throw new BadRequestException('Zaten bu kullanıcıyı takip etmiyorsunuz.');
      }
  
      await this.followRepository.remove(follow);
      return { message: 'Takipten çıkıldı.', isFollowing: false };
    }
  
    // 3. Takipçileri Getir (Followers) - Beni kimler takip ediyor?
    async getFollowers(userId: string) {
      const follows = await this.followRepository.find({
        where: { followingId: userId },
        relations: ['follower'], // Takip eden kişinin bilgilerini getir
        order: { createdAt: 'DESC' },
      });
  
      // Sadece user objelerini dönmek daha temiz olur
      return follows.map((f) => ({
        ...f.follower,
        followedAt: f.createdAt, // Takip tarihini de ekleyelim
      }));
    }
  
    // 4. Takip Ettiklerimi Getir (Following) - Ben kimleri takip ediyorum?
    async getFollowing(userId: string) {
      const follows = await this.followRepository.find({
        where: { followerId: userId },
        relations: ['following'], // Takip edilen kişinin bilgilerini getir
        order: { createdAt: 'DESC' },
      });
  
      return follows.map((f) => ({
        ...f.following,
        followedAt: f.createdAt,
      }));
    }
  
    // 5. Takip Durumu Kontrolü (Profil sayfasında buton rengi için)
    async checkIsFollowing(followerId: string, targetUserId: string) {
      const count = await this.followRepository.count({
        where: { followerId, followingId: targetUserId },
      });
      return { isFollowing: count > 0 };
    }
    
    // 6. Takipçi Sayılarını Getir (Profilde göstermek için)
    async getFollowStats(userId: string) {
        const followersCount = await this.followRepository.count({ where: { followingId: userId } });
        const followingCount = await this.followRepository.count({ where: { followerId: userId } });
        
        return {
            followers: followersCount,
            following: followingCount
        };
    }
  }