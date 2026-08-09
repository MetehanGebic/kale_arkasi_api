import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// ÇÖZÜM BURADA: Artık süslü parantezle ( { prisma } ) import edilebilir.
export const prisma = new PrismaClient({ adapter });