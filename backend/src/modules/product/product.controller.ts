import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductService } from './product.service';
import type { CreateProductDto } from './product.service';
import { JwtGuard } from '../guards/jwt.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Kategorileri getir
  @Get('categories')
  getCategories() {
    return this.productService.getCategories();
  }

  // Markaları getir
  @Get('brands')
  getBrands() {
    return this.productService.getBrands();
  }

  // Kategoriye göre markaları getir
  @Get('brands/:categoryId')
  getBrandsByCategory(@Param('categoryId') categoryId: string) {
    return this.productService.getBrandsByCategory(categoryId);
  }

  // Renkleri getir
  @Get('colors')
  getColors() {
    return this.productService.getColors();
  }

  // Kullanıcının ürünlerini getir
  @UseGuards(JwtGuard)
  @Get('my-products')
  async getMyProducts(@Request() req) {
    const products = await this.productService.getMyProducts(req.user.userId);
    console.log('my-products endpoint - Ürün sayısı:', products.length);
    if (products.length > 0) {
      console.log('İlk ürün:', {
        id: products[0].id,
        title: products[0].title,
        price: products[0].price,
        priceType: typeof products[0].price
      });
    }
    // Decimal to number conversion
    const transformed = products.map(p => ({
      ...p,
      price: p.price ? parseFloat(p.price.toString()) : 0
    }));
    return transformed;
  }

  // Yeni ürün ekle
  @UseGuards(JwtGuard)
  @Post('create')
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    try {
      console.log('Ürün oluşturma isteği alındı:', {
        dto: createProductDto,
        userId: req.user.userId,
        universityId: req.user.universityId
      });
      
      const product = await this.productService.createProduct(
        createProductDto,
        req.user.userId,
        req.user.universityId,
      );
      
      console.log('Ürün başarıyla oluşturuldu:', product.id);
      return product;
    } catch (error) {
      console.error('Ürün oluşturma hatası:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  // Ürünü sil
  @UseGuards(JwtGuard)
  @Delete(':id')
  deleteProduct(@Param('id') id: string, @Request() req) {
    return this.productService.deleteProduct(id, req.user.userId);
  }
}
