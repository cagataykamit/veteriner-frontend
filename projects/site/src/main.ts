import { bootstrapApplication } from '@angular/platform-browser';
import { SiteRootComponent } from './app/site-root.component';
import { siteAppConfig } from './app/app.config';

bootstrapApplication(SiteRootComponent, siteAppConfig).catch((err) => console.error(err));
