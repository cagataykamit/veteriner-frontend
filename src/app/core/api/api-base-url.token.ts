import { InjectionToken } from '@angular/core';

/** `app.config.ts` içinde `environment.apiBaseUrl` ile sağlanır. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
