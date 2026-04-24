# Backend'e Eklenmesi Gereken Endpoint'ler

Bu dosya, Angular admin panelinin tam çalışması için NestJS backend'e eklenmesi gereken endpoint'leri ve örnek kodları içerir.

## 1. CORS Ayarı

`backend/src/main.ts` dosyasında `app.listen()` satırından ÖNCE:

```typescript
app.enableCors({
  origin: ['http://localhost:4200'],
  credentials: true,
});
```

---

## 2. Admin Controller'a Eklenecek Endpoint'ler

`backend/src/modules/admin/admin.controller.ts` dosyasına ekleyin:

```typescript
// ── KULLANICI YÖNETİMİ ──

@Get('users')
async getAllUsers() {
  return this.adminService.getAllUsers();
}

@Patch('users/:id/status')
async updateUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
  return this.adminService.updateUserStatus(id, body.isActive);
}

@Patch('users/:id/premium')
async updateUserPremium(@Param('id') id: string, @Body() body: { isPremium: boolean }) {
  return this.adminService.updateUserPremium(id, body.isPremium);
}

// ── KATEGORİ YÖNETİMİ ──

@Post('categories')
async createCategory(@Body() body: { name: string; description?: string; isActive?: boolean }) {
  return this.adminService.createCategory(body);
}

@Patch('categories/:id')
async updateCategory(@Param('id') id: number, @Body() body: any) {
  return this.adminService.updateCategory(id, body);
}

@Delete('categories/:id')
async deleteCategory(@Param('id') id: number) {
  return this.adminService.deleteCategory(id);
}

// ── ÜNİVERSİTE YÖNETİMİ ──

@Patch('universities/:id')
async updateUniversity(@Param('id') id: string, @Body() body: any) {
  return this.adminService.updateUniversity(id, body);
}

// ── KAMPÜS LOKASYONLARI ──

@Post('campus-locations')
async createCampusLocation(@Body() body: any) {
  return this.adminService.createCampusLocation(body);
}

@Delete('campus-locations/:id')
async deleteCampusLocation(@Param('id') id: string) {
  return this.adminService.deleteCampusLocation(id);
}

// ── TEKLİFLER ──

@Get('offers')
async getAllOffers() {
  return this.adminService.getAllOffers();
}

// ── SOHBETLER ──

@Get('chats')
async getAllChats() {
  return this.adminService.getAllChats();
}
```

---

## 3. Admin Service'e Eklenecek Metotlar

`backend/src/modules/admin/admin.service.ts` dosyasına ekleyin:

```typescript
// Önce import'ları güncelle:
import { University } from 'src/entities/university.entity';
import { Category } from 'src/entities/category.entity';
import { CampusLocation } from 'src/entities/campus-location.entity';
import { Offer } from 'src/entities/offer.entity';
import { Chat } from 'src/entities/chat.entity';

// Constructor'a repository'leri ekle:
constructor(
  @InjectRepository(User) private userRepository: Repository<User>,
  @InjectRepository(Product) private productRepository: Repository<Product>,
  @InjectRepository(Admin) private adminRepository: Repository<Admin>,
  @InjectRepository(University) private universityRepository: Repository<University>,
  @InjectRepository(Category) private categoryRepository: Repository<Category>,
  @InjectRepository(CampusLocation) private locationRepository: Repository<CampusLocation>,
  @InjectRepository(Offer) private offerRepository: Repository<Offer>,
  @InjectRepository(Chat) private chatRepository: Repository<Chat>,
) {}

// ── KULLANICI YÖNETİMİ ──

async getAllUsers() {
  return this.userRepository.find({
    relations: ['university'],
    order: { createdAt: 'DESC' },
  });
}

async updateUserStatus(userId: string, isActive: boolean) {
  await this.userRepository.update(userId, { isActive });
  return { message: isActive ? 'Kullanıcı aktif edildi' : 'Kullanıcı banlandı' };
}

async updateUserPremium(userId: string, isPremium: boolean) {
  const updateData: any = { isPremium };
  if (isPremium) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    updateData.premiumExpiresAt = expiresAt;
  } else {
    updateData.premiumExpiresAt = null;
  }
  await this.userRepository.update(userId, updateData);
  return { message: isPremium ? 'Premium aktif edildi' : 'Premium kaldırıldı' };
}

// ── KATEGORİ YÖNETİMİ ──

async createCategory(data: { name: string; description?: string; isActive?: boolean }) {
  const category = this.categoryRepository.create({
    name: data.name,
    description: data.description || '',
    isActive: data.isActive ?? true,
    order: 0,
  });
  return this.categoryRepository.save(category);
}

async updateCategory(id: number, data: any) {
  await this.categoryRepository.update(id, data);
  return this.categoryRepository.findOne({ where: { id } });
}

async deleteCategory(id: number) {
  await this.categoryRepository.delete(id);
  return { message: 'Kategori silindi' };
}

// ── ÜNİVERSİTE YÖNETİMİ ──

async updateUniversity(id: string, data: any) {
  await this.universityRepository.update(id, data);
  return this.universityRepository.findOne({ where: { id } });
}

// ── KAMPÜS LOKASYONLARI ──

async createCampusLocation(data: any) {
  const location = this.locationRepository.create({
    name: data.name,
    type: data.type || 'other',
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    universityId: data.universityId,
    isActive: true,
  });
  return this.locationRepository.save(location);
}

async deleteCampusLocation(id: string) {
  await this.locationRepository.delete(id);
  return { message: 'Lokasyon silindi' };
}

// ── TEKLİFLER ──

async getAllOffers() {
  return this.offerRepository.find({
    relations: ['product', 'product.seller', 'product.images', 'buyer', 'meetingPoint'],
    order: { createdAt: 'DESC' },
  });
}

// ── SOHBETLER ──

async getAllChats() {
  return this.chatRepository.find({
    relations: ['buyer', 'seller', 'product'],
    order: { updatedAt: 'DESC' },
  });
}
```

---

## 4. Admin Module'e Entity Import'ları

`backend/src/modules/admin/admin.module.ts` dosyasını güncelleyin:

```typescript
import { University } from 'src/entities/university.entity';
import { Category } from 'src/entities/category.entity';
import { CampusLocation } from 'src/entities/campus-location.entity';
import { Offer } from 'src/entities/offer.entity';
import { Chat } from 'src/entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Product, Admin,
      University, Category, CampusLocation, Offer, Chat  // ← YENİ
    ])
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

---

## Özet: Değişiklik Yapılacak Dosyalar

| Dosya | İşlem |
|-------|-------|
| `backend/src/main.ts` | CORS ekle |
| `backend/src/modules/admin/admin.module.ts` | Entity import'ları ekle |
| `backend/src/modules/admin/admin.controller.ts` | 10 yeni endpoint ekle |
| `backend/src/modules/admin/admin.service.ts` | 10 yeni metot ekle |
