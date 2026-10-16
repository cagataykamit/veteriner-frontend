import { bootstrapApplication } from '@angular/platform-browser';
import { PortalAppComponent } from './app/app.component';
import { portalAppConfig } from './app/app.config';

bootstrapApplication(PortalAppComponent, portalAppConfig).catch((err) => console.error(err));
