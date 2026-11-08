import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { WAITLIST_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { WaitlistSlotDto } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { waitlistBlockerLabel, waitlistSlotSummary } from '@/app/entities/waitlist/utils/waitlist-labels.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * İptal edilen randevunun boşalttığı saat için bekleme listesi bilgisi (TIER-018): "uygun X kişi var" ve teklifin durumu. Otomatik teklif
 * kapalıysa randevu oluşturma yetkilisi sıradaki kişiye teklifi buradan gönderir. Pakette bekleme listesi yoksa ya da uyan kimse yoksa
 * hiçbir şey çizmez.
 */
@Component({
    selector: 'app-waitlist-slot-notice',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, ButtonModule],
    template: `
        @if (slot(); as s) {
            @if (summary(); as text) {
                <div class="flex flex-col gap-2 rounded-border border border-surface p-3" role="status" data-testid="waitlist-slot-notice">
                    <p class="m-0 text-sm"><i class="fa-solid fa-list-ol mr-2 text-muted-color" aria-hidden="true"></i>{{ text }}</p>
                    @if (canSend()) {
                        <ul class="m-0 p-0 list-none flex flex-col gap-1">
                            @for (c of s.candidates.slice(0, 3); track c.entryId) {
                                <li class="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span>{{ c.position }}. {{ c.petName }} · {{ c.clientName }}
                                        @if (blockerText(c.offerBlocker); as b) {<span class="text-muted-color"> · {{ b }}</span>}
                                    </span>
                                    @if (c.offerBlocker === 'None') {
                                        <button pButton type="button" class="p-button-sm p-button-outlined" [disabled]="sending()" (click)="send(c.entryId)" data-testid="waitlist-send-offer">
                                            <i class="pi pi-send"></i>Teklif gönder
                                        </button>
                                    }
                                </li>
                            }
                        </ul>
                    }
                    @if (feedback(); as f) {
                        <p class="m-0 text-sm" [class.text-red-600]="!f.ok" role="status" data-testid="waitlist-send-feedback">{{ f.text }}</p>
                    }
                    <a [routerLink]="waitlistRoute" class="text-sm">Bekleme listesine git</a>
                </div>
            }
        }
    `
})
export class WaitlistSlotNoticeComponent {
    private readonly api = inject(WaitlistService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    /** İptal edilen randevu. */
    readonly appointmentId = input.required<string>();

    protected readonly waitlistRoute = WAITLIST_ROUTE;
    readonly slot = signal<WaitlistSlotDto | null>(null);
    readonly sending = signal(false);
    readonly feedback = signal<{ ok: boolean; text: string } | null>(null);

    readonly summary = computed(() => {
        const s = this.slot();

        return s?.isReleased ? waitlistSlotSummary(s) : null;
    });

    /** Elle teklif: otomatik kapalı, açık teklif yok, yazma açık ve yetki var. */
    readonly canSend = computed(() => {
        const s = this.slot();

        return (
            !!s &&
            !s.autoOfferEnabled &&
            !s.openOffer &&
            !s.isBooked &&
            s.candidates.length > 0 &&
            !this.ro.mutationBlocked() &&
            this.auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM)
        );
    });

    protected readonly blockerText = waitlistBlockerLabel;

    private readonly planReady = computed(() => this.ro.planFeatureReady('Waitlist'));

    private readonly loadEffect = effect(() => {
        const id = this.appointmentId();

        // Paket bilgisi (access-state) gelince yeniden karar verilir; gelmeden ya da kilitliyken istek gitmez.
        this.planReady();
        untracked(() => this.load(id));
    });

    send(entryId: string): void {
        if (this.sending()) {
            return;
        }

        this.sending.set(true);
        this.api.sendOffer(entryId, this.appointmentId()).subscribe({
            next: () => {
                this.sending.set(false);
                this.feedback.set({ ok: true, text: 'Teklif gönderildi; hasta sahibine e-posta gitti.' });
                this.load(this.appointmentId());
            },
            error: (err: unknown) => {
                this.sending.set(false);
                this.feedback.set({ ok: false, text: panelHttpFailureMessage(err, 'Teklif gönderilemedi.') });
                this.load(this.appointmentId());
            }
        });
    }

    private load(appointmentId: string): void {
        if (!appointmentId || !this.planReady()) {
            this.slot.set(null);

            return;
        }

        this.api.slot(appointmentId).subscribe({
            next: (s) => this.slot.set(s),
            // Bilgi kutusudur: hata sayfayı bozmaz, kutu çizilmez.
            error: () => this.slot.set(null)
        });
    }
}
