import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, type ServerRoute, withRoutes } from '@angular/ssr';
import { siteAppConfig } from './app.config';

/** Adresler dinamik: derleme anında üretilecek sayfa yok, her istek sunucuda çizilir (K12). */
const SERVER_ROUTES: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];

export const siteServerConfig = mergeApplicationConfig(siteAppConfig, { providers: [provideServerRendering(withRoutes(SERVER_ROUTES))] });
