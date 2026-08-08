import * as economyService from '../services/economyService.js';

export const claimDailyTea = async (req, res) => {
  try {
    // JWT'den gelen kullanıcı ID'sini alıyoruz
    const userId = req.user.id; 
    
    const result = await economyService.claimDailyTea(userId);
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};