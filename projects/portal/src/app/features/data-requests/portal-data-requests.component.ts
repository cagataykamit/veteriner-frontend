import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDate } from '@portal/app/shared/format/portal-date';
import { DATA_REQUEST_TYPES, dataRequestStatus, dataRequestTypeLabel } from '@portal/app/shared/format/portal-labels';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PORTAL_DATA_REQUEST_MESSAGE_MAX, PortalDataRequest, PortalDataRequestsApi, PortalDataRequestType } from './portal-data-requests.api';

/** Geri çekmede liste bayatsa (talep artık açık değil ya da yok) liste yeniden okunur. */
const STALE_CANCEL_CODES = new Set<string>([PORTAL_ERROR_CODES.dataRequestNotOpen, PORTAL_ERROR_CODES.dataRequestNotFound]);

/**
 * Verilerimle ilgili talep (PORTAL-007, sözleşme §11.1): seçili kliniğe KVKK başvurusu, geçmiş talepler ve açık talebi
 * geri çekme. Talep klinikteki kayıtlar içindir; portal hesabını silmek ayrı akıştır (§5.10). Açık talep sınırı ve
 * yanıt süresi sunucudadır; istemci yalnız sunucunun yanıtını gösterir.
 */
@Component({
    selector: 'portal-data-requests',
    standalone: true,
    imports: [RouterLink, ButtonModule, MessageModule, TextareaModule, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-field textarea {
            width: 100%;
            font-size: 1rem;
        }
    `,
    templateUrl: './portal-data-requests.component.html'
})
export class PortalDataRequestsComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalDataRequestsApi);

    readonly types = DATA_REQUEST_TYPES;
    readonly messageMax = PORTAL_DATA_REQUEST_MESSAGE_MAX;
    readonly requests = portalLoad<readonly PortalDataRequest[]>();

    readonly type = signal<PortalDataRequestType | null>(null);
    readonly message = signal('');
    readonly submitted = signal(false);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly status = signal('');

    readonly confirmingId = signal<string | null>(null);
    readonly cancellingId = signal<string | null>(null);
    readonly cancelError = signal<string | null>(null);

    readonly clinicName = computed(() => this.session.activeLink()?.clinicName?.trim() || 'Kliniğiniz');
    readonly typeError = computed(() => (this.submitted() && !this.type() ? 'Talep türünü seçin.' : null));
    readonly messageError = computed(() => (this.submitted() && !this.message().trim() ? 'Talebinizi kısaca açıklayın.' : null));

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                this.confirmingId.set(null);
                this.cancelError.set(null);
                this.submitError.set(null);

                if (link) {
                    this.load();
                }
            });
        });
    }

    load(): void {
        const linkId = this.session.activeLink()?.linkId;

        if (linkId) {
            this.requests.run(() => this.api.list(linkId));
        }
    }

    onMessage(value: string): void {
        this.message.set(value);
    }

    submit(): void {
        const linkId = this.session.activeLink()?.linkId;
        const type = this.type();
        const message = this.message().trim();

        this.submitted.set(true);
        this.status.set('');

        if (!linkId || !type || !message || this.submitting()) {
            return;
        }

        this.submitting.set(true);
        this.submitError.set(null);
        this.api.create(linkId, type, message).subscribe({
            next: (created) => {
                this.submitting.set(false);
                this.submitted.set(false);
                this.type.set(null);
                this.message.set('');
                this.requests.data.update((list) => [created, ...(list ?? [])]);
                this.status.set(`Talebiniz ${this.clinicName()} kliniğine iletildi. Klinik en geç ${formatPortalDate(created.dueAtUtc)} tarihine kadar yanıtlar.`);
            },
            error: (err: unknown) => {
                this.submitting.set(false);
                this.submitError.set(portalErrorMessage(err));
            }
        });
    }

    askCancel(request: PortalDataRequest): void {
        this.cancelError.set(null);
        this.confirmingId.set(request.id);
    }

    keep(): void {
        this.confirmingId.set(null);
    }

    cancel(request: PortalDataRequest): void {
        const linkId = this.session.activeLink()?.linkId;

        if (!linkId || this.cancellingId()) {
            return;
        }

        this.cancellingId.set(request.id);
        this.api.cancel(linkId, request.id).subscribe({
            next: () => {
                this.cancellingId.set(null);
                this.confirmingId.set(null);
                this.requests.data.update((list) => (list ?? []).map((r) => (r.id === request.id ? { ...r, status: 'Cancelled', canCancel: false } : r)));
            },
            error: (err: unknown) => {
                const code = portalProblemCode(err);

                this.cancellingId.set(null);
                this.confirmingId.set(null);

                if (code && STALE_CANCEL_CODES.has(code)) {
                    this.load();
                }

                this.cancelError.set(portalErrorMessage(err));
            }
        });
    }

    typeLabel(request: PortalDataRequest): string {
        return dataRequestTypeLabel(request.type);
    }

    statusOf(request: PortalDataRequest) {
        return dataRequestStatus(request.status);
    }

    isOpen(request: PortalDataRequest): boolean {
        return request.status === 'Open' || request.status === 'InProgress';
    }

    date(utc: string | null): string {
        return formatPortalDate(utc);
    }
}
