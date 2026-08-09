import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import identityRepository from './identity.repository.js';
import AppError from '../../core/errors/AppError.js';
import { sendEmail } from '../../core/utils/email.js';
class IdentityService {
  async registerUser({ username, email, password, favoriteClubId }) {
    const club = await identityRepository.findClubById(favoriteClubId);    
    if (!club) throw new AppError('Seçilen takım bulunamadı.', 404);
    const isEmailTaken = await identityRepository.findUserByEmail(email);
    if (isEmailTaken) throw new AppError('Bu e-posta adresi zaten kullanılıyor.', 409);
    const isUsernameTaken = await identityRepository.findUserByUsername(username);
    if (isUsernameTaken) throw new AppError('Bu kullanıcı adı daha önce alınmış.', 409);
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds); 
    const user = await identityRepository.createUser({
      username,
      email,
      favoriteClubId,
    });
    const token = this._generateToken(user);
    delete user.password;
    return { user, token };
  }
  _generateToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, clubId: user.favoriteClubId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
  async loginUser({ email, password }) {

    const user = await identityRepository.findUserByEmail(email);
    if (!user) throw new AppError('E-posta veya şifre hatalı.', 401);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) throw new AppError('E-posta veya şifre hatalı.', 401);
    const token = this._generateToken(user);
    delete user.password;    return { user, token };
  }
  async getActiveClubs() {
    return identityRepository.getAllClubs();
  }
  async forgotPassword(email) {
    const user = await identityRepository.findUserByEmail(email);
    if (!user) {
      // Güvenlik açısından "Bu e-postaya ait kullanıcı bulunamadı" demek yerine,
      // her halükarda başarılı dönüyoruz (User enumeration engellemek için)
      return { message: 'Eğer sistemde kayıtlıysa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' };
    }
    // 1. Rastgele bir token oluştur (64 karakter hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    

    // 2. Token'ı veritabanına kaydetmeden önce hash'le (güvenlik için)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // 3. Geçerlilik süresi (örneğin 15 dakika)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // 4. Veritabanını güncelle
    await identityRepository.updateUser(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt
    });
    // 5. E-posta Gönderimi
    const resetUrl = `http://localhost:3000/api/identity/reset-password/${resetToken}`;
    const message = `
      <h1>Şifre Sıfırlama İsteği</h1>
      <p>Kale Arkası hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
      <p>Şifrenizi sıfırlamak için aşağıdaki linki kullanın (veya post isteği atın):</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>Bu bağlantı 15 dakika sonra geçerliliğini yitirecektir.</p>
      <p>Eğer bu işlemi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.</p>
    `;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Kale Arkası - Şifre Sıfırlama',
        html: message,
      });
    } catch (error) {
      // E-posta gönderilemezse token'ı temizle
      await identityRepository.updateUser(user.id, {
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      console.error('[forgotPassword Error]', error);
      throw new AppError('E-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 500);
    }
    return { message: 'Eğer sistemde kayıtlıysa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' };
  }
  async resetPassword({ token, newPassword }) {
    // 1. Gelen düz token'ı hash'le (Çünkü veritabanında hashli tutuyoruz)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // 2. Token ile eşleşen ve süresi dolmamış kullanıcıyı bul
    const user = await identityRepository.findUserByValidResetToken(hashedToken);
    
    if (!user) {
      throw new AppError('Token geçersiz veya süresi dolmuş.', 400);
    }
    // 3. Yeni şifreyi şifrele (hash)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    // 4. Kullanıcının şifresini güncelle ve token alanlarını temizle
    await identityRepository.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
    return { message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' };
  }
}
export default new IdentityService();
