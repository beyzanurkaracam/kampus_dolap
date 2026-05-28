import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { ProductController } from '../src/modules/product/product.controller';
import { ProductService } from '../src/modules/product/product.service';
import { JwtGuard } from '../src/modules/guards/jwt.guard';

/**
 * Product E2E Test
 *
 * Gerçek veritabanına bağlanmadan HTTP katmanını test eder.
 * - JwtGuard override edilir → sahte authenticated user enjekte edilir
 * - ProductService mock'lanır → DB bağımlılığı yok, CI'da çalışır
 *
 * Bu yaklaşım, controller'ın routing, guard ve response dönüşüm
 * mantığını izole bir şekilde doğrular.
 */
describe('ProductController (e2e)', () => {
  let app: INestApplication;

  // Sahte kullanıcı — guard tarafından req.user'a enjekte edilir
  const fakeUser = {
    userId: 'test-user-id',
    email: 'satici@ogr.sakarya.edu.tr',
    universityId: 'test-uni-id',
    role: 'USER',
  };

  // ProductService mock'u
  const mockProductService = {
    getAllActiveProducts: jest.fn(),
    getMyProducts: jest.fn(),
    createProduct: jest.fn(),
    getProductById: jest.fn(),
    deleteProduct: jest.fn(),
    getCategories: jest.fn(),
    markAsReserved: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    })
      // JwtGuard'ı sahte bir guard ile değiştir → her isteğe fakeUser ekle
      .overrideGuard(JwtGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = fakeUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────
  // GET /products — Listeleme
  // ───────────────────────────────────────────────────────────
  describe('GET /products', () => {
    it('aktif ürünleri listelemeli ve fiyatı number olarak dönmeli', async () => {
      mockProductService.getAllActiveProducts.mockResolvedValue([
        { id: 'p1', title: 'Laptop', price: '5000.00', status: 'active' },
        { id: 'p2', title: 'Kitap', price: '50.50', status: 'active' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toHaveLength(2);
      // Controller decimal → number dönüşümü yapıyor
      expect(response.body[0].price).toBe(5000);
      expect(response.body[1].price).toBe(50.5);
      expect(typeof response.body[0].price).toBe('number');
    });

    it('arama parametresi service\'e iletilmeli', async () => {
      mockProductService.getAllActiveProducts.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/products?search=laptop&minPrice=100')
        .expect(200);

      expect(mockProductService.getAllActiveProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'laptop', minPrice: '100' }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // POST /products/create — Oluşturma (auth gerekli)
  // ───────────────────────────────────────────────────────────
  describe('POST /products/create', () => {
    it('geçerli ürün oluşturmalı ve authenticated user bilgisini kullanmalı', async () => {
      const createdProduct = {
        id: 'new-product-id',
        title: 'Yeni Ürün',
        price: 250,
        status: 'pending',
      };
      mockProductService.createProduct.mockResolvedValue(createdProduct);

      const response = await request(app.getHttpServer())
        .post('/products/create')
        .send({
          title: 'Yeni Ürün',
          description: 'Açıklama',
          price: 250,
          categoryId: 1,
          condition: 'good',
        })
        .expect(201);

      expect(response.body.id).toBe('new-product-id');
      // Service, guard'ın enjekte ettiği userId + universityId ile çağrılmalı
      expect(mockProductService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Yeni Ürün', price: 250 }),
        fakeUser.userId,
        fakeUser.universityId,
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // GET /products/:id — Detay
  // ───────────────────────────────────────────────────────────
  describe('GET /products/:id', () => {
    it('ürün detayını dönmeli ve fiyatları number\'a çevirmeli', async () => {
      mockProductService.getProductById.mockResolvedValue({
        id: 'p1',
        title: 'Laptop',
        price: '5000.00',
        acceptedOfferPrice: '4500.00',
      });

      const response = await request(app.getHttpServer())
        .get('/products/p1')
        .expect(200);

      expect(response.body.price).toBe(5000);
      expect(response.body.acceptedOfferPrice).toBe(4500);
      // Service viewer (userId) ile çağrılmalı
      expect(mockProductService.getProductById).toHaveBeenCalledWith(
        'p1',
        fakeUser.userId,
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // DELETE /products/:id — Silme
  // ───────────────────────────────────────────────────────────
  describe('DELETE /products/:id', () => {
    it('sahibinin ürünü silinmeli', async () => {
      mockProductService.deleteProduct.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/products/p1')
        .expect(200);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith(
        'p1',
        fakeUser.userId,
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // PATCH /products/:id/reserve — Rezerve
  // ───────────────────────────────────────────────────────────
  describe('PATCH /products/:id/reserve', () => {
    it('ürünü rezerve durumuna geçirmeli', async () => {
      mockProductService.markAsReserved.mockResolvedValue({
        id: 'p1',
        status: 'reserved',
      });

      const response = await request(app.getHttpServer())
        .patch('/products/p1/reserve')
        .expect(200);

      expect(response.body.status).toBe('reserved');
      expect(mockProductService.markAsReserved).toHaveBeenCalledWith(
        'p1',
        fakeUser.userId,
      );
    });
  });
});