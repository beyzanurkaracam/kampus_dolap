import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from 'src/entities/university.entity';
import * as bolumlerData from './bolumler.json';
import * as universityData from './university.json';

export interface UniversityApiData {
  name: string;
  domains: string[];
  web_pages: string[];
  country: string;
  alpha_two_code: string;
  'state-province': string | null;
}

@Injectable()
export class UniversityService implements OnModuleInit {
  private universitiesCache: UniversityApiData[] = [];

  constructor(
    @InjectRepository(University)
    private universityRepository: Repository<University>,
  ) {}

  async onModuleInit() {
    // Uygulama başladığında üniversiteleri yükle
    await this.loadUniversitiesFromJson();
  }

  async loadUniversitiesFromJson() {
    try {
      // Direkt JSON dosyasından yükle (zaten sadece Türk üniversiteleri var)
      // TypeScript JSON import bazen object olarak gelir, array'e çevir
      const data = universityData as any;
      this.universitiesCache = Array.isArray(data) ? data : (data.default || []);
      console.log(`${this.universitiesCache.length} Türk üniversitesi JSON'dan yüklendi`);
    } catch (error) {
      console.error('Üniversiteler yüklenirken hata:', error.message);
      this.universitiesCache = [];
    }
  }

  async findUniversityByEmail(email: string): Promise<University | null> {
    // Email'den domain çıkar (örn: beyzanur@ogr.sakarya.edu.tr -> ogr.sakarya.edu.tr)
    const emailDomain = email.split('@')[1];
    
    if (!emailDomain) {
      return null;
    }

    // Alt domain kontrolü için base domain'i de çıkar
    const domainParts = emailDomain.split('.');
    let possibleDomains: string[] = [emailDomain];
    
    if (domainParts.length >= 3) {
      const baseDomain = domainParts.slice(-2).join('.');
      const baseDomainWithSubdomain = domainParts.slice(-3).join('.');
      possibleDomains.push(baseDomain, baseDomainWithSubdomain);
    }

    // 1. Önce veritabanında DOMAIN ile ara
    for (const domain of possibleDomains) {
      const university = await this.universityRepository.findOne({
        where: { emailDomain: `@${domain}` }
      });
      if (university) {
        return university;
      }
    }

    // 2. Veritabanında yoksa JSON cache'den bul
    const universityData = this.universitiesCache.find(uni => 
      uni.domains.some(domain => possibleDomains.includes(domain))
    );

    if (!universityData) {
      return null;
    }

    // --- YENİ EKLENEN KONTROL BAŞLANGICI ---
    // 3. Eklemeden önce, bu İSİMDE bir üniversite var mı diye tekrar kontrol et.
    // Çünkü domain eşleşmese bile isim eşleşiyor olabilir (Seed ile eklenmiş olabilir).
    const existingByName = await this.universityRepository.findOne({
      where: { name: universityData.name }
    });

    if (existingByName) {
      // Eğer isimle bulduysak, belki domain'i eksiktir, güncelleyelim mi?
      // Şimdilik sadece bulduğumuzu döndürelim, hata almayı engeller.
      return existingByName;
    }
    // --- YENİ EKLENEN KONTROL BİTİŞİ ---

    // 4. Veritabanına yeni kaydet
    try {
      const newUniversity = new University();
      newUniversity.name = universityData.name;
      newUniversity.emailDomain = `@${emailDomain}`;
      if (universityData['state-province']) {
        newUniversity.city = universityData['state-province'];
      }
      newUniversity.isActive = true;

      return await this.universityRepository.save(newUniversity);
    } catch (error) {
      // Eşzamanlı isteklerde (Race condition) yine de hata alırsak
      // var olanı bulup döndürmeyi dene
      if (error.code === '23505') { // Unique constraint error code
        return await this.universityRepository.findOne({
            where: { name: universityData.name }
        });
      }
      throw error;
    }
  }

  async getAllUniversities(): Promise<University[]> {
    return this.universityRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });
  }

  async getUniversityById(id: string): Promise<University | null> {
    return this.universityRepository.findOne({
      where: { id },
      relations: ['users', 'products']
    });
  }

  async searchUniversities(searchTerm: string): Promise<UniversityApiData[]> {
    const searchLower = searchTerm.toLowerCase();
    return this.universitiesCache
      .filter(uni => 
        uni.name.toLowerCase().includes(searchLower) ||
        uni.domains.some(domain => domain.toLowerCase().includes(searchLower))
      )
      .slice(0, 20); // İlk 20 sonuç
  }

  getDepartmentsByUniversityName(universityName: string): string[] {
    // İsmi normalize et (büyük harf + Türkçe karakter düzeltme)
    const normalizedName = this.normalizeUniversityName(universityName);
    
    // JSON'dan bölümleri al
    const departments = bolumlerData[normalizedName];
    
    if (!departments) {
      // Eşleşme yoksa orijinal isimle de dene
      const depts = bolumlerData[universityName];
      if (depts) return depts;
      
      // Hiç bulunamazsa boş array dön
      console.log(`Bölüm bulunamadı: ${universityName} (normalize: ${normalizedName})`);
      return [];
    }
    
    return departments;
  }

  private normalizeUniversityName(name: string): string {
    // Türkçe karakterleri düzelt ve büyük harfe çevir
    return name
      .toLocaleUpperCase('tr-TR')
      .replace(/İ/g, 'İ')
      .replace(/I/g, 'I')
      .trim();
  }

  getAllUniversityNamesWithDepartments(): string[] {
    // JSON'daki tüm üniversite isimlerini döndür
    return Object.keys(bolumlerData);
  }
}
