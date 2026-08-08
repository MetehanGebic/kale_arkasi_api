import jwt from 'jsonwebtoken';

/**
 * Authorization header'ından gelen JWT'yi doğrular ve
 * çözülen payload'ı req.user'a set eder.
 * Beklenen header formatı: "Authorization: Bearer <token>"
 */
export const verifyToken = (req, res, next) => {
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
    // JWT_SECRET tanımlı değilse hardcoded fallback'e düşmek yerine
    // sunucu hatası döndürüyoruz; güvenlik açığı yaratmaktansa açıkça hata veriyoruz.
    console.error('[authMiddleware] JWT_SECRET .env dosyasında tanımlı değil!');
    return res.status(500).json({
      success: false,
      message: 'Sunucu yapılandırma hatası.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // identity.service.js içindeki _generateToken ile aynı payload şekli:
    // { id, username, clubId }
    req.user = decoded;
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

export default { verifyToken };