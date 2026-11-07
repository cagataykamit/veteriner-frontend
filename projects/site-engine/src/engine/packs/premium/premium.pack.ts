import type { SectionAlternative } from '../../section-registry';
import { PremiumAboutComponent } from './premium-about.component';
import { PremiumContactComponent } from './premium-contact.component';
import { PremiumFeaturesComponent } from './premium-features.component';
import { PremiumFooterComponent } from './premium-footer.component';
import { PremiumGalleryComponent } from './premium-gallery.component';
import { PremiumGuideComponent } from './premium-guide.component';
import { PremiumHeroComponent } from './premium-hero.component';
import { PremiumNavComponent } from './premium-nav.component';
import { PremiumServicesComponent } from './premium-services.component';
import { PremiumTeamComponent } from './premium-team.component';

const key = 'premium';

export const PREMIUM_PACK: readonly SectionAlternative[] = [
    { type: 'nav', key, label: 'Ortada logo', note: 'Bağlantılar iki yanda, aralıklı büyük harf.', component: PremiumNavComponent },
    { type: 'hero', key, label: 'Ekranı dolduran fotoğraf', note: 'Koyu fotoğraf üstünde zarif başlık.', component: PremiumHeroComponent },
    { type: 'about', key, label: 'Çerçeveli dergi sayfası', note: 'Dikey fotoğraf, büyük ilk harf.', component: PremiumAboutComponent },
    { type: 'services', key, label: 'Menü kartı', note: 'Koyu bantta iki sütun, Roma rakamları.', component: PremiumServicesComponent },
    { type: 'team', key, label: 'Uzun paneller', note: 'Yatay kayar; fotoğraflar güçlüyse iyi durur.', component: PremiumTeamComponent },
    { type: 'features', key, label: 'Büyük satırlar', note: 'Sayfa boyu tırnaklı yazı.', component: PremiumFeaturesComponent },
    { type: 'gallery', key, label: 'Sergi', note: 'Tek büyük fotoğraf ve seçim şeridi.', component: PremiumGalleryComponent },
    { type: 'guide', key, label: 'Dergi yayılımı', note: 'Bir kapak yazısı, yanında başlıklar.', component: PremiumGuideComponent },
    { type: 'contact', key, label: 'Davetiye', note: 'Koyu bantta büyük adres.', component: PremiumContactComponent },
    { type: 'footer', key, label: 'Kartvizit', note: 'Ortalı, sade, ince çizgili.', component: PremiumFooterComponent }
];
