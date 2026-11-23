import type { SectionAlternative } from '../../section-registry';
import { ModernAboutComponent } from './modern-about.component';
import { ModernContactComponent } from './modern-contact.component';
import { ModernFeaturesComponent } from './modern-features.component';
import { ModernFooterComponent } from './modern-footer.component';
import { ModernGalleryComponent } from './modern-gallery.component';
import { ModernGuideComponent } from './modern-guide.component';
import { ModernHeroComponent } from './modern-hero.component';
import { ModernNavComponent } from './modern-nav.component';
import { ModernServicesComponent } from './modern-services.component';
import { ModernTeamComponent } from './modern-team.component';

const key = 'modern';

export const MODERN_PACK: readonly SectionAlternative[] = [
    { type: 'nav', key, label: 'İnce çizgili satır', note: 'Tek satır, düz metin bağlantılar.', component: ModernNavComponent },
    { type: 'hero', key, label: 'Dev başlık, geniş fotoğraf', note: 'Tipografi önde, fotoğraf sağ kenara taşar.', component: ModernHeroComponent },
    { type: 'about', key, label: 'Büyük paragraf', note: 'Tek cümle büyük, altında iki fotoğraf.', component: ModernAboutComponent },
    { type: 'services', key, label: 'Numaralı dizin', note: 'Satır satır, üzerine gelince renk dolar.', component: ModernServicesComponent },
    { type: 'team', key, label: 'Künye satırları', note: 'Fotoğraf az ya da hekim çoksa rahat durur.', component: ModernTeamComponent },
    { type: 'features', key, label: 'Çizgili sütunlar', note: 'Kartsız, kısa cümleler.', component: ModernFeaturesComponent },
    { type: 'gallery', key, label: 'Asimetrik ızgara', note: 'Farklı boyda kareler.', component: ModernGalleryComponent },
    { type: 'guide', key, label: 'Öne çıkan ve dizin', note: 'Bir yazı büyük, kalanı satır.', component: ModernGuideComponent },
    { type: 'contact', key, label: 'Dev telefon', note: 'Numara başlık gibi, yanında konum.', component: ModernContactComponent },
    { type: 'footer', key, label: 'Sayfa genişliğinde ad', note: 'Klinik adı en altta dev yazılır.', component: ModernFooterComponent }
];
