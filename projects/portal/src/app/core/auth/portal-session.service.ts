import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, defer, finalize, firstValueFrom, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { PortalAuthApi } from './portal-auth.api';
import type { PortalAuthTokens, PortalLink, PortalMe, PortalSessionStatus } from './portal-auth.models';
import { PortalTokenStore } from './portal-token.store';

/** Sekmeler arası yenileme kilidi: döndürülen refresh token'ı iki sekme aynı anda kullanırsa sunucu tüm oturumları kapatır. */
const REFRESH_LOCK_NAME = 'vetinity.portal.refresh';

/** Yenileme yapılamadı ve oturum bitti (anahtar yok ya da sunucu reddetti). */
export class PortalSessionExpiredError extends Error {
    constructor(cause?: unknown) {
        super('Portal oturumu sona erdi.', { cause });
    }
}

/** Sunucu yenilemeyi kesin olarak reddetti mi (401/400/403); ağ hatası ve 429'da anahtar korunur. */
function isRefreshRejected(err: unknown): boolean {
    return err instanceof HttpErrorResponse && (err.status === 401 || err.status === 400 || err.status === 403);
}

/**
 * Portal oturumu: token yaşam döngüsü, `GET /me`, etkin klinik bağı ve kabul durumu önbelleği.
 * Kişisel veri (e-posta, ad) yalnız bellekte; konsola ve URL'ye yazılmaz.
 */
@Injectable({ providedIn: 'root' })
export class PortalSessionService {
    private readonly authApi = inject(PortalAuthApi);
    private readonly tokens = inject(PortalTokenStore);
    private readonly router = inject(Router);

    private readonly statusSignal = signal<PortalSessionStatus>('unknown');
    private readonly meSignal = signal<PortalMe | null>(null);
    private readonly activeLinkIdSignal = signal<string | null>(this.tokens.activeLinkId());
    private readonly acceptanceClearedSignal = signal(false);

    private refreshInFlight: Observable<PortalAuthTokens> | null = null;
    private restoreInFlight: Promise<PortalSessionStatus> | null = null;

    readonly status = this.statusSignal.asReadonly();
    readonly me = this.meSignal.asReadonly();
    readonly isAuthenticated = computed(() => this.statusSignal() === 'authenticated');
    readonly acceptanceCleared = this.acceptanceClearedSignal.asReadonly();
    readonly links = computed<readonly PortalLink[]>(() => this.meSignal()?.links ?? []);

    /** Seçili bağ; tek bağ varsa o, seçim geçersizse `null` (çok klinikte seçim ekranı). */
    readonly activeLink = computed<PortalLink | null>(() => {
        const links = this.links();
        const selected = links.find((l) => l.linkId === this.activeLinkIdSignal());

        return selected ?? (links.length === 1 ? links[0] : null);
    });

    readonly needsClinicSelection = computed(() => this.links().length > 1 && this.activeLink() === null);

    /** Uygulama açılışında ve korumalı rotada: bir kez yenileme + `/me` dener. */
    ensureSession(): Promise<PortalSessionStatus> {
        const current = this.statusSignal();

        if (current === 'authenticated' || current === 'anonymous') {
            return Promise.resolve(current);
        }

        if (!this.restoreInFlight) {
            this.restoreInFlight = this.restore().finally(() => (this.restoreInFlight = null));
        }

        return this.restoreInFlight;
    }

    /** Giriş/davet kabulü sonrası: token'ları sakla, `/me` yükle. */
    startSession(tokens: PortalAuthTokens): Observable<PortalMe> {
        this.tokens.save(tokens);
        this.acceptanceClearedSignal.set(false);

        return this.loadMe();
    }

    loadMe(): Observable<PortalMe> {
        return this.authApi.me().pipe(
            tap((me) => {
                this.meSignal.set(me);
                this.statusSignal.set('authenticated');
            })
        );
    }

    /**
     * Refresh token'ı döndürür; aynı sekmede eşzamanlı çağrılar tek isteği paylaşır, sekmeler arası Web Locks ile sıralanır.
     * Sunucu reddederse yerel oturum silinir ve `PortalSessionExpiredError` fırlatılır.
     */
    refreshTokens(): Observable<PortalAuthTokens> {
        if (!this.refreshInFlight) {
            this.refreshInFlight = defer(() => this.withRefreshLock(() => this.rotateRefreshToken())).pipe(
                finalize(() => (this.refreshInFlight = null)),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }

        return this.refreshInFlight;
    }

    /** Yenileme başarısız: yerel oturumu kapatıp girişe yönlendirir (interceptor ve guard kullanır). */
    expire(): void {
        this.endLocalSession();
        void this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    }

    markAcceptanceCleared(): void {
        this.acceptanceClearedSignal.set(true);
    }

    selectLink(linkId: string): void {
        this.activeLinkIdSignal.set(linkId);
        this.tokens.setActiveLinkId(linkId);
    }

    /** Bu cihazdan çıkış; sunucu çağrısı başarısız olsa da yerel oturum silinir. */
    logout(): Observable<void> {
        return this.authApi.logout(this.tokens.refreshToken()).pipe(
            catchError(() => of(undefined)),
            map(() => this.endLocalSession())
        );
    }

    /** Tüm cihazlardan çıkış (§5.7); başarısızsa hata döner, yerel oturum korunur. */
    logoutAll(): Observable<void> {
        return this.authApi.logoutAll().pipe(map(() => this.endLocalSession()));
    }

    /** Hesap silme (§5.10): sunucu tüm oturumları sildiği için başarıda yerel oturum da biter; hata döner, oturum korunur. */
    deleteAccount(oneTimeCode: string): Observable<void> {
        return this.authApi.deleteAccount(oneTimeCode).pipe(map(() => this.endLocalSession()));
    }

    endLocalSession(): void {
        this.tokens.clear();
        this.meSignal.set(null);
        this.activeLinkIdSignal.set(null);
        this.acceptanceClearedSignal.set(false);
        this.statusSignal.set('anonymous');
    }

    private async restore(): Promise<PortalSessionStatus> {
        if (!this.tokens.refreshToken()) {
            this.statusSignal.set('anonymous');

            return 'anonymous';
        }

        try {
            await firstValueFrom(this.refreshTokens().pipe(switchMap(() => this.loadMe())));

            return 'authenticated';
        } catch (err) {
            if (err instanceof PortalSessionExpiredError || isRefreshRejected(err)) {
                this.endLocalSession();

                return 'anonymous';
            }

            this.statusSignal.set('offline');

            return 'offline';
        }
    }

    private rotateRefreshToken(): Promise<PortalAuthTokens> {
        const refreshToken = this.tokens.refreshToken();

        if (!refreshToken) {
            this.endLocalSession();

            return Promise.reject(new PortalSessionExpiredError());
        }

        return firstValueFrom(
            this.authApi.refresh(refreshToken).pipe(
                tap((tokens) => this.tokens.save(tokens)),
                catchError((err: unknown) => {
                    if (isRefreshRejected(err)) {
                        this.endLocalSession();

                        return throwError(() => new PortalSessionExpiredError(err));
                    }

                    return throwError(() => err);
                })
            )
        );
    }

    private withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
        const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;

        // `request` geri çağrının sözünü bekleyip sonucunu döner; lib tipi iç içe söz olarak tanımlar.
        return locks ? (locks.request(REFRESH_LOCK_NAME, work) as unknown as Promise<T>) : work();
    }
}
