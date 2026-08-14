
import { prisma } from '../../core/db.js';
import AppError from '../../core/errors/AppError.js';
import { scrapeStandings, scrapeFixtures, scrapeTopScorers } from '../superlig/scrapers/tffScraper.js';
import { scrapeTransfers } from '../superlig/scrapers/transfermarktScraper.js';
import { scrapeSquads } from '../superlig/scrapers/transfermarktSquadScraper.js';
import { fetchSofaScoreMatches } from '../superlig/scrapers/sofaScoreScraper.js';
import { redis } from '../../core/redis.js';

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

      res.status(201).json({ success: true, data: tracked });
    } catch (error) {
      next(error);
    }
  }

  async getTrackedMatches(req, res, next) {
    try {
      const matches = await prisma.trackedMatch.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ success: true, data: matches });
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
      res.status(200).json({ success: true, message: 'Mac takipten cikarildi.' });
    } catch (error) {
      next(error);
    }
  }

  async triggerScraper(req, res, next) {
    try {
      const { target } = req.params; // standings, fixtures, topscorers, transfers, squads, live-matches
      
      // Run the scraper asynchronously without blocking the request
      // We don't await because these take minutes to finish.
      // We just trigger them. Wait, user might want to know if it finished. 
      // Actually, if we await it, the HTTP request might timeout (e.g., transfers/squads take a long time). 
      // But let's await the fast ones and fire-and-forget the slow ones, OR just await all and increase timeout. 
      // Let's await to ensure they complete, user can just wait.
      
      switch (target) {
        case 'standings':
          await scrapeStandings();
          res.status(200).json({ success: true, message: 'Puan durumu basariyla guncellendi.' });
          break;
        case 'fixtures':
          await scrapeFixtures();
          res.status(200).json({ success: true, message: 'Fikstur basariyla guncellendi.' });
          break;
        case 'topscorers':
          await scrapeTopScorers();
          res.status(200).json({ success: true, message: 'Gol kralligi basariyla guncellendi.' });
          break;
        case 'transfers':
          scrapeTransfers().catch(console.error); // Fire and forget because it's slow
          res.status(200).json({ success: true, message: 'Transferler arka planda cekilmeye baslandi.' });
          break;
        case 'squads':
          scrapeSquads().catch(console.error); // Fire and forget because it's slow
          res.status(200).json({ success: true, message: 'Kadrolar arka planda cekilmeye baslandi.' });
          break;
        case 'live-matches':
          await fetchSofaScoreMatches();
          res.status(200).json({ success: true, message: 'Gunun maclari basariyla guncellendi.' });
          break;
        default:
          throw new AppError('Bilinmeyen scraper hedefi.', 400);
      }
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          status: true,
          teaBalance: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async changeUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'ACTIVE', 'BANNED', vs.

      if (!['ACTIVE', 'BANNED'].includes(status)) {
        throw new AppError('Geçersiz durum (status).', 400);
      }

      // Kendini banlamasini engelle
      if (req.user.id === id) {
        throw new AppError('Kendinizi banlayamazsınız.', 400);
      }

      const user = await prisma.user.update({
        where: { id },
        data: { status },
      });

      if (status === 'BANNED') {
        await redis.sadd('banned_users', id);
      } else {
        await redis.srem('banned_users', id);
      }

      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();

