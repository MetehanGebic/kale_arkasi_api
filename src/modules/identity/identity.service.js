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
      password: hashedPassword,
      favoriteClubId,
    });
    const token = this._generateToken(user);
    delete user.password;
    return { user, token };
  }
  _generateToken(user) {
    return jwt.sign(
      { id: user.id, username: user.username, clubId: user.favoriteClubId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
  async loginUser({ email, password }) {

    const user = await identityRepository.findUserByEmail(email);
    if (!user) throw new AppError('E-posta veya şifre hatalı.', 401);

    if (user.status !== 'ACTIVE') {
      throw new AppError('Hesabınız yönetici tarafından askıya alınmıştır.', 403);
    }

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
      return { message: 'Eğer sistemde kayıtlıysa, şifre sıfırlama kodu e-posta adresinize gönderildi.' };
    }
    // 1. 6 Haneli rastgele bir kod oluştur
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Kodu veritabanına kaydetmeden önce hash'le (güvenlik için)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // 3. Geçerlilik süresi (örneğin 15 dakika)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // 4. Veritabanını güncelle
    await identityRepository.updateUser(user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt
    });
    // 5. E-posta Gönderimi
    const message = `
      <h1>Şifre Sıfırlama Kodu</h1>
      <p>Skorla! hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
      <p>Şifrenizi sıfırlamak için uygulamada aşağıdaki 6 haneli kodu kullanın:</p>
      <h2 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${resetToken}</h2>
      <p>Bu kod 15 dakika sonra geçerliliğini yitirecektir.</p>
      <p>Eğer bu işlemi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.</p>
    `;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Skorla! - Şifre Sıfırlama Kodu',
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
    return { message: 'Eğer sistemde kayıtlıysa, şifre sıfırlama kodu e-posta adresinize gönderildi.' };
  }
  async resetPassword({ email, token, newPassword }) {
    // 1. Gelen düz token'ı hash'le (Çünkü veritabanında hashli tutuyoruz)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // 2. E-posta ve Token ile eşleşen ve süresi dolmamış kullanıcıyı bul
    const user = await identityRepository.findUserByEmailAndValidResetToken(email, hashedToken);
    
    if (!user) {
      throw new AppError('Kod geçersiz veya süresi dolmuş.', 400);
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
