import rateLimit from 'express-rate-limit';

// Genel API istekleri için limit: Dakikada 200 istek
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 200, // IP başına maksimum 200 istek
  message: {
    success: false,
    message: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.',
  },
  standardHeaders: true, // `RateLimit-*` başlıklarını döner
  legacyHeaders: false, // `X-RateLimit-*` başlıklarını devre dışı bırakır
});

// Login ve Register istekleri için limit: 10 dakikada 5 istek
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: 5, // IP başına maksimum 5 istek
  message: {
    success: false,
    message: 'Çok fazla başarısız deneme yaptınız. Şifrenizi unuttuysanız "Şifremi Unuttum" adımından ilerleyebilirsiniz. Lütfen daha sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
