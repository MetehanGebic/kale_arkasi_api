import jwt from 'jsonwebtoken';
import { prisma } from '../core/db.js';
import { redis } from '../core/redis.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Yetkilendirme başlığı eksik veya hatalı formatta.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token bulunamadı.',
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('[authMiddleware] JWT_SECRET .env dosyasında tanımlı değil!');
    return res.status(500).json({
      success: false,
      message: 'Sunucu yapılandırma hatası.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // REDIS BAN CHECK
    if (req.user && req.user.id) {
      const isBanned = await redis.sismember('banned_users', req.user.id);
      if (isBanned === 1) {
        return res.status(403).json({
          success: false,
          message: 'Hesabınız yönetici tarafından askıya alınmıştır.',
        });
      }
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Oturum süresi dolmuş, lütfen tekrar giriş yapın.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token.',
    });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Yetki kontrolü sırasında hata oluştu.' });
  }
};

export default { verifyToken, isAdmin };
