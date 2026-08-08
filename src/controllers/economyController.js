const economyService = require('../services/economyService');

const claimDailyTea = async (req, res) => {
  try {
    // JWT middleware'inden gelen kullanıcı ID'si (req.user.id olarak varsayıyoruz)
    const userId = req.user.id; 
    
    const result = await economyService.claimDailyTea(userId);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  claimDailyTea,
};