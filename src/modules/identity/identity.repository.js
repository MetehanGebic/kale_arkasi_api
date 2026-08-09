import { prisma } from '../../core/db.js';

class IdentityRepository {
    async findUserByEmail(email) {
        return prisma.user.findUnique({
            where: { email },
            include: { favoriteClub: true } // Giriş yaparken takım bilgilerini de getiriyoruz
        });
    }

  async findUserByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  }

  async findClubById(clubId) {
    return prisma.club.findUnique({ where: { id: clubId } });
  }

  async createUser(userData) {
    return prisma.user.create({
      data: userData,
      // Kullanıcı oluştuğunda UI'ın temayı hemen kurabilmesi için takım bilgilerini de döndürüyoruz
      include: { favoriteClub: true },
    });
  }
  
  async getAllClubs() {
    // Sadece aktif takımları getir ve gereksiz verileri (createdAt vb.) UI'a gönderme
    return prisma.club.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true
      }
    });
  }

  async updateUser(userId, data) {
    return prisma.user.update({
      where: { id: userId },
      data: data
    });
  }

  async findUserByEmailAndValidResetToken(email, hashedToken) {
    return prisma.user.findFirst({
      where: {
        email: email,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gte: new Date() }
      }
    });
  }
}

export default new IdentityRepository();