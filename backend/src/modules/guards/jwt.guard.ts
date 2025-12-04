import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('JwtGuard canActivate çağrıldı');
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('Authorization header:', authHeader);
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      console.log('Token (ilk 50 karakter):', token?.substring(0, 50));
      console.log('JWT_SECRET:', process.env.JWT_SECRET);
    }
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
