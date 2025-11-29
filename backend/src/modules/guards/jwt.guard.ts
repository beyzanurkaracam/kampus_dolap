import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('JwtGuard canActivate çağrıldı');
    const request = context.switchToHttp().getRequest();
    console.log('Authorization header:', request.headers.authorization);
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log('JwtGuard handleRequest çağrıldı');
    console.log('err:', err);
    console.log('user:', user);
    console.log('info:', info);
    
    if (err || !user) {
      console.log('JwtGuard: Authentication failed!');
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
