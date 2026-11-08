import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { formatPortalDate, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import { PortalWaitlistOfferApi, PortalWaitlistOfferPage } from './portal-waitlist-offer.api';

type OfferState = 'loading' | 'invalid' | 'error' | 'ready' | 'accepted' | 'declined' | 'slotTaken';
type OfferAction = 'accept' | 'decline';

/**
 * Bekleme listesi teklifi (`/bekleme-teklifi?token=…`; TIER-018). Kimliksiz ve kabuk dışında. Sayfayı açmak hiçbir şeyi değiştirmez
 * (e-posta tarayıcıları bağlantıyı açar): yalnız teklif bilgisi okunur, kabul ve ret düğmeyle gönderilir. Saat bu arada dolduysa
 * kabul "saat doldu" der; bekleme listesindeki yer korunur.
 */
@Component({
    selector: 'portal-waitlist-offer',
    standalone: true,
    imports: [ButtonModule, MessageModule, PortalBrandHeader, PortalFooter, PortalLoadingState, PortalErrorState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-waitlist-offer.component.html'
})
export class PortalWaitlistOfferComponent implements OnInit {
    private readonly api = inject(PortalWaitlistOfferApi);

    /** `?token=` (component input binding). Konsola/loga yazılmaz. */
    readonly token = input<string | undefined>();

    readonly state = signal<OfferState>('loading');
    readonly page = signal<PortalWaitlistOfferPage | null>(null);
    readonly loadError = signal('');
    readonly actionError = signal<string | null>(null);
    readonly pending = signal<OfferAction | null>(null);

    readonly invalidMessage = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.waitlistOfferNotFound];
    readonly slotTakenMessage = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.waitlistOfferSlotTaken];

    readonly whenText = computed(() => {
        const at = this.page()?.scheduledAtUtc;

        return at ? `${formatPortalDate(at)} ${formatPortalWeekday(at)}, saat ${formatPortalTime(at)}` : '';
    });

    readonly expiresText = computed(() => {
        const at = this.page()?.expiresAtUtc;

        return at ? `${formatPortalDate(at)}, ${formatPortalTime(at)}` : '';
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const token = this.token()?.trim();

        if (!token) {
            this.state.set('invalid');

            return;
        }

        this.state.set('loading');
        this.api.preview(token).subscribe({
            next: (page) => {
                this.page.set(page);
                this.state.set('ready');
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.state.set('invalid');

                    return;
                }

                this.loadError.set(portalErrorMessage(err));
                this.state.set('error');
            }
        });
    }

    accept(): void {
        this.run('accept');
    }

    decline(): void {
        this.run('decline');
    }

    private run(action: OfferAction): void {
        const token = this.token()?.trim();

        if (!token || this.pending()) {
            return;
        }

        this.actionError.set(null);
        this.pending.set(action);
        const request$ = action === 'accept' ? this.api.accept(token) : this.api.decline(token);

        request$.subscribe({
            next: () => {
                this.pending.set(null);
                this.state.set(action === 'accept' ? 'accepted' : 'declined');
            },
            error: (err: unknown) => {
                this.pending.set(null);
                const code = portalProblemCode(err);

                if (code === PORTAL_ERROR_CODES.waitlistOfferNotFound) {
                    this.state.set('invalid');

                    return;
                }

                if (code === PORTAL_ERROR_CODES.waitlistOfferSlotTaken) {
                    this.state.set('slotTaken');

                    return;
                }

                this.actionError.set(portalErrorMessage(err));
            }
        });
    }
}
