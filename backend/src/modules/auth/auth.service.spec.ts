import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { UniversityService } from '../university/university.service';
import { EmailService } from './email.service';

// ─────────────────────────────────────────────────────────────
// Mock factory'leri
// ─────────────────────────────────────────────────────────────
const mockUserRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

const mockUniversityService = () => ({
  findUniversityByEmail: jest.fn(),
  getDepartmentsByUniversityName: jest.fn(),
});

const mockEmailService = () => ({
  generateVerificationCode: jest.fn(),
  sendVerificationEmail: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: ReturnType<typeof mockJwtService>;
  let universityService: ReturnType<typeof mockUniversityService>;
  let emailService: ReturnType<typeof mockEmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: UniversityService, useFactory: mockUniversityService },
        { provide: EmailService, useFactory: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    universityService = module.get(UniversityService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('servis tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  // ───────────────────────────────────────────────────────────
  // validateUserEmail
  // ───────────────────────────────────────────────────────────
  describe('validateUserEmail', () => {
    it('geçerli .edu.tr email kabul edilmeli', async () => {
      await expect(
        service.validateUserEmail('ogrenci@ogr.sakarya.edu.tr'),
      ).resolves.toBe(true);
    });

    it('geçerli .ac.uk email kabul edilmeli', async () => {
      await expect(
        service.validateUserEmail('student@oxford.ac.uk'),
      ).resolves.toBe(true);
    });

    it('geçerli saf .edu email kabul edilmeli', async () => {
      await expect(
        service.validateUserEmail('student@harvard.edu'),
      ).resolves.toBe(true);
    });

    it('üniversite olmayan email reddedilmeli (gmail)', async () => {
      await expect(
        service.validateUserEmail('birisi@gmail.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('geçersiz formatlı email reddedilmeli', async () => {
      await expect(
        service.validateUserEmail('bozuk-email'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // registerUser
  // ───────────────────────────────────────────────────────────
  describe('registerUser', () => {
    const registerDto = {
      email: 'yeni@ogr.sakarya.edu.tr',
      password: 'GucluSifre123',
      fullName: 'Yeni Kullanıcı',
    };

    it('yeni kullanıcı için doğrulama kodu gönderilmeli', async () => {
      userRepository.findOne.mockResolvedValue(null); // Kullanıcı yok
      universityService.findUniversityByEmail.mockResolvedValue({
        id: 'uni-1',
        name: 'Sakarya Üniversitesi',
      } as any);
      emailService.generateVerificationCode.mockReturnValue('123456');
      emailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.registerUser(registerDto);

      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(result.email).toBe(registerDto.email);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        registerDto.email,
        '123456',
        registerDto.fullName,
      );
    });

    it('zaten kayıtlı email için hata fırlatmalı', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'mevcut' } as User);

      await expect(service.registerUser(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerUser(registerDto)).rejects.toThrow(
        'Bu email zaten kayıtlı',
      );
    });

    it('üniversite bulunamazsa hata fırlatmalı', async () => {
      userRepository.findOne.mockResolvedValue(null);
      universityService.findUniversityByEmail.mockResolvedValue(null);

      await expect(service.registerUser(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // verifyEmail
  // ───────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    const email = 'dogrula@ogr.sakarya.edu.tr';
    const registerDto = {
      email,
      password: 'GucluSifre123',
      fullName: 'Doğrulama Kullanıcı',
    };

    beforeEach(async () => {
      // Önce kullanıcıyı pending registration'a koy
      userRepository.findOne.mockResolvedValue(null);
      universityService.findUniversityByEmail.mockResolvedValue({
        id: 'uni-1',
        name: 'Sakarya Üniversitesi',
      } as any);
      emailService.generateVerificationCode.mockReturnValue('654321');
      emailService.sendVerificationEmail.mockResolvedValue(true);
      await service.registerUser(registerDto);
      jest.clearAllMocks();
    });

    it('doğru kod ile kullanıcı kaydedilmeli ve token dönmeli', async () => {
      const savedUser = {
        id: 'user-1',
        email,
        fullName: registerDto.fullName,
        role: 'USER',
        universityId: 'uni-1',
      };
      userRepository.save.mockResolvedValue(savedUser as User);
      userRepository.findOne.mockResolvedValue({
        ...savedUser,
        university: { id: 'uni-1', name: 'Sakarya Üniversitesi' },
        emailVerified: true,
      } as any);
      jwtService.sign.mockReturnValue('fake-jwt-token');

      const result = await service.verifyEmail(email, '654321');

      expect(result.access_token).toBe('fake-jwt-token');
      expect(result.user.email).toBe(email);
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('yanlış kod ile hata fırlatmalı', async () => {
      await expect(service.verifyEmail(email, '000000')).rejects.toThrow(
        'Geçersiz doğrulama kodu',
      );
    });

    it('bekleyen kayıt yoksa hata fırlatmalı', async () => {
      await expect(
        service.verifyEmail('olmayan@ogr.sakarya.edu.tr', '654321'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ───────────────────────────────────────────────────────────
  // login
  // ───────────────────────────────────────────────────────────
  describe('login', () => {
    const loginDto = {
      email: 'giris@ogr.sakarya.edu.tr',
      password: 'DogruSifre123',
    };

    it('doğru bilgilerle token dönmeli', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        password: hashedPassword,
        fullName: 'Giriş Kullanıcı',
        role: 'USER',
        universityId: 'uni-1',
        university: { id: 'uni-1', name: 'Sakarya Üniversitesi', city: 'Sakarya' },
      } as any);
      jwtService.sign.mockReturnValue('login-jwt-token');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('login-jwt-token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('yanlış şifre ile UnauthorizedException fırlatmalı', async () => {
      const hashedPassword = await bcrypt.hash('FarkliSifre', 10);
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        password: hashedPassword,
      } as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('olmayan kullanıcı ile UnauthorizedException fırlatmalı', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // validateToken
  // ───────────────────────────────────────────────────────────
  describe('validateToken', () => {
    it('geçerli token decode edilmeli', async () => {
      const payload = { sub: 'user-1', email: 'test@ogr.sakarya.edu.tr' };
      jwtService.verify.mockReturnValue(payload);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('geçersiz token UnauthorizedException fırlatmalı', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.validateToken('bozuk-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});