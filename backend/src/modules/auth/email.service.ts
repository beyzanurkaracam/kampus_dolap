import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      //  PLANLANAN RESEND SMTP ENTEGRASYONU
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true, // 465 portu için true, SSL/TLS bağlantısı
        auth: {
          user: 'resend', // Resend SMTP altyapısında kullanıcı adı her zaman sabittir.
          pass: resendApiKey, // Şifre olarak ürettiğimiz API Key'i veriyoruz.
        },
      });
      console.log(' Resend SMTP bağlantısı başarıyla yapılandırıldı.');
    } else {
      console.log('⚠️ Resend API anahtarı (RESEND_API_KEY) bulunamadı. Kodlar console\'a yazdırılacak.');
    }
  }

  // 6 haneli rastgele kod üret
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Email gönder veya console'a yazdır
  async sendVerificationEmail(email: string, code: string, fullName: string): Promise<boolean> {
    if (!this.transporter) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL DOĞRULAMA KODU (DEVELOPMENT MODE)');
      console.log('='.repeat(60));
      console.log(`Kullanıcı: ${fullName}`);
      console.log(`Email: ${email}`);
      console.log(`Doğrulama Kodu: ${code}`);
      console.log(`Geçerlilik: 10 dakika`);
      console.log('='.repeat(60) + '\n');
      return true;
    }

    try {
      await this.sendVerificationCode(email, code, fullName);
      return true;
    } catch (error) {
      console.error(' Resend e-posta gönderme hatası:', error.message);
      // Canlıda hata olsa bile yerelde log düşmesi için yedek koruma
      console.log('\n' + '='.repeat(60));
      console.log('⚠️ EMAIL GÖNDERİLEMEDİ - KONSOL KODU');
      console.log('='.repeat(60));
      console.log(`Kullanıcı: ${fullName}`);
      console.log(`Email: ${email}`);
      console.log(`Doğrulama Kodu: ${code}`);
      console.log('='.repeat(60) + '\n');
      return false;
    }
  }

  private async sendVerificationCode(email: string, code: string, fullName: string) {
    const fromEmail = this.configService.get('EMAIL_FROM') || 'no-reply@kampusumden.online';

    const mailOptions = {
      from: `Kampüsümden <${fromEmail}>`, // Gönderici maskelemesi
      to: email,
      subject: 'Kampüsümden - Email Doğrulama Kodu',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 50px auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #007AFF; }
            .header h1 { color: #007AFF; margin: 0; }
            .content { padding: 30px 0; text-align: center; }
            .code { display: inline-block; background-color: #f0f0f0; border: 2px dashed #007AFF; padding: 20px 40px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; color: #856404; text-align: left; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Kampüsümden</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${fullName}!</h2>
              <p>Kampüsümden dünyasına hoş geldiniz! Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
              <div class="code">${code}</div>
              <p>Bu kod <strong>10 dakika</strong> boyunca geçerlidir.</p>
              <div class="warning">
                <strong>⚠️ Güvenlik Uyarısı:</strong><br>
                Bu kodu kimseyle paylaşmayın. Kampüsümden ekibi size asla bu kodu sormaz.
              </div>
            </div>
            <div class="footer">
              <p>Bu e-postayı siz talep etmediyseniz lütfen göz ardı edin.</p>
              <p>&copy; 2026 Kampüsümden. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(` Doğrulama kodu ${email} adresine Resend SMTP ile başarıyla gönderildi.`);
  }
}