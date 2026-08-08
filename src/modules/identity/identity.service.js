import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import identityRepository from './identity.repository.js';

class IdentityService {
  async registerUser({ username, email, password, favoriteClubId }) {
    // 1. Kural: Takım gerçekten veritabanında var mı?
    const club = await identityRepository.findClubById(favoriteClubId);
    if (!club) {
      throw new Error('CLUB_NOT_FOUND');
    }

    // 2. Kural: E-posta ve Kullanıcı adı eşsiz (unique) olmalı.
    const isEmailTaken = await identityRepository.findUserByEmail(email);
    if (isEmailTaken) throw new Error('EMAIL_IN_USE');

    const isUsernameTaken = await identityRepository.findUserByUsername(username);
    if (isUsernameTaken) throw new Error('USERNAME_IN_USE');

    // 3. Güvenlik: Şifreyi Hash'le (Kriptola)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds); // 'password' yerine 'hashedPassword' yaptık

    // 4. Kayıt: Kullanıcıyı oluştur
    const user = await identityRepository.createUser({
      username,
      email,
      password: hashedPassword, // Güncellenmiş şifreyi repository'ye gönderiyoruz
      favoriteClubId,
    });

    // 5. Oturum: JWT (Token) üret
    const token = this._generateToken(user);

    // Güvenlik: Şifre hash'ini asla dışarıya (frontend'e) gönderme
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
    // 1. Kullanıcıyı e-posta ile bul
    const user = await identityRepository.findUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 2. Şifreler eşleşiyor mu kontrol et (Bcrypt ile)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Oturum: JWT (Token) üret
    const token = this._generateToken(user);

    // Güvenlik: Şifre hash'ini asla dışarıya gönderme
    delete user.password;

    return { user, token };
  }

  async getActiveClubs() {
    return identityRepository.getAllClubs();
  }
}

export default new IdentityService();