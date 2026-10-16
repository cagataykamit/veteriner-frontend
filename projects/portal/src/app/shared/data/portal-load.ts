import { computed, DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PortalPage, hasNextPortalPage } from '@portal/app/core/api/portal-page';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';

export type PortalLoadState = 'loading' | 'ready' | 'error';

/**
 * Tek bir okuma isteğinin durumu (yükleniyor / hazır / hata). Yeni `run` öncekini iptal eder; bileşen yok olunca
 * abonelik kapanır. Hata metni `portalErrorMessage` ile üretilir (kişisel veri içermez, konsola yazılmaz).
 * Yanıt istemci tarafında önbelleğe alınmaz: her `run` sunucuya gider.
 */
export class PortalLoad<T> {
    readonly state = signal<PortalLoadState>('loading');
    readonly data = signal<T | null>(null);
    readonly error = signal('');

    private subscription: Subscription | null = null;
    private source: (() => Observable<T>) | null = null;

    constructor(destroyRef: DestroyRef) {
        destroyRef.onDestroy(() => this.subscription?.unsubscribe());
    }

    run(source: () => Observable<T>): void {
        this.source = source;
        this.data.set(null);
        this.retry();
    }

    retry(): void {
        if (!this.source) {
            return;
        }

        this.subscription?.unsubscribe();
        this.state.set('loading');
        this.error.set('');
        this.subscription = this.source().subscribe({
            next: (data) => {
                this.data.set(data);
                this.state.set('ready');
            },
            error: (err: unknown) => {
                this.error.set(portalErrorMessage(err));
                this.state.set('error');
            }
        });
    }
}

/**
 * Sayfalı liste ("Daha fazla göster" ile ekleyerek). İlk sayfanın durumu `state`, sonraki sayfalarınki `moreState`;
 * sonraki sayfa hatası yüklenmiş satırları silmez.
 */
export class PortalPagedLoad<T> {
    readonly state = signal<PortalLoadState>('loading');
    readonly moreState = signal<'idle' | 'loading' | 'error'>('idle');
    readonly items = signal<readonly T[]>([]);
    readonly error = signal('');
    readonly lastPage = signal<PortalPage<T> | null>(null);
    readonly hasMore = computed(() => hasNextPortalPage(this.lastPage()));

    private subscription: Subscription | null = null;
    private fetchPage: ((page: number) => Observable<PortalPage<T>>) | null = null;

    constructor(destroyRef: DestroyRef) {
        destroyRef.onDestroy(() => this.subscription?.unsubscribe());
    }

    /** Listeyi baştan yükler (ör. sekme veya klinik değişince). */
    run(fetchPage: (page: number) => Observable<PortalPage<T>>): void {
        this.fetchPage = fetchPage;
        this.items.set([]);
        this.lastPage.set(null);
        this.load(1);
    }

    retry(): void {
        const last = this.lastPage();

        this.load(last ? last.page + 1 : 1);
    }

    loadMore(): void {
        const last = this.lastPage();

        if (last && this.hasMore() && this.moreState() !== 'loading') {
            this.load(last.page + 1);
        }
    }

    private load(page: number): void {
        if (!this.fetchPage) {
            return;
        }

        const first = page === 1;

        this.subscription?.unsubscribe();
        this.error.set('');

        if (first) {
            this.state.set('loading');
        } else {
            this.moreState.set('loading');
        }

        this.subscription = this.fetchPage(page).subscribe({
            next: (result) => {
                this.items.update((items) => (first ? result.items : [...items, ...result.items]));
                this.lastPage.set(result);
                this.state.set('ready');
                this.moreState.set('idle');
            },
            error: (err: unknown) => {
                this.error.set(portalErrorMessage(err));

                if (first) {
                    this.state.set('error');
                } else {
                    this.moreState.set('error');
                }
            }
        });
    }
}

/** Bileşen alanı olarak: `readonly pets = portalLoad<PortalPet[]>();` */
export function portalLoad<T>(): PortalLoad<T> {
    return new PortalLoad<T>(inject(DestroyRef));
}

export function portalPagedLoad<T>(): PortalPagedLoad<T> {
    return new PortalPagedLoad<T>(inject(DestroyRef));
}
