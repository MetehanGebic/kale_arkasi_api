import jwt from 'jsonwebtoken';

/**
 * Authorization header'Ä±ndan gelen JWT'yi doÄŸrular ve
 * Ã§Ã¶zÃ¼len payload'Ä± req.user'a set eder.
 * Beklenen header formatÄ±: "Authorization: Bearer <token>"
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Yetkilendirme baÅŸlÄ±ÄŸÄ± eksik veya hatalÄ± formatta.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token bulunamadÄ±.',
    });
  }

  if (!process.env.JWT_SECRET) {
    // JWT_SECRET tanÄ±mlÄ± deÄŸilse hardcoded fallback'e dÃ¼ÅŸmek yerine
    // sunucu hatasÄ± dÃ¶ndÃ¼rÃ¼yoruz; gÃ¼venlik aÃ§Ä±ÄŸÄ± yaratmaktansa aÃ§Ä±kÃ§a hata veriyoruz.
    console.error('[authMiddleware] JWT_SECRET .env dosyasÄ±nda tanÄ±mlÄ± deÄŸil!');
    return res.status(500).json({
      success: false,
      message: 'Sunucu yapÄ±landÄ±rma hatasÄ±.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // identity.service.js iÃ§indeki _generateToken ile aynÄ± payload ÅŸekli:
    // { id, username, clubId }
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Oturum sÃ¼resi dolmuÅŸ, lÃ¼tfen tekrar giriÅŸ yapÄ±n.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'GeÃ§ersiz token.',
    });
  }
};


export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Bu islem icin admin yetkisi gereklidir.',
    });
  }
  next();
};

export default { verifyToken, isAdmin };
