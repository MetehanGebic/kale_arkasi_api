import * as economyService from '../services/economyService.js';
import { getIO } from '../core/socket.js';

export const claimDailyTea = async (req, res, next) => {
  try {
    // JWT'den gelen kullanıcı ID'sini alıyoruz
    const userId = req.user.id;

    const result = await economyService.claimDailyTea(userId);

    try {
      getIO().emit('leaderboard_updated');
    } catch (socketError) {
      console.error('[EconomyController] Liderlik tablosu bildirimi gönderilemedi:', socketError);
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === 'TEA_NOT_READY') {
      // Bu bir hata değil, bir iş kuralı: kullanıcı henüz 24 saati doldurmamış.
      return res.status(400).json({ success: false, message: error.message });
    }

    next(error);
  }
};
// Uygulama içindeki "Kahvehanenin Ağaları" kartını besler.
export const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await economyService.getLeaderboard();
    res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

// Flutter tarafında EconomyRepository.getBalance() bu endpoint'i çağırır.
export const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await economyService.getStatus(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: error.message });
    }

    next(error);
  }
};