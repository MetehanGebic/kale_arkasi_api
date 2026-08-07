// src/seed.js
import { prisma } from './core/db.js';

async function main() {
  console.log('🌱 Tohumlama başlatılıyor...');

  // Takım verileri
  const clubs = [
    { name: 'Amed Sportif Faaliyetler', slug: 'amed-sportif-faaliyetler', primaryColor: '#E30A17', secondaryColor: '#008751' },
    { name: 'Beşiktaş', slug: 'besiktas', primaryColor: '#000000', secondaryColor: '#FFFFFF' },
    { name: 'Corendon Alanyaspor', slug: 'corendon-alanyaspor', primaryColor: '#F48220', secondaryColor: '#42A03F' },
    { name: 'Çaykur Rizespor', slug: 'caykur-rizespor', primaryColor: '#44D62C', secondaryColor: '#001489' },
    { name: 'Çorum FK', slug: 'corum-fk', primaryColor: '#FF0000', secondaryColor: '#FFFFFF' },
    { name: 'Erzurumspor FK', slug: 'erzurumspor-fk', primaryColor: '#0087C4', secondaryColor: '#FFFFFF' },
    { name: 'Eyüpspor', slug: 'eyupspor', primaryColor: '#542885', secondaryColor: '#FFD800' },
    { name: 'Fenerbahçe', slug: 'fenerbahce', primaryColor: '#043673', secondaryColor: '#FFED00' },
    { name: 'Galatasaray', slug: 'galatasaray', primaryColor: '#A90432', secondaryColor: '#FDB912' },
    { name: 'Gaziantep FK', slug: 'gaziantep-fk', primaryColor: '#FF2E55', secondaryColor: '#000000' },
    { name: 'Gençlerbirliği', slug: 'genclerbirligi', primaryColor: '#E00712', secondaryColor: '#000000' },
    { name: 'Göztepe', slug: 'goztepe', primaryColor: '#FFDD00', secondaryColor: '#DD0000' },
    { name: 'İstanbul Başakşehir', slug: 'istanbul-basaksehir', primaryColor: '#FE5000', secondaryColor: '#002A54' },
    { name: 'Kasımpaşa', slug: 'kasimpasa', primaryColor: '#0F2F62', secondaryColor: '#FFFFFF' },
    { name: 'Kocaelispor', slug: 'kocaelispor', primaryColor: '#00612b', secondaryColor: '#1b1c14' },
    { name: 'Konyaspor', slug: 'konyaspor', primaryColor: '#00875A', secondaryColor: '#FFFFFF' },
    { name: 'Samsunspor', slug: 'samsunspor', primaryColor: '#C70A0C', secondaryColor: '#FFFFFF' },
    { name: 'Trabzonspor', slug: 'trabzonspor', primaryColor: '#5A0E27', secondaryColor: '#75B7E5' }, 
    ];

for (const club of clubs) {
    const existingClub = await prisma.club.findUnique({ where: { slug: club.slug } });
    
    if (!existingClub) {
      await prisma.club.create({ data: club });
      console.log(`✅ Eklendi: ${club.name}`);
    } else {
      console.log(`⚡ Zaten mevcut: ${club.name}`);
    }
  }

  console.log('✅ Tohumlama tamamlandı! Kahvehane takımlara hazır.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });