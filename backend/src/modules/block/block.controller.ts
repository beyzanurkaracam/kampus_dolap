import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { BlockService } from './block.service';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('blocks')
@UseGuards(JwtGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':userId')
  block(@Request() req, @Param('userId') userId: string) {
    return this.blockService.blockUser(req.user.userId, userId);
  }

  @Delete(':userId')
  unblock(@Request() req, @Param('userId') userId: string) {
    return this.blockService.unblockUser(req.user.userId, userId);
  }

  @Get()
  list(@Request() req) {
    return this.blockService.listBlocked(req.user.userId);
  }
}
