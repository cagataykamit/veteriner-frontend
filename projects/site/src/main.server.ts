import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { SiteRootComponent } from './app/site-root.component';
import { siteServerConfig } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(SiteRootComponent, siteServerConfig, context);

export default bootstrap;
