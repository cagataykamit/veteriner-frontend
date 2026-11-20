import { DOCUMENT } from '@angular/common';
import { DestroyRef, EnvironmentProviders, inject, Injectable, isDevMode, makeEnvironmentProviders, provideAppInitializer, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { provideServiceWorker, SwUpdate } from '@angular/service-worker';
import { filter, fromEvent, interval, merge, startWith, take, timer } from 'rxjs';

/** Service worker'ın kayıtlandığı yollar: klinik paneli ve girişi. Tanıtım sitesi ziyaretçisi uygulama paketini indirmez. */
const PANEL_PATH_PREFIXES = ['/panel', '/auth'] as const;

/** Açılıştan bu süre içinde, kullanıcı henüz dokunmadan yeni sürüm hazır olursa beklemeden yenilenir. */
const FRESH_START_MS = 10_000;

/** Günlerce açık sekme ve ana ekran uygulaması için güncelleme kontrolü aralığı. */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60_000;

/**
 * Service worker yalnız üretim derlemesinde ve panel/giriş sayfasında açılan sekmede kayıtlanır (MOBILE-004, ADR-031 AK-1b).
 * Önbellek yalnız uygulama kabuğudur (`ngsw-config.json`, `dataGroups` boş): API yanıtı saklanmaz, çevrimdışı veri yoktur.
 */
export function panelServiceWorkerEnabled(devMode: boolean, pathname: string): boolean {
    return !devMode && PANEL_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Yeni sürüm: service worker indirince açılışın ilk saniyelerinde, kullanıcı henüz dokunmadıysa hemen; sonra ilk sayfa
 * geçişinde sayfa yeniden yüklenir, aynı sayfada kalana "Yeni sürüm hazır" bildirimi gösterilir (form ortasında kesmez).
 * Güncelleme açılışta, sekme öne gelince ve düzenli aralıkla sorulur; service worker kendi kontrolünü ancak boşta kalınca
 * (5-30 sn) yapar. Önbellek bozulursa (eski sürümün parçası sunucuda yok) hemen yeniden yüklenir. Ana ekrandaki uygulama
 * günlerce açık kalabildiği için eski kodla değişmiş API'ye istek atmasın.
 */
@Injectable({ providedIn: 'root' })
export class PanelAppUpdates {
    private readonly updates = inject(SwUpdate);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private versionReady = false;
    private freshStart = true;
    private readonly noticeVisible = signal(false);

    /** Panel düzenindeki "Yeni sürüm hazır" bildirimi. */
    readonly updateNoticeVisible = this.noticeVisible.asReadonly();

    start(): void {
        if (!this.updates.isEnabled) {
            return;
        }

        merge(timer(FRESH_START_MS), fromEvent(this.document, 'pointerdown', { capture: true }), fromEvent(this.document, 'keydown', { capture: true }))
            .pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => (this.freshStart = false));

        this.updates.versionUpdates
            .pipe(
                filter((event) => event.type === 'VERSION_READY'),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.onVersionReady());

        merge(fromEvent(this.document, 'visibilitychange').pipe(filter(() => this.document.visibilityState === 'visible')), interval(UPDATE_CHECK_INTERVAL_MS))
            .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.checkForUpdate());

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd && this.versionReady),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.reload());

        this.updates.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    }

    reloadNow(): void {
        this.reload();
    }

    dismissUpdateNotice(): void {
        this.noticeVisible.set(false);
    }

    private onVersionReady(): void {
        if (this.freshStart) {
            this.reload();

            return;
        }

        this.versionReady = true;
        this.noticeVisible.set(true);
    }

    /** Ağ yoksa ya da sunucu yanıt vermezse sonraki kontrol yeniden dener. */
    private checkForUpdate(): void {
        this.updates.checkForUpdate().catch(() => undefined);
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
