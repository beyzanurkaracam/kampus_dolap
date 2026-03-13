import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtGuard } from '../../modules/guards/jwt.guard';

@Controller('users') // Endpointler /users/... altında olsun
@UseGuards(JwtGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':id/follow')
  follow(@Request() req, @Param('id') targetId: string) {
    return this.followService.followUser(req.user.userId, targetId);
  }

  @Delete(':id/unfollow')
  unfollow(@Request() req, @Param('id') targetId: string) {
    return this.followService.unfollowUser(req.user.userId, targetId);
  }

  @Get(':id/followers')
  getFollowers(@Param('id') userId: string) {
    return this.followService.getFollowers(userId);
  }

  @Get(':id/following')
  getFollowing(@Param('id') userId: string) {
    return this.followService.getFollowing(userId);
  }

  @Get(':id/is-following')
  checkIsFollowing(@Request() req, @Param('id') targetId: string) {
    return this.followService.checkIsFollowing(req.user.userId, targetId);
  }
  
  @Get(':id/follow-stats')
  getStats(@Param('id') userId: string) {
      return this.followService.getFollowStats(userId);
  }
}