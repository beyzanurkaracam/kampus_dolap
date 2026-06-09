// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UniversityService } from '../university/university.service';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private universityService: UniversityService,
    private emailService: EmailService,
    
  ) {}

  async validateUserEmail(email: string): Promise<boolean> {
    // Üniversite email uzantısı kontrolü (.edu, .edu.tr, .ac.uk vb.)
    const emailPattern = /^[^\s@]+@[^\s@]+\.(edu|ac)\.[a-z]{2,}$/i;
    const eduPattern = /^[^\s@]+@[^\s@]+\.edu$/i;
    
    if (!emailPattern.test(email) && !eduPattern.test(email)) {
      throw new BadRequestException('Lütfen geçerli bir üniversite email adresi kullanınız (.edu, .edu.tr, .ac.uk vb.)');
    }
    return true;
  }

  async detectUniversityFromEmail(email: string) {
    try {
      await this.validateUserEmail(email);
      const university = await this.universityService.findUniversityByEmail(email);
      
      if (!university) {
        return {
          success: false,
          message: 'Bu email adresi için üniversite bulunamadı'
        };
      }

      // Bölümleri al
      const departments = this.universityService.getDepartmentsByUniversityName(university.name);

      return {
        success: true,
        university: {
          id: university.id,
          name: university.name,
          city: university.city,
          emailDomain: university.emailDomain,
        },
        departments: departments,
        departmentCount: departments.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Üniversite tespit edilemedi'
      };
    }
  }

  // Geçici kayıt verileri için cache (production'da Redis kullanılabilir)
  private pendingRegistrations = new Map<string, {
    registerDto: RegisterDto;
    verificationCode: string;
    verificationCodeExpiry: Date;
    universityId: string;
  }>();

  async registerUser(registerDto: RegisterDto) {
    await this.validateUserEmail(registerDto.email);
    const existingUser = await this.userRepository.findOne({ where: { email: registerDto.email } });

    if (existingUser) {
      throw new BadRequestException('Bu email zaten kayıtlı');
    }

    // Email'den üniversiteyi bul
    const university = await this.universityService.findUniversityByEmail(registerDto.email);

    if (!university) {
      throw new BadRequestException('Bu email adresi için üniversite bulunamadı. Lütfen geçerli bir üniversite email adresi kullanınız.');
    }

    // Doğrulama kodu oluştur
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10); // 10 dakika geçerli

    // Kullanıcı bilgilerini geçici olarak sakla (henüz veritabanına kaydetme)
    this.pendingRegistrations.set(registerDto.email, {
      registerDto,
      verificationCode,
      verificationCodeExpiry,
      universityId: university.id,
    });

    // Doğrulama kodunu email'e gönder (veya console'a yazdır)
    await this.emailService.sendVerificationEmail(
      registerDto.email,
      verificationCode,
      registerDto.fullName
    );

    return {
      success: true,
      message: 'Doğrulama kodu email adresinize gönderildi. Lütfen kodu girerek kaydınızı tamamlayın.',
      email: registerDto.email,
      requiresVerification: true
    };
  }

  async verifyEmail(email: string, code: string) {
    // Geçici kayıttan bilgileri al
    const pendingReg = this.pendingRegistrations.get(email);

    if (!pendingReg) {
      throw new BadRequestException('Bu email için bekleyen bir kayıt bulunamadı. Lütfen önce kayıt olun.');
    }

    // Kodu kontrol et
    if (pendingReg.verificationCode !== code) {
      throw new BadRequestException('Geçersiz doğrulama kodu');
    }

    // Süre kontrolü
    if (pendingReg.verificationCodeExpiry < new Date()) {
      // Süresi dolmuş kaydı sil
      this.pendingRegistrations.delete(email);
      throw new BadRequestException('Doğrulama kodunun süresi dolmuş. Lütfen tekrar kayıt olun.');
    }

    // Kod doğru - şimdi kullanıcıyı veritabanına kaydet
    const { registerDto, universityId } = pendingReg;
    
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = new User();
    user.email = registerDto.email;
    user.password = hashedPassword;
    user.fullName = registerDto.fullName;


    
    if (registerDto.department) user.department = registerDto.department;
    if (registerDto.phone) user.phone = registerDto.phone;
    user.universityId = universityId;
    user.role = 'USER'; // Tüm kullanıcılar admin olarak kaydoluyor
    user.emailVerified = true; // Email doğrulandı
    user.verificationCode = null as any;
    user.verificationCodeExpiry = null as any;

    const savedUser = await this.userRepository.save(user);

    // Geçici kaydı sil
    this.pendingRegistrations.delete(email);

    // İlişkiyle birlikte kullanıcıyı yükle
    const userWithUniversity = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['university']
    });

    if (!userWithUniversity) {
      throw new BadRequestException('Kullanıcı bilgileri alınamadı');
    }

    // Token oluştur
    const token = this.jwtService.sign(
      { 
        sub: savedUser.id, 
        email: savedUser.email, 
        role: savedUser.role,
        universityId: savedUser.universityId 
      },
      { expiresIn: '7d' },
    );


    return {
      access_token: token,
      user: {
        id: userWithUniversity.id,
        email: userWithUniversity.email,
        fullName: userWithUniversity.fullName,
        phone: userWithUniversity.phone,
        department: userWithUniversity.department,
        university: userWithUniversity.university ? {
          id: userWithUniversity.university.id,
          name: userWithUniversity.university.name
        } : null,
        emailVerified: userWithUniversity.emailVerified,
        role: userWithUniversity.role
      },
      message: 'Email başarıyla doğrulandı! Hesabınız oluşturuldu.'
    };
  }

  async resendVerificationCode(email: string) {
    const pendingReg = this.pendingRegistrations.get(email);

    if (!pendingReg) {
      throw new BadRequestException('Bu email için bekleyen bir kayıt bulunamadı. Lütfen önce kayıt olun.');
    }

    // Yeni kod oluştur
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationCodeExpiry = new Date();
    verificationCodeExpiry.setMinutes(verificationCodeExpiry.getMinutes() + 10);

    // Geçici kayıttaki kodu güncelle
    pendingReg.verificationCode = verificationCode;
    pendingReg.verificationCodeExpiry = verificationCodeExpiry;
    this.pendingRegistrations.set(email, pendingReg);

    // Yeni kodu gönder
    await this.emailService.sendVerificationEmail(
      email,
      verificationCode,
      pendingReg.registerDto.fullName
    );

    return {
      success: true,
      message: 'Yeni doğrulama kodu email adresinize gönderildi'
    };
  }

  async login(loginDto: LoginDto) {
    // Check User table first (handles both USER and ADMIN roles)
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['university']
    });

    if (user) {
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email veya şifre hatalı');
      }

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        universityId: user.universityId
      });

      return {
        access_token: token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          profilePhoto: user.profilePhoto,
          isPremium: user.isPremium,
          department: user.department,
          university: user.university ? {
            id: user.university.id,
            name: user.university.name,
            city: user.university.city,
          } : null,
          role: user.role,
        },
      };
    }

    throw new UnauthorizedException('Email veya şifre hatalı');
  }

  // Web admin paneli girişi: normal login ile aynı kimlik doğrulamasını yapar
  // ancak yalnızca ADMIN rolündeki kullanıcılara token verir. USER rolündeki
  // bir kullanıcı doğru şifreyle bile panele giremez (403 döner).
  async adminLogin(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['university'],
    });

    if (!user) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Bu panele erişim yetkiniz yok');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      universityId: user.universityId,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Geçersiz token');
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['university'],
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      firstName: user.fullName?.split(' ')[0] || '',
      lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
      role: user.role,
      department: user.department,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      isPremium: user.isPremium,
      university: user.university ? {
        id: user.university.id,
        name: user.university.name,
        city: user.university.city,
      } : null,
    };
  }

  async updateUserProfile(userId: string, updateData: { fullName?: string; phone?: string; profilePhoto?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.profilePhoto) user.profilePhoto = updateData.profilePhoto;

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profil güncellendi',
      profilePhoto: user.profilePhoto,
    };
  }

  async saveFcmToken(userId: string, token: string) {
    await this.userRepository.update(userId, { fcmToken: token });
    return { success: true, message: 'Bildirim tokenı güncellendi' };
  }

  async getFullProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['university'],
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    // Password ve hassas alanları çıkar, güvenli veriyi döndür
    const { password, verificationCode, verificationCodeExpiry, fcmToken, ...safeUser } = user;
    
    return {
      ...safeUser,
      firstName: user.fullName?.split(' ')[0] || '',
      lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
    };
  }
}
