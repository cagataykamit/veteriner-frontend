import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { WAITLIST_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { WaitlistTodayDto } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Bugün ekranında bekleme listesi bilgisi (TIER-018): günün kalan saatlerinde iptal edilen randevular için "bekleme listesinde uygun X kişi
 * var". Seçili klinik yoksa, pakette bekleme listesi yoksa ya da boşalan saate uyan kimse yoksa çizilmez.
 */
@Component({
    selector: 'app-waitlist-today-summary',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
    template: `
        @if (line(); as text) {
            <p class="m-0 mb-4 flex flex-wrap items-center gap-2 text-sm" role="status" data-testid="waitlist-today-summary">
                <i class="fa-solid fa-list-ol text-muted-color" aria-hidden="true"></i>
                <span>{{ text }}</span>
                <a [routerLink]="waitlistRoute">Bekleme listesi</a>
            </p>
        }
    `
})
export class WaitlistTodaySummaryComponent {
    private readonly api = inject(WaitlistService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly waitlistRoute = WAITLIST_ROUTE;
    readonly data = signal<WaitlistTodayDto | null>(null);
    private readonly planReady = computed(() => this.ro.planFeatureReady('Waitlist'));

    /** Boşalan ve henüz dolmamış saatler; uyan kişi sayısı saatlerin toplamıdır (aynı kişi birden çok saate uyabilir). */
    readonly line = computed(() => {
        const slots = (this.data()?.releasedSlots ?? []).filter((s) => !s.isBooked && (s.eligibleCount > 0 || !!s.openOffer));

        if (slots.length === 0) {
            return null;
        }

        const eligible = slots.reduce((sum, s) => sum + s.eligibleCount, 0);
        const offers = slots.filter((s) => !!s.openOffer).length;
        const times = slots.map((s) => formatUtcIsoAsLocalTimeDisplay(s.startUtc)).join(', ');
        const offerText = offers > 0 ? ` ${offers} saat için teklif gitti, yanıt bekleniyor.` : '';

        return `Bugün iptal edilen ${slots.length} saat (${times}) için bekleme listesinde uygun ${eligible} kişi var.${offerText}`;
    });

    constructor() {
        // Paket bilgisi (access-state) gelince karar verilir; gelmeden ya da kilitliyken istek gitmez.
        effect(() => {
            if (this.planReady()) {
                untracked(() => this.load());
            }
        });
    }

    private load(): void {
        const clinicId = this.auth.getClinicId();

        if (!clinicId || !this.auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM)) {
            return;
        }

        this.api.today(clinicId).subscribe({
            next: (d) => this.data.set(d),
            // Bilgi satırıdır: hata Bugün ekranını bozmaz.
            error: () => this.data.set(null)
        });
    }
}
