import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import economyRoutes from './routes/economyRoutes.js';
import identityRoutes from './modules/identity/identity.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'Kale Arkası API ayakta ve dinliyor!' });
});

// Modül Rotalarını Bağlıyoruz (Tüm identity istekleri /api/identity altından geçecek)
app.use('/api/identity', identityRoutes);
app.use('/api/economy', economyRoutes);

app.listen(PORT, () => {
  console.log(`Kahvehane kapılarını açtı: http://localhost:${PORT}`);
});