import { DOCUMENT } from '@angular/common';
import { DestroyRef, EnvironmentProviders, inject, Injectable, isDevMode, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { provideServiceWorker, SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/** Service worker'ın kayıtlandığı yollar: klinik paneli ve girişi. Tanıtım sitesi ziyaretçisi uygulama paketini indirmez. */
const PANEL_PATH_PREFIXES = ['/panel', '/auth'] as const;

/**
 * Service worker yalnız üretim derlemesinde ve panel/giriş sayfasında açılan sekmede kayıtlanır (MOBILE-004, ADR-031 AK-1b).
 * Önbellek yalnız uygulama kabuğudur (`ngsw-config.json`, `dataGroups` boş): API yanıtı saklanmaz, çevrimdışı veri yoktur.
 */
export function panelServiceWorkerEnabled(devMode: boolean, pathname: string): boolean {
    return !devMode && PANEL_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Yeni sürüm: service worker indirince ilk sayfa geçişinden sonra sayfa yeniden yüklenir (form ortasında kesmez); önbellek
 * bozulursa (eski sürümün parçası sunucuda yok) hemen yeniden yüklenir. Ana ekrandaki uygulama günlerce açık kalabildiği için
 * eski kodla değişmiş API'ye istek atmasın.
 */
@Injectable({ providedIn: 'root' })
export class PanelAppUpdates {
    private readonly updates = inject(SwUpdate);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private versionReady = false;

    start(): void {
        if (!this.updates.isEnabled) {
            return;
        }

        this.updates.versionUpdates
            .pipe(
                filter((event) => event.type === 'VERSION_READY'),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => (this.versionReady = true));

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd && this.versionReady),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.reload());

        this.updates.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    }

    private reload(): void {
        this.document.location.reload();
    }
}

export function providePanelServiceWorker(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideServiceWorker('ngsw-worker.js', {
            enabled: panelServiceWorkerEnabled(isDevMode(), window.location.pathname),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        provideAppInitializer(() => inject(PanelAppUpdates).start())
    ]);
}
