// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { Admin } from 'src/entities/admin.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UniversityService } from '../university/university.service';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
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
    console.log('RegisterDto alındı2232:', registerDto);
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

    console.log('Verification token oluşturuldu:', { userId: savedUser.id, email: savedUser.email });

    return {
      access_token: token,
      user: {
        id: userWithUniversity.id,
        email: userWithUniversity.email,
        fullName: userWithUniversity.fullName,
        phone: userWithUniversity.phone,
        department: userWithUniversity.department,
        university: {
          id: userWithUniversity.university.id,
          name: userWithUniversity.university.name
        },
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

  async loginUser(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ 
      where: { email: loginDto.email },
      relations: ['university']
    });

    if (!user) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email veya şifre hatalı');
    }

    console.log('Login - JWT_SECRET:', process.env.JWT_SECRET);
    const token = this.jwtService.sign(
      { 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        universityId: user.universityId 
      }
    );

    console.log('Login token oluşturuldu:', { userId: user.id, email: user.email, tokenPreview: token.substring(0, 50) });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        department: user.department,
        university: {
          id: user.university.id,
          name: user.university.name,
          city: user.university.city,
        },
        role: user.role,
      },
    };
  }

  async loginAdmin(loginDto: LoginDto) {
    // Sadece beyzanur.karacam@sakarya.edu.tr ve admin123
    if (loginDto.email !== 'beyzanur.karacam@sakarya.edu.tr') {
      throw new UnauthorizedException('Admin email hatalı');
    }

    const admin = await this.adminRepository.findOne({ where: { email: loginDto.email } });

    if (!admin) {
      throw new UnauthorizedException('Admin bulunamadı');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Admin şifresi hatalı');
    }

    const token = this.jwtService.sign(
      { sub: admin.id, email: admin.email, role: 'ADMIN' },
      { expiresIn: '7d' },
    );

    return {
      access_token: token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: 'ADMIN',
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
    console.log('getUserProfile çağrıldı, userId:', userId);
    
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['university'],
    });

    console.log('Kullanıcı bulundu:', user ? 'Evet' : 'Hayır');

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return {
      fullName: user.fullName,
      email: user.email,
      department: user.department,
      phone: user.phone,
      university: {
        name: user.university.name,
        city: user.university.city,
      },
    };
  }
}