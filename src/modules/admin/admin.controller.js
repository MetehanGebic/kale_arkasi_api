
import { prisma } from '../../core/db.js';
import AppError from '../../core/errors/AppError.js';

class AdminController {
  async addTrackedMatch(req, res, next) {
    try {
      const { url } = req.body;
      if (!url) throw new AppError('SofaScore linki gereklidir.', 400);

      // Regex to extract sofaScoreId from e.g. https://www.sofascore.com/galatasaray-young-boys/YIbsaJb#id:12634351
      const match = url.match(/#id:(\d+)/);
      if (!match || !match[1]) {
        throw new AppError('Gecersiz link formati. Linkin sonunda #id:XXXXXXX bulunmalidir.', 400);
      }
      const sofaScoreId = parseInt(match[1]);

      // Check if already tracked
      const existing = await prisma.trackedMatch.findUnique({
        where: { sofaScoreId },
      });
      if (existing) {
        throw new AppError('Bu mac zaten takip ediliyor.', 400);
      }

      const tracked = await prisma.trackedMatch.create({
        data: {
          sofaScoreId,
          addedBy: req.user.id,
        },
      });

      res.status(201).json({ status: 'success', data: tracked });
    } catch (error) {
      next(error);
    }
  }

  async getTrackedMatches(req, res, next) {
    try {
      const matches = await prisma.trackedMatch.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ status: 'success', data: matches });
    } catch (error) {
      next(error);
    }
  }

  async removeTrackedMatch(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.trackedMatch.delete({
        where: { id },
      });
      res.status(200).json({ status: 'success', message: 'Mac takipten cikarildi.' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();

