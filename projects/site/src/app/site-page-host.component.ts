import { isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, makeStateKey, PLATFORM_ID, REQUEST_CONTEXT, RESPONSE_INIT, type Signal, TransferState } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { SiteRendererComponent } from '@site-engine';
import { SiteHead } from './site-head';
import { publishedSiteConfig, type SiteRequestState } from './site-state';

const SITE_STATE = makeStateKey<SiteRequestState>('site-state');

interface Notice {
    readonly title: string;
    readonly text: string;
    readonly status: number;
}

const NOTICES: Readonly<Record<Exclude<SiteRequestState['kind'], 'published'>, Notice>> = {
    closed: { title: 'Bu site şu anda yayında değil', text: 'Klinikle iletişim için daha sonra tekrar bakabilirsiniz.', status: 503 },
    notfound: { title: 'Bu sayfa bulunamadı', text: 'Adresi kontrol edin; klinik sitesini kapatmış ya da adresini değiştirmiş olabilir.', status: 404 },
    unavailable: { title: 'Site şu anda açılamıyor', text: 'Kısa bir süre sonra yeniden deneyin.', status: 503 }
};

/** Adresi site içindeki yola çevirir: "/slug/hizmetler#x" → "/hizmetler#x". Sorgu sitenin içinde kullanılmaz. */
export function sitePathFromUrl(url: string): string {
    const [withoutFragment, fragment] = url.split('#');
    const parts = withoutFragment.split('?')[0].split('/').filter(Boolean).slice(1);

    return `/${parts.join('/')}${fragment ? `#${fragment}` : ''}`;
}

/**
 * Sitenin çizildiği tek sayfa. Durumu sunucu verir (`REQUEST_CONTEXT`), tarayıcıya hidrasyonla aktarılır: alt sayfa geçişi yeni istek
 * yapmaz, API tarayıcıdan okunmaz. Motorun yolu adres çubuğuyla iki yönlü bağlıdır; bağlantılar gerçek adrestir, JS'siz de çalışır.
 */
@Component({
    selector: 'site-page-host',
    standalone: true,
    imports: [SiteRendererComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (config(); as site) {
            <site-renderer [config]="site" [path]="path()" [baseHref]="baseHref()" (pathChange)="navigate($event)" />
        } @else if (notice(); as message) {
            <main class="notice">
                <h1>{{ message.title }}</h1>
                <p>{{ message.text }}</p>
            </main>
        }
    `,
    styles: `
        .notice {
            display: grid;
            align-content: center;
            gap: 12px;
            min-height: 100dvh;
            margin: 0 auto;
            padding: 24px;
            max-width: 560px;
            color: #16181b;
            font-family: 'Figtree Variable', system-ui, sans-serif;
            text-align: center;
        }

        h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
            line-height: 1.2;
        }

        p {
            margin: 0;
            color: #5d6167;
            font-size: 16px;
            line-height: 1.5;
        }
    `
})
export class SitePageHostComponent {
    private readonly router = inject(Router);
    private readonly head = inject(SiteHead);
    private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
    private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

    private readonly state: SiteRequestState = this.readState();
    private readonly url: Signal<string> = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.router.url)
        ),
        { initialValue: this.router.url }
    );

    protected readonly path = computed(() => sitePathFromUrl(this.url()));
    protected readonly config = computed(() => (this.state.kind === 'published' ? publishedSiteConfig(this.state) : null));
    protected readonly baseHref = computed(() => (this.state.kind === 'published' ? `/k/${encodeURIComponent(this.state.slug)}` : ''));
    protected readonly notice = computed(() => {
        if (this.state.kind === 'published') return null;

        const notice = NOTICES[this.state.kind];

        return this.state.kind === 'closed' && this.state.message ? { ...notice, title: this.state.message } : notice;
    });

    constructor() {
        effect(() => this.applyHead());
    }

    protected navigate(path: string): void {
        if (this.state.kind !== 'published') return;

        void this.router.navigateByUrl(`/${encodeURIComponent(this.state.slug)}${path.startsWith('/#') ? path.slice(1) : path === '/' ? '' : path}`);
    }

    private readState(): SiteRequestState {
        const transfer = inject(TransferState);

        if (!this.isServer) return transfer.get(SITE_STATE, { kind: 'unavailable' });

        const state = (inject(REQUEST_CONTEXT, { optional: true }) as SiteRequestState | null) ?? { kind: 'notfound' };

        transfer.set(SITE_STATE, state);

        return state;
    }

    private applyHead(): void {
        const config = this.config();

        if (config && this.state.kind === 'published') {
            const found = this.head.applyPublished(config, this.path(), this.state.origin);

            if (!found) this.setStatus(404);

            return;
        }

        const notice = this.notice();

        if (notice) {
            this.head.applyNotice(notice.title);
            this.setStatus(notice.status);

            if (this.state.kind === 'closed' && this.responseInit) {
                (this.responseInit.headers as Headers | undefined)?.set?.('Retry-After', '3600');
            }
        }
    }

    private setStatus(status: number): void {
        if (this.responseInit) this.responseInit.status = status;
    }
}
