
import { prisma } from '../../core/db.js';
import AppError from '../../core/errors/AppError.js';

class AdminController {
  async addTrackedMatch(req, res, next) {
    try {
      const { url, homeLogoUrl, awayLogoUrl } = req.body;
      if (!url) throw new AppError('SofaScore linki gereklidir.', 400);

      // Extract sofaScoreId from e.g. #id:12634351 or #12634351 or /match/12634351
      let sofaScoreId = null;
      const hashMatch = url.match(/#(?:id:)?(\d+)/);
      if (hashMatch && hashMatch[1]) {
        sofaScoreId = parseInt(hashMatch[1]);
      } else {
        const pathMatch = url.match(/\/match\/(\d+)/);
        if (pathMatch && pathMatch[1]) sofaScoreId = parseInt(pathMatch[1]);
      }

      if (!sofaScoreId) {
        throw new AppError('Geçersiz link formatı. Linkten SofaScore Maç ID\'si çıkarılamadı (Örn: #1234567).', 400);
      }

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
          homeLogoUrl,
          awayLogoUrl,
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

