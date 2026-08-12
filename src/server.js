import express from 'express';
import http from 'http';
import path from 'path';
import { initSocket } from './core/socket.js';
import cors from 'cors';
import 'dotenv/config';
import economyRoutes from './routes/economyRoutes.js';
import identityRoutes from './modules/identity/identity.routes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import superligRoutes from './modules/superlig/superlig.routes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initCronJobs } from './core/cron.js';

const app = express();
const PORT = process.env.PORT || 3000;
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
};
app.use(cors(corsOptions));
app.use(express.json());

// Statik dosyaları sun (Avatarlar için)
app.use(express.static(path.join(process.cwd(), 'public')));

// Global API Limiter
app.use(apiLimiter);

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'Kale Arkası API ayakta ve dinliyor!' });
});

// Modül Rotaları
app.use('/api/identity', identityRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/superlig', superligRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Bütün route'lardan sonra Error Handler eklenmeli
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

// Başlangıçta cron servislerini de ayağa kaldırıyoruz
initCronJobs();

server.listen(PORT, () => {
  console.log(`Kahvehane kapılarını açtı: http://localhost:${PORT}`);
});

import { prisma } from './core/db.js';

const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Kapanma sinyali alındı. Veritabanı bağlantısı kesiliyor...`);
  await prisma.$disconnect();
  server.close(() => {
    console.log('HTTP sunucusu kapatıldı.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));