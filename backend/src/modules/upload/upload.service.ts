import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION') || 'eu-central-1';
    const bucketName = this.configService.get<string>('AWS_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('AWS credentials are not configured properly');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.bucketName = bucketName;
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'products'): Promise<string> {
    const fileName = `${folder}/${uuidv4()}.jpg`; // Her zaman jpg olarak kaydet

    // Resmi optimize et: max 1200px genişlik, 80% kalite, WebP formatı
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true // Küçük resimleri büyütme
      })
      .jpeg({ quality: 80 }) // JPEG 80% kalite
      .toBuffer();

    console.log(`📦 Resim optimize edildi: ${(file.size / 1024).toFixed(2)}KB → ${(optimizedBuffer.length / 1024).toFixed(2)}KB`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg',
    });

    try {
      await this.s3Client.send(command);
      
      // Environment'a göre URL döndür
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
      const s3DirectUrl = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileName}`;
      
      if (isDevelopment) {
        // Development: Local proxy URL (Android emulator DNS sorunu için)
        const [folderName, fileNameOnly] = fileName.split('/');
        const proxyUrl = `http://10.0.2.2:3000/upload/proxy/${folderName}/${fileNameOnly}`;
        console.log(`🔗 Development mode - Proxy URL: ${proxyUrl}`);
        return proxyUrl;
      } else {
        // Production: Direct S3 URL
        console.log(`🔗 Production mode - S3 URL: ${s3DirectUrl}`);
        return s3DirectUrl;
      }
    } catch (error) {
      console.error('S3 upload hatası:', error);
      throw new Error('Dosya yüklenirken hata oluştu');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // URL'den key'i çıkar
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // başındaki / karakterini kaldır

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('S3 delete hatası:', error);
      throw new Error('Dosya silinirken hata oluştu');
    }
  }
}
