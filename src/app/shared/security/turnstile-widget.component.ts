import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';

/** Cloudflare Turnstile betiği; belge gereği bu adresten yüklenir, paketlenmez (developers.cloudflare.com/turnstile, 2026-11-15). */
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileRenderOptions {
    sitekey: string;
    action: string;
    language: string;
    theme: 'auto' | 'light' | 'dark';
    appearance: 'always' | 'execute' | 'interaction-only';
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
    'timeout-callback': () => void;
}

interface TurnstileApi {
    render(container: HTMLElement, options: TurnstileRenderOptions): string;
    reset(widgetId: string): void;
    remove(widgetId: string): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(document: Document): Promise<TurnstileApi> {
    if (window.turnstile) {
        return Promise.resolve(window.turnstile);
    }

    scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement('script');

        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile yüklenemedi.')));

        script.onerror = () => {
            scriptLoading = null;
            reject(new Error('Turnstile yüklenemedi.'));
        };

        document.head.appendChild(script);
    });

    return scriptLoading;
}

/**
 * Görünmez insan doğrulaması (Cloudflare Turnstile): yalnız gerektiğinde onay kutusu gösterir. Site anahtarı sunucudan gelir
 * (`GET /public/owner-signup/settings`); boşsa (yerel geliştirme) hiçbir şey çizilmez ve jeton `null` kalır. Jeton tek kullanımlık ve
 * 5 dakika geçerlidir: kullanıldıktan sonra üst bileşen `reset()` çağırır.
 */
@Component({
    selector: 'app-turnstile-widget',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div #container class="min-h-0" data-testid="turnstile-widget"></div>
        @if (loadError()) {
            <small class="text-danger block mt-1" role="alert">Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip yeniden deneyin.</small>
        }
    `
})
export class TurnstileWidgetComponent {
    readonly siteKey = input<string | null>(null);
    /** Sunucudaki `HumanVerificationActions` ile aynı. */
    readonly action = input.required<string>();
    readonly tokenChange = output<string | null>();

    readonly loadError = signal(false);

    private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');
    private widgetId: string | null = null;

    constructor() {
        const destroyRef = inject(DestroyRef);

        effect(() => {
            const key = this.siteKey();

            if (!key || this.widgetId) {
                return;
            }

            loadTurnstile(document)
                .then((api) => {
                    this.widgetId = api.render(this.container().nativeElement, {
                        sitekey: key,
                        action: this.action(),
                        language: 'tr',
                        theme: 'auto',
                        appearance: 'interaction-only',
                        callback: (token) => this.tokenChange.emit(token),
                        'expired-callback': () => this.tokenChange.emit(null),
                        'error-callback': () => this.tokenChange.emit(null),
                        'timeout-callback': () => this.tokenChange.emit(null)
                    });
                })
                .catch(() => this.loadError.set(true));
        });

        destroyRef.onDestroy(() => {
            if (this.widgetId && window.turnstile) {
                window.turnstile.remove(this.widgetId);
            }
        });
    }

    /** Jeton kullanıldı ya da reddedildi: yeni jeton üretilir. */
    reset(): void {
        this.tokenChange.emit(null);

        if (this.widgetId && window.turnstile) {
            window.turnstile.reset(this.widgetId);
        }
    }
}
