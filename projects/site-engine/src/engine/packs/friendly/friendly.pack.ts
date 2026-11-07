import type { SectionAlternative } from '../../section-registry';
import { FriendlyAboutComponent } from './friendly-about.component';
import { FriendlyContactComponent } from './friendly-contact.component';
import { FriendlyFeaturesComponent } from './friendly-features.component';
import { FriendlyFooterComponent } from './friendly-footer.component';
import { FriendlyGalleryComponent } from './friendly-gallery.component';
import { FriendlyGuideComponent } from './friendly-guide.component';
import { FriendlyHeroComponent } from './friendly-hero.component';
import { FriendlyNavComponent } from './friendly-nav.component';
import { FriendlyServicesComponent } from './friendly-services.component';
import { FriendlyTeamComponent } from './friendly-team.component';

const key = 'friendly';

export const FRIENDLY_PACK: readonly SectionAlternative[] = [
    { type: 'nav', key, label: 'Yüzen kapsül', note: 'Sayfanın üstünde yuvarlak çubuk.', component: FriendlyNavComponent },
    { type: 'hero', key, label: 'Eğik fotoğraf ve etiketler', note: 'Fotoğraf üstünde küçük notlar, sıcak başlık.', component: FriendlyHeroComponent },
    { type: 'about', key, label: 'Sohbet balonları', note: 'Başlık soruyor, metin yanıtlıyor.', component: FriendlyAboutComponent },
    { type: 'services', key, label: 'Renkli blok kolajı', note: 'Farklı boy ve renkte karolar.', component: FriendlyServicesComponent },
    { type: 'team', key, label: 'Panodaki kâğıtlar', note: 'Eğik fotoğraf kâğıtları, renkli monogram.', component: FriendlyTeamComponent },
    { type: 'features', key, label: 'Zikzak yol', note: 'Yuvarlak numaralar sırayla iner.', component: FriendlyFeaturesComponent },
    { type: 'gallery', key, label: 'Saçılmış baskılar', note: 'Farklı açılarda, biraz üst üste.', component: FriendlyGalleryComponent },
    { type: 'guide', key, label: 'Yana kayan notlar', note: 'Fotoğraflı ve renkli notlar dönüşümlü.', component: FriendlyGuideComponent },
    { type: 'contact', key, label: 'Renkli pano', note: 'Ara, yaz, gel: üç iri düğme.', component: FriendlyContactComponent },
    { type: 'footer', key, label: 'Dolgun renk blok', note: 'İri veda cümlesi.', component: FriendlyFooterComponent }
];
