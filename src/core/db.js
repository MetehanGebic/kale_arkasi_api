// src/core/db.js
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from '@prisma/client';
import 'dotenv/config';

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Yeni nesil bağlantı havuzu oluşturuluyor
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Prisma artık bu adaptör üzerinden çalışacak
const prisma = new PrismaClient({ adapter });