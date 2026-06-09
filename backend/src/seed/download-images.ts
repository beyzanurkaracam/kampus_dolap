/**
 * download-images.ts
 * ------------------------------------------------------------------
 * Kategoriye uygun GERÇEK fotoğrafları yerel bir klasöre indirir.
 * Kaynak: loremflickr (Flickr destekli, anahtar kelimeye göre gerçek foto, ücretsiz).
 *
 * Çalıştırma (backend/ klasöründen):
 *   npx ts-node src/seed/download-images.ts
 *
 * Çıktı:
 *   backend/seed-assets/images/<keyword>/<keyword>-<i>.jpg
 *
 * NOT: Kendi datasetin varsa, indirmeye gerek yok — aynı klasör yapısına
 * (seed-assets/images/<keyword>/) kendi .jpg/.png dosyalarını da koyabilirsin.
 * seed-products-real.ts o klasördeki ne varsa kullanır.
 * ------------------------------------------------------------------
 */
import * as fs from 'fs';
import * as path from 'path';

// seed-products-real.ts ile AYNI anahtar kelimeler olmalı.
const KEYWORDS = [
  'textbook', 'laptop', 'smartphone', 'calculator', 'bicycle',
  'jacket', 'sneakers', 'furniture', 'guitar', 'refrigerator',
];

const PER_KEYWORD = 8;   // her kategori için kaç görsel inecek (50 ilana fazlasıyla yeter)
const SIZE = 640;
const OUT_DIR = path.join(__dirname, '..', '..', 'seed-assets', 'images');

async function downloadOne(keyword: string, index: number): Promise<void> {
  // lock parametresi → her seferinde FARKLI ama tekrar üretilebilir bir görsel verir
  const lock = Math.floor(Math.random() * 100000) + index;
  const url = `https://loremflickr.com/${SIZE}/${SIZE}/${keyword}?lock=${lock}`;

  const dir = path.join(OUT_DIR, keyword);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${keyword}-${index}.jpg`);

  const res = await fetch(url); // Node 20+ yerleşik fetch
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  console.log(`  ✓ ${keyword}-${index}.jpg (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log(`📥 Görseller indiriliyor → ${OUT_DIR}\n`);
  for (const kw of KEYWORDS) {
    console.log(`📂 ${kw}`);
    for (let i = 1; i <= PER_KEYWORD; i++) {
      try {
        await downloadOne(kw, i);
      } catch (e) {
        console.warn(`  ✗ ${kw}-${i}: ${(e as Error).message}`);
      }
    }
  }
  console.log('\n✨ İndirme tamamlandı.');
}

main();