import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Admin } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3000'], // Angular/React uygulamanın çalıştığı port
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  
  // Admin kullanıcısını oluştur
  const dataSource = app.get(DataSource);
  const adminRepository = dataSource.getRepository(Admin);
  
  const adminEmail = process.env.ADMIN_EMAIL || 'beyzanur.karacam@sakarya.edu.tr';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  const existingAdmin = await adminRepository.findOne({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await adminRepository.save({
      email: adminEmail,
      password: hashedPassword,
    });
    console.log(' Admin kullanıcısı oluşturuldu:', adminEmail);
  } else {
    console.log('  Admin kullanıcısı zaten mevcut');
  }
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(` Uygulama http://localhost:${process.env.PORT ?? 3000} adresinde çalışıyor`);
}
bootstrap();