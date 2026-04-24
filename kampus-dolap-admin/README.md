#  Kampüs Dolap - Admin Paneli (Angular)

## Hızlı Başlangıç

```bash
cd kampus-dolap-admin
npm install
ng serve
```

Tarayıcıda `http://localhost:4200` adresini açın.

## Giriş Bilgileri

Backend'deki admin kullanıcısıyla giriş yapın:
- **Email:** `beyzanur.karacam@sakarya.edu.tr`
- **Şifre:** `admin123`

## Sayfalar

| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Giriş | `/login` | Admin giriş ekranı |
| Dashboard | `/dashboard` | İstatistikler, son kullanıcılar, son ürünler |
| Ürünler | `/products` | Onay bekleyen + tüm ürünler tablosu |
| Kullanıcılar | `/users` | Kullanıcı listesi, ban/premium yönetimi |
| Kategoriler | `/categories` | Kategori ekleme/düzenleme/silme |
| Üniversiteler | `/universities` | Üniversite listesi ve kampüs lokasyonları |
| Teklifler | `/offers` | Teklif durumları ve buluşma takibi |
| Mesajlar | `/chats` | Sohbet meta verileri |
| Ayarlar | `/settings` | Hesap ve uygulama ayarları |

## CORS Ayarı (Zorunlu)

Backend `main.ts` dosyasına ekleyin:

```typescript
app.enableCors({
  origin: ['http://localhost:4200'],
  credentials: true,
});
```

## Backend'e Eklenmesi Gereken Endpoint'ler

Detaylar için `BACKEND_ENDPOINTS.md` dosyasına bakın.
