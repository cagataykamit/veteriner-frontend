import type { Type } from '@angular/core';
import type { SectionType } from '../model/site.model';
import { SiteAboutComponent } from './sections/site-about.component';
import { SiteContactComponent } from './sections/site-contact.component';
import { SiteFeaturesComponent } from './sections/site-features.component';
import { SiteFooterComponent } from './sections/site-footer.component';
import { SiteGalleryComponent } from './sections/site-gallery.component';
import { SiteGuideComponent } from './sections/site-guide.component';
import { SiteHeroComponent } from './sections/site-hero.component';
import { SiteNavComponent } from './sections/site-nav.component';
import { SiteServicesComponent } from './sections/site-services.component';
import { SiteTeamComponent } from './sections/site-team.component';

/**
 * Bölüm türü → bileşen. Sitenin tek düzeni vardır (K-01); dört konsept yalnız token ile ayrılır (`site-concepts`, `site-tokens`).
 * Eski kayıtlardaki `design.sections` seçimi saklanır ama çizimi değiştirmez.
 */
export const SECTION_COMPONENTS: Readonly<Record<SectionType, Type<unknown>>> = {
    nav: SiteNavComponent,
    hero: SiteHeroComponent,
    about: SiteAboutComponent,
    services: SiteServicesComponent,
    team: SiteTeamComponent,
    features: SiteFeaturesComponent,
    gallery: SiteGalleryComponent,
    guide: SiteGuideComponent,
    contact: SiteContactComponent,
    footer: SiteFooterComponent
};
