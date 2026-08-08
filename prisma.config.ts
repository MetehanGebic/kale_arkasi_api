import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// 1. .env dosyasındaki şifreleri ve URL'yi zorla sisteme yüklüyoruz
config();

export default defineConfig({
  datasource: {
    // 2. Artık burası undefined (boş) dönmeyecek
    url: process.env.DATABASE_URL,
  }
});