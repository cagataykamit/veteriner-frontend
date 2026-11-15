import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { formatPortalPhone, telHref } from '@portal/app/shared/format/portal-labels';
import { PortalClinicContact, PortalClinicContactService } from './portal-clinic-contact.service';

/** Talep formunda önden seçilecek neden: `vaccine` aşı nedenini seçer (H7). */
export type PortalRequestReasonHint = 'vaccine';

/**
 * Ana iş eylemi (H7): klinik online talep alıyorsa "Randevu talep et" (hayvan ve neden önden seçili açılabilir), almıyorsa telefonu
 * varsa "Kliniği ara". İkisi de yoksa hiçbir şey göstermez (çıkmaz cümle yok, H9).
 */
@Component({
    selector: 'portal-clinic-actions',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'portal-clinic-actions' },
    template: `
        @if (contact(); as c) {
            @if (c.bookingOpen) {
                <a class="portal-action-link portal-action-link--primary" routerLink="/appointments/requests/new" [queryParams]="queryParams()" data-testid="clinic-action-request">
                    <i class="fa-solid fa-calendar-plus" aria-hidden="true"></i>Randevu talep et
                </a>
            } @else if (phoneHref(); as href) {
                <a class="portal-action-link portal-action-link--primary" [href]="href" data-testid="clinic-action-call">
                    <i class="fa-solid fa-phone" aria-hidden="true"></i>Kliniği ara: {{ phoneText() }}
                </a>
            }
        }
    `,
    styles: `
        :host {
            display: block;
        }
    `
})
export class PortalClinicActions {
    private readonly session = inject(PortalSessionService);
    private readonly contacts = inject(PortalClinicContactService);

    /** Talep formunda önden seçilecek hayvan. */
    readonly petId = input<string | null>(null);
    readonly reason = input<PortalRequestReasonHint | null>(null);

    readonly contact = signal<PortalClinicContact | null>(null);
    readonly phoneHref = computed(() => telHref(this.contact()?.phone));
    readonly phoneText = computed(() => formatPortalPhone(this.contact()?.phone));
    readonly queryParams = computed(() => {
        const params: Record<string, string> = {};
        const petId = this.petId();
        const reason = this.reason();

        if (petId) {
            params['petId'] = petId;
        }

        if (reason) {
            params['reason'] = reason;
        }

        return params;
    });

    constructor() {
        effect((onCleanup) => {
            const linkId = this.session.activeLink()?.linkId;

            untracked(() => {
                this.contact.set(null);

                if (!linkId) {
                    return;
                }

                const sub = this.contacts.contact(linkId).subscribe((c) => this.contact.set(c));

                onCleanup(() => sub.unsubscribe());
            });
        });
    }
}
