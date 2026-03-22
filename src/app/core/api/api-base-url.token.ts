import { InjectionToken } from '@angular/core';

/**
 * `ApiClient` kökü. `app.config.ts` → `environment.apiBaseUrl`.
 * - Development: genelde `''` + `proxy.conf.json` ile `/api` → backend.
 * - Production: tam backend origin (CORS açık olmalı).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
