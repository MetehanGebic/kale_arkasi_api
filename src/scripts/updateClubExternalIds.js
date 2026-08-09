// src/scripts/updateClubExternalIds.js
//
// Tek seferlik script: seed.js ile oluşturulmuş 18 kulübe TFF ve Transfermarkt
// ID'lerini yazar. Çalıştırmak için: node src/scripts/updateClubExternalIds.js
import { prisma } from '../core/db.js';
import { CLUB_EXTERNAL_IDS } from '../modules/superlig/superlig.constants.js';

async function main() {
  console.log('🔗 Kulüplere TFF/Transfermarkt ID eşleştirmesi yazılıyor...');

  for (const entry of CLUB_EXTERNAL_IDS) {
    const club = await prisma.club.findUnique({ where: { slug: entry.slug } });

    if (!club) {
      console.warn(`⚠️  Atlandı: "${entry.slug}" slug'lı kulüp veritabanında bulunamadı (seed.js ile eşleşmiyor mu?)`);
      continue;
    }

    await prisma.club.update({
      where: { slug: entry.slug },
      data: {
        tffKulupId: entry.tffKulupId,
        transfermarktId: entry.transfermarktId,
      },
    });
    console.log(`✅ ${club.name} -> tffKulupId=${entry.tffKulupId}, transfermarktId=${entry.transfermarktId}`);
  }

  console.log('✅ Tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });