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
    const fileName = `${folder}/${uuidv4()}.jpg`;
  
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg',
    });
  
    try {
      console.log(`📤 S3 Yüklemesi Başlıyor: ${fileName}`); 
      await this.s3Client.send(command);
      console.log(`✅ S3 Yüklemesi Başarılı!`); 
      
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
      const s3DirectUrl = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${fileName}`;
      
      if (isDevelopment) {
        const [folderName, fileNameOnly] = fileName.split('/');
        
        // 👇 iOS 'localhost'u anlar. Android frontend tarafında bunu algılayıp değiştirir.
        // NOT: Backend global prefix 'api' kullandığı için proxy yolu /api ile başlamalı.
        const proxyUrl = `http://localhost:3000/api/upload/proxy/${folderName}/${fileNameOnly}`;
        
        console.log(`🔗 Development Mode: Proxy URL döndürülüyor -> ${proxyUrl}`); 
        return proxyUrl;
      } else {
        console.log(`🔗 Production Mode: Direct URL döndürülüyor -> ${s3DirectUrl}`); 
        return s3DirectUrl;
      }
    } catch (error) {
      console.error(' S3 Yükleme Hatası:', error);
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
