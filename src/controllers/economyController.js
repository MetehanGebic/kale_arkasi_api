import * as economyService from '../services/economyService.js';

export const claimDailyTea = async (req, res) => {
  try {
    // JWT'den gelen kullanıcı ID'sini alıyoruz
    const userId = req.user.id;

    const result = await economyService.claimDailyTea(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === 'TEA_NOT_READY') {
      // Bu bir hata değil, bir iş kuralı: kullanıcı henüz 24 saati doldurmamış.
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error('[EconomyController claimDailyTea Error]:', error);
    res.status(500).json({ success: false, message: 'Sunucu tarafında bir hata oluştu.' });
  }
};

// Flutter tarafında EconomyRepository.getBalance() bu endpoint'i çağırır.
// Eksik olduğu için bakiye ekranda hep 0 görünüyordu.
export const getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await economyService.getStatus(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: error.message });
    }

    console.error('[EconomyController getStatus Error]:', error);
    res.status(500).json({ success: false, message: 'Sunucu tarafında bir hata oluştu.' });
  }
};