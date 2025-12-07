import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtGuard } from '../guards/jwt.guard';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

@Controller('upload')
export class UploadController {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    const region = this.configService.get<string>('AWS_REGION')!;
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')!;
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')!;
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME')!;

    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  @Post('image')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP)');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Dosya boyutu 5MB\'dan küçük olmalıdır');
    }

    const imageUrl = await this.uploadService.uploadFile(file, 'products');
    return { imageUrl };
  }

  @Post('avatar')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Sadece resim dosyaları yüklenebilir');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Profil fotoğrafı 2MB\'dan küçük olmalıdır');
    }

    const avatarUrl = await this.uploadService.uploadFile(file, 'avatars');
    return { avatarUrl };
  }

  @Post('images')
  @UseGuards(JwtGuard)
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadMultipleImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Dosya bulunamadı');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WebP)');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Her dosya 5MB\'dan küçük olmalıdır');
      }
    }

    const uploadPromises = files.map(file => this.uploadService.uploadFile(file, 'products'));
    const imageUrls = await Promise.all(uploadPromises);
    
    return { imageUrls };
  }

  @Get('proxy/:folder/:filename')
  async proxyImage(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const key = `${folder}/${filename}`;
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const s3Response = await this.s3Client.send(command);
      const stream = s3Response.Body as any;

      res.set('Content-Type', s3Response.ContentType || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000');
      
      stream.pipe(res);
    } catch (error) {
      console.error('Proxy error:', error);
      throw new NotFoundException('Resim bulunamadı');
    }
  }
}
