import type { SectionAlternative } from '../../section-registry';
import { NatureAboutComponent } from './nature-about.component';
import { NatureContactComponent } from './nature-contact.component';
import { NatureFeaturesComponent } from './nature-features.component';
import { NatureFooterComponent } from './nature-footer.component';
import { NatureGalleryComponent } from './nature-gallery.component';
import { NatureGuideComponent } from './nature-guide.component';
import { NatureHeroComponent } from './nature-hero.component';
import { NatureNavComponent } from './nature-nav.component';
import { NatureServicesComponent } from './nature-services.component';
import { NatureTeamComponent } from './nature-team.component';

const key = 'nature';

export const NATURE_PACK: readonly SectionAlternative[] = [
    { type: 'nav', key, label: 'Yalnız menü düğmesi', note: 'Sağdan açılan ferah panel.', component: NatureNavComponent },
    { type: 'hero', key, label: 'Kemerli pencere', note: 'Uzun kemer fotoğraf, bol boşluk, italik başlık.', component: NatureHeroComponent },
    { type: 'about', key, label: 'İki yanı fotoğraflı metin', note: 'Ortada dar metin, farklı yükseklikte fotoğraflar.', component: NatureAboutComponent },
    { type: 'services', key, label: 'Basamaklı açılır satırlar', note: 'İçeri giren satırlar, açılınca fotoğraf.', component: NatureServicesComponent },
    { type: 'team', key, label: 'Oval çerçeveler', note: 'İnişli çıkışlı dizilim.', component: NatureTeamComponent },
    { type: 'features', key, label: 'Kemerli sütunlar', note: 'Farklı boyda pencereler.', component: NatureFeaturesComponent },
    { type: 'gallery', key, label: 'Kemer ve daire ritmi', note: 'Dalgalı hizada fotoğraflar.', component: NatureGalleryComponent },
    { type: 'guide', key, label: 'Defter sayfası', note: 'Yuvarlak fotoğraflı iki sütun.', component: NatureGuideComponent },
    { type: 'contact', key, label: 'Kemerli konum', note: 'Konum çizimi pencere içinde.', component: NatureContactComponent },
    { type: 'footer', key, label: 'Yosun bandı', note: 'Koyu bantta italik slogan, ince dal.', component: NatureFooterComponent }
];
