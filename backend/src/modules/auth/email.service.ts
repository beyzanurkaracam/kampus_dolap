import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Gmail SMTP ayarları (geliştirme ortamında console'a yazdırır)
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPass = this.configService.get('EMAIL_PASS');

    if (emailUser && emailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    } else {
      console.log('⚠️  Email yapılandırması bulunamadı. Kodlar console\'a yazdırılacak.');
    }
  }

  // 6 haneli rastgele kod üret
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Email gönder veya console'a yazdır
  async sendVerificationEmail(email: string, code: string, fullName: string): Promise<boolean> {
    // Eğer email yapılandırması yoksa console'a yazdır
    if (!this.transporter) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL DOĞRULAMA KODU');
      console.log('='.repeat(60));
      console.log(`Kullanıcı: ${fullName}`);
      console.log(`Email: ${email}`);
      console.log(`Doğrulama Kodu: ${code}`);
      console.log(`Geçerlilik: 10 dakika`);
      console.log('='.repeat(60) + '\n');
      return true;
    }

    // Email gönder
    try {
      await this.sendVerificationCode(email, code, fullName);
      return true;
    } catch (error) {
      console.error('Email gönderme hatası:', error.message);
      // Hata olursa yine de console'a yazdır
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  EMAIL GÖNDERİLEMEDİ - KONSOL KODU');
      console.log('='.repeat(60));
      console.log(`Kullanıcı: ${fullName}`);
      console.log(`Email: ${email}`);
      console.log(`Doğrulama Kodu: ${code}`);
      console.log('='.repeat(60) + '\n');
      return false;
    }
  }

  private async sendVerificationCode(email: string, code: string, fullName: string) {
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Dolap Kampüs - Email Doğrulama Kodu',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 50px auto;
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #4CAF50;
            }
            .header h1 {
              color: #4CAF50;
              margin: 0;
            }
            .content {
              padding: 30px 0;
              text-align: center;
            }
            .code {
              display: inline-block;
              background-color: #f0f0f0;
              border: 2px dashed #4CAF50;
              padding: 20px 40px;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #333;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Dolap Kampüs</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${fullName}!</h2>
              <p>Dolap Kampüs'e hoş geldiniz! Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
              <div class="code">${code}</div>
              <p>Bu kod <strong>10 dakika</strong> boyunca geçerlidir.</p>
              <div class="warning">
                <strong>⚠️ Güvenlik Uyarısı:</strong><br>
                Bu kodu kimseyle paylaşmayın. Dolap Kampüs ekibi size asla bu kodu sormaz.
              </div>
            </div>
            <div class="footer">
              <p>Bu e-postayı siz talep etmediyseniz lütfen göz ardı edin.</p>
              <p>&copy; 2025 Dolap Kampüs. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`✅ Doğrulama kodu ${email} adresine gönderildi`);
  }
}
