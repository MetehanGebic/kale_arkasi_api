import * as cheerio from 'cheerio';
import fs from 'fs';

const html = `
<div class="tm-staff-slider box svelte-9kdvyo" data-version="1.804.1"><!----><!----><div class="content-box-headline svelte-1r2dsxy">Teknik Kadro</div><!----> <swiper-container slides-per-view="1" centered-slides="true" auto-height="true" class="swiper-slider svelte-9kdvyo"><swiper-slide lazy="false" id="26" role="group" aria-label="26 / 26" style="width: 294px;" data-swiper-slide-index="25" class="swiper-slide-prev"><div class="flex-container svelte-1037xho"><!----><div class="flex-item-left" style="flex-basis: 24%;"><div class="image"><a href="/altay-kilic/profil/trainer/113899" title="Altay Kılıç" class="profile-link" target=""><img src="https://img.a.transfermarkt.technology/portrait/medium/113899-1725877493.jpg?lm=1" alt="Altay Kılıç" class="profile-image"></a></div><!----></div><!----> <div class="flex-item-right" style="flex-basis: 75%;"><!----><div class="name svelte-18r9vfp"><a href="/altay-kilic/profil/trainer/113899" title="Altay Kılıç" target="" class="name svelte-18r9vfp">Altay Kılıç</a></div><!----> <div class="row-data trainer-position svelte-1ixukrs"><!----><span class="value svelte-1ixukrs">Tercüman</span><!----></div><!----> <div class="row-data svelte-1ixukrs"><!----><span class="slider-label svelte-1sgie3">Yaş:</span>&nbsp;<span class="value">27</span><!----> <img width="15px" height="15px" alt="flag icon" src="https://tmssl.akamaized.net//images/flagge/small/174.png?lm=1520611569"><!----><!----></div><!----> <div class="row-data svelte-1ixukrs"><!----><span class="slider-label svelte-1ixukrs">Göreve başlama tarihi:</span>&nbsp;<span class="value svelte-1ixukrs">1 Tem 2022</span><!----></div><!----> <!----><!----></div><!----><!----></div><!----></swiper-slide><!----><swiper-slide lazy="false" id="1" style="width: 294px;" role="group" aria-label="1 / 26" class="swiper-slide-active" data-swiper-slide-index="0"><div class="flex-container svelte-1037xho"><!----><div class="flex-item-left" style="flex-basis: 24%;"><div class="image"><a href="/joao-pereira/profil/trainer/93770" title="João Pereira" class="profile-link" target=""><img src="https://img.a.transfermarkt.technology/portrait/medium/93770-1743415038.jpg?lm=1" alt="João Pereira" class="profile-image"></a></div><!----></div><!----> <div class="flex-item-right" style="flex-basis: 75%;"><!----><div class="name svelte-18r9vfp"><a href="/joao-pereira/profil/trainer/93770" title="João Pereira" target="" class="name svelte-18r9vfp">João Pereira</a></div><!----> <div class="row-data trainer-position svelte-1ixukrs"><!----><span class="value svelte-1ixukrs">Teknik Direktör</span><!----></div><!----> <div class="row-data svelte-1ixukrs"><!----><span class="slider-label svelte-1sgie3">Yaş:</span>&nbsp;<span class="value">42</span><!----> <img width="15px" height="15px" alt="flag icon" src="https://tmssl.akamaized.net//images/flagge/small/136.png?lm=1520611569"><!----><!----></div><!----> <div class="row-data svelte-1ixukrs"><!----><span class="slider-label svelte-1ixukrs">Göreve başlama tarihi:</span>&nbsp;<span class="value svelte-1ixukrs">22 Mar 2025</span><!----></div><!----> <!----><!----></div><!----><!----></div><!----></swiper-slide>
`;

const $ = cheerio.load(html);
let coachName = null;

$('.flex-container').each((i, el) => {
  const titleText = $(el).find('.trainer-position .value').text().trim();
  if (titleText === 'Teknik Direktör') {
    coachName = $(el).find('.name a').text().trim();
  }
});

console.log('Found coach:', coachName);
