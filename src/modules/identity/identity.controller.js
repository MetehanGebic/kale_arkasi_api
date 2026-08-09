import { z } from 'zod';
import identityService from './identity.service.js';
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
const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});
const resetPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  code: z.string().min(6, "Kod 6 haneli olmalıdır.").max(6),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});
class IdentityController {
  async register(req, res) {

    const validatedData = registerSchema.parse(req.body);

    const result = await identityService.registerUser(validatedData);
    
    return res.status(201).json({
      success: true,
      message: "Kahvehaneye hoş geldin!",
      data: result,
    });
  }
  async login(req, res) {
    const validatedData = loginSchema.parse(req.body);
    const result = await identityService.loginUser(validatedData);
    return res.status(200).json({
      success: true,
      message: "Tekrar hoş geldin!",
      data: result,
    });
  }
  async getClubs(req, res) {
    const clubs = await identityService.getActiveClubs();
    return res.status(200).json({ success: true, data: clubs });
  }
  async forgotPassword(req, res) {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await identityService.forgotPassword(email);
    
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
  async resetPassword(req, res) {
    const { email, code, password } = resetPasswordSchema.parse(req.body);
    const result = await identityService.resetPassword({ email, token: code, newPassword: password });
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}
export default new IdentityController();
