import { bootstrapApplication } from '@angular/platform-browser';
import { SiteRootComponent } from './app/site-root.component';
import { buildSiteAppConfig } from './app/app.config';
import { isVetFinderPath } from './app/vet-finder/vet-finder-state';

bootstrapApplication(SiteRootComponent, buildSiteAppConfig({ initialNavigation: !isVetFinderPath(location.pathname) })).catch((err) => console.error(err));
