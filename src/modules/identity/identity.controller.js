import { z } from 'zod';
import identityService from './identity.service.js';

// Gelen verinin şablonunu ve kurallarını (Zod ile) belirliyoruz
const registerSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır.").max(30),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
  favoriteClubId: z.string().uuid("Geçerli bir takım ID'si gerekli."),
});

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre boş bırakılamaz."),
});

class IdentityController {
  async register(req, res) {
    try {
      // 1. Zod ile gelen veriyi doğrula
      const validatedData = registerSchema.parse(req.body);

      // 2. İşlemi Service katmanına devret
      const result = await identityService.registerUser(validatedData);

      // 3. Başarılıysa Frontend'e token ve kullanıcı bilgilerini dön (HTTP 201: Created)
      return res.status(201).json({
        success: true,
        message: "Kahvehaneye hoş geldin!",
        data: result,
      });

    } catch (error) {
      // Zod doğrulama hatalarını yakala
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Geçersiz veri formatı.",
          errors: error.issues.map(e => e.message),
        });
      }

      // Service katmanından gelen iş mantığı hatalarını yakala
      if (error.message === 'CLUB_NOT_FOUND') {
        return res.status(404).json({ success: false, message: "Seçilen takım bulunamadı." });
      }
      if (error.message === 'EMAIL_IN_USE') {
        return res.status(409).json({ success: false, message: "Bu e-posta adresi zaten kullanılıyor." });
      }
      if (error.message === 'USERNAME_IN_USE') {
        return res.status(409).json({ success: false, message: "Bu kullanıcı adı daha önce alınmış." });
      }

      // Beklenmeyen sistem hataları
      console.error("[IdentityController Error]:", error);
      return res.status(500).json({ success: false, message: "Sunucu tarafında bir hata oluştu." });
    }
  }

  async login(req, res) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await identityService.loginUser(validatedData);

      return res.status(200).json({
        success: true,
        message: "Tekrar hoş geldin!",
        data: result,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Geçersiz veri formatı.",
          errors: error.issues.map(e => e.message),
        });
      }

      if (error.message === 'INVALID_CREDENTIALS') {
        // Güvenlik: E-posta mı yanlış şifre mi yanlış asla net söyleme. "Bilgiler hatalı" de.
        return res.status(401).json({ success: false, message: "E-posta veya şifre hatalı." });
      }

      console.error("[IdentityController Login Error]:", error);
      return res.status(500).json({ success: false, message: "Sunucu tarafında bir hata oluştu." });
    }
  }

  async getClubs(req, res) {
    try {
      const clubs = await identityService.getActiveClubs();
      return res.status(200).json({ success: true, data: clubs });
    } catch (error) {
      console.error("[IdentityController getClubs Error]:", error);
      return res.status(500).json({ success: false, message: "Takımlar getirilirken hata oluştu." });
    }
  }
}

export default new IdentityController();