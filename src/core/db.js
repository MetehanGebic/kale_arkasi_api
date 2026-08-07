// src/core/db.js
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import 'dotenv/config';

const { PrismaClient } = pkg;

// Neon.tech veritabanı bağlantı havuzu
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Prisma'ya PostgreSQL adaptörünü takıyoruz
const adapter = new PrismaPg(pool);

// Mimarinin geri kalanında kullanılacak tek ve resmi veritabanı istemcimiz
export const prisma = new PrismaClient({ adapter });