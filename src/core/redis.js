import { Redis } from '@upstash/redis';
import { prisma } from './db.js';

// Initialize Upstash Redis instance
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Veritabanındaki tüm banlı/askıya alınmış kullanıcıları Redis'e yükler.
 * Sunucu başlarken bir kez çalıştırılır.
 */
export const syncBannedUsersToRedis = async () => {
  try {
    console.log('[Redis] Banned users senkronizasyonu başlıyor...');
    
    // Veritabanından status değeri ACTIVE OLMAYAN tüm kullanıcıları çek
    const nonActiveUsers = await prisma.user.findMany({
      where: {
        status: {
          not: 'ACTIVE',
        },
      },
      select: { id: true },
    });

    if (nonActiveUsers.length > 0) {
      // Upstash'te sadd ile toplu ekleme yapabiliyoruz.
      const userIds = nonActiveUsers.map(u => u.id);
      
      // Önce eski listeyi temizle
      await redis.del('banned_users');
      
      // Yeni listeyi ekle
      await redis.sadd('banned_users', ...userIds);
      
      console.log(`[Redis] ${userIds.length} adet kullanıcı kara listeye (banned_users) eklendi.`);
    } else {
      await redis.del('banned_users');
      console.log('[Redis] Kara listeye eklenecek kullanıcı bulunamadı.');
    }
  } catch (error) {
    console.error('[Redis] Kara liste senkronizasyon hatası:', error);
  }
};
