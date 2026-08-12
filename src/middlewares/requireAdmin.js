import { prisma } from '../core/db.js';

export const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Yetkisiz eriþim.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Bu iþlem için yetkiniz yok.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Yetki kontrolü sýrasýnda hata oluþtu.' });
  }
};
