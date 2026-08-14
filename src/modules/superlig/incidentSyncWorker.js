import { prisma } from '../../core/db.js';
import { fetchSofaScoreMatchDetails } from './scrapers/sofaScoreScraper.js';
import { getIO } from '../../core/socket.js';

export const syncMatchIncidents = async (matchId) => {
  try {
    const details = await fetchSofaScoreMatchDetails(matchId);
    if (!details || !details.incidents) return;
    
    const botUser = await prisma.user.findFirst({ where: { email: 'bot@skorla.com' } });
    if (!botUser) return;

    // Get existing incidents
    const existingComments = await prisma.matchComment.findMany({
      where: { matchId, incidentId: { not: null } },
      select: { incidentId: true }
    });
    const existingIds = new Set(existingComments.map(c => c.incidentId));

    for (const inc of details.incidents) {
      if (!inc.id || existingIds.has(inc.id.toString())) continue;

      let content = null;
      const timeStr = inc.time + (inc.addedTime ? '+' + inc.addedTime : '') + "'";
      
      if (inc.incidentType === 'goal') {
        const pName = inc.player ? inc.player.shortName || inc.player.name : 'Bilinmeyen Oyuncu';
        content = '⚽ GOL! ' + pName + ' (' + timeStr + ')';
      } else if (inc.incidentType === 'card') {
        const pName = inc.player ? inc.player.shortName || inc.player.name : 'Bilinmeyen Oyuncu';
        if (inc.incidentClass === 'yellow') content = '🟨 Sarı Kart: ' + pName + ' (' + timeStr + ')';
        if (inc.incidentClass === 'red') content = '🟥 Kırmızı Kart: ' + pName + ' (' + timeStr + ')';
      } else if (inc.incidentType === 'substitution') {
        const pIn = inc.playerIn ? inc.playerIn.shortName || inc.playerIn.name : 'Giren';
        const pOut = inc.playerOut ? inc.playerOut.shortName || inc.playerOut.name : 'Çıkan';
        content = '🔄 Değişiklik (' + timeStr + '): ' + pIn + ' oyuna giriyor, ' + pOut + ' çıkıyor.';
      }

      if (content) {
        const comment = await prisma.matchComment.create({
          data: {
            matchId,
            userId: botUser.id,
            content,
            incidentId: inc.id.toString(),
            isSystem: true,
          },
          include: { user: { select: { id: true, username: true, avatarUrl: true, favoriteClubId: true } } }
        });
        
        try {
          // Emit to forum / live chat
          getIO().to(matchId).emit('chat_message', {
            id: comment.id,
            sender: 'Sistem',
            role: 'ADMIN',
            text: content,
            avatarUrl: null,
            userId: botUser.id,
            isSystem: true
          });
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('[IncidentSync] Error for match', matchId, error);
  }
};