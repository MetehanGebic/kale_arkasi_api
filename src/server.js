import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import economyRoutes from './routes/economyRoutes.js';
import identityRoutes from './modules/identity/identity.routes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Global API Limiter
app.use(apiLimiter);

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'Kale Arkası API ayakta ve dinliyor!' });
});

// Modül Rotalarını Bağlıyoruz (Tüm identity istekleri /api/identity altından geçecek)
app.use('/api/identity', identityRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/tasks', tasksRoutes);

// Bütün route'lardan sonra Error Handler eklenmeli
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Kahvehane kapılarını açtı: http://localhost:${PORT}`);
});