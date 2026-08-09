// src/modules/superlig/superlig.constants.js
//
// TFF ve Transfermarkt'taki sabit kulüp ID'lerini bizim seed.js'teki `slug`
// değerlerine eşleyen tablo. Bu ID'ler sponsor isimleri değişse bile
// (örn. "TÜMOSAN Konyaspor" -> "Konyaspor") hep aynı kalır, bu yüzden
// eşleştirme İSİM üzerinden değil bu sabit ID'ler üzerinden yapılır.
//
// tffKulupId: puan durumu + fikstür sayfalarındaki "kulupID" query param'ı
// transfermarktId: transfermarkt.com.tr'deki "/verein/<ID>" değeri
export const CLUB_EXTERNAL_IDS = [
  { slug: 'amed-sportif-faaliyetler', tffKulupId: 3678, transfermarktId: 12382 },
  { slug: 'besiktas', tffKulupId: 3590, transfermarktId: 114 },
  { slug: 'corendon-alanyaspor', tffKulupId: 51, transfermarktId: 11282 },
  { slug: 'caykur-rizespor', tffKulupId: 3631, transfermarktId: 126 },
  { slug: 'corum-fk', tffKulupId: 3199, transfermarktId: 37951 },
  { slug: 'erzurumspor-fk', tffKulupId: 4123, transfermarktId: 39722 },
  { slug: 'eyupspor', tffKulupId: 3610, transfermarktId: 7160 },
  { slug: 'fenerbahce', tffKulupId: 3592, transfermarktId: 36 },
  { slug: 'galatasaray', tffKulupId: 3604, transfermarktId: 141 },
  { slug: 'gaziantep-fk', tffKulupId: 3672, transfermarktId: 2832 },
  { slug: 'genclerbirligi', tffKulupId: 3606, transfermarktId: 820 },
  { slug: 'goztepe', tffKulupId: 3688, transfermarktId: 1467 },
  { slug: 'istanbul-basaksehir', tffKulupId: 3665, transfermarktId: 6890 },
  { slug: 'kasimpasa', tffKulupId: 39, transfermarktId: 10484 },
  { slug: 'kocaelispor', tffKulupId: 132, transfermarktId: 120 },
  { slug: 'konyaspor', tffKulupId: 3600, transfermarktId: 2293 },
  { slug: 'samsunspor', tffKulupId: 3597, transfermarktId: 152 },
  { slug: 'trabzonspor', tffKulupId: 3596, transfermarktId: 449 },
];