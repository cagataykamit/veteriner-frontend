import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { clinicStatus, hoursGroups, nextSlotDays, type SiteSlot, toWorkingDays } from '@site-engine';
import { type VetFinderCard, vetFinderBookingHref } from './vet-finder-state';

/**
 * Klinik kartı: kliniğin kendi verdiği bilgi (ADR-047 K6), yorum ve puan yok (K5). "Şu an açık" backend'den gelir (sıralamayla aynı
 * kural); altındaki açılış/kapanış satırı aynı saatlerden. En yakın saat sayfa açıldıktan sonra gelir; talep klinik onaylayınca kesinleşir.
 * Stil `vet-finder.css`'tedir (`vf-` önekli, klinik sitelerine dokunmaz).
 */
@Component({
    selector: 'site-vet-finder-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let c = card();
        <article class="vf-card" [attr.data-key]="c.key">
            <header class="vf-card-head">
                <h2 class="vf-card-name">{{ c.name }}</h2>
                <span class="vf-status" [class.is-open]="c.isOpenNow">{{ c.isOpenNow ? 'Şu an açık' : 'Şu an kapalı' }}</span>
            </header>
            <p class="vf-card-place">
                {{ place() }}
                @if (distance(); as km) {
                    <span class="vf-distance">· {{ km }} km</span>
                }
            </p>
            @if (c.address) {
                <p class="vf-card-address">{{ c.address }}</p>
            }
            <p class="vf-card-hours">{{ statusLine() }}</p>
            @if (c.services.length) {
                <ul class="vf-tags" aria-label="Hizmetler">
                    @for (service of c.services; track service.key) {
                        <li>{{ service.name }}</li>
                    }
                </ul>
            }
            @if (nextSlot(); as slot) {
                <p class="vf-slot">
                    <span>Talep için en yakın saat</span>
                    <a [href]="slot.href" [attr.aria-label]="slot.label" rel="nofollow">{{ slot.day }} {{ slot.time }}</a>
                </p>
            }
            <div class="vf-actions">
                @if (bookingHref(); as href) {
                    <a class="vf-btn vf-btn-primary" [href]="href" rel="nofollow">Randevu talebi</a>
                }
                @if (telHref(); as tel) {
                    <a class="vf-btn" [href]="tel">Ara</a>
                }
                @if (c.sitePath) {
                    <a class="vf-btn" [href]="c.sitePath">Web sitesi</a>
                }
            </div>
            @if (hours().length) {
                <details class="vf-hours">
                    <summary>Çalışma saatleri</summary>
                    <dl>
                        @for (group of hours(); track group.label) {
                            <div [class.is-today]="group.isToday">
                                <dt>{{ group.label }}</dt>
                                <dd>
                                    {{ group.value }}
                                    @if (group.note) {
                                        <small>{{ group.note }}</small>
                                    }
                                </dd>
                            </div>
                        }
                    </dl>
                </details>
            }
        </article>
    `
})
export class VetFinderCardComponent {
    readonly card = input.required<VetFinderCard>();
    /** `undefined`: henüz sorulmadı; `null`: gösterilecek saat yok. */
    readonly slot = input<SiteSlot | null | undefined>(undefined);
    readonly now = input.required<Date>();

    private readonly days = computed(() => toWorkingDays(this.card().workingHours));

    protected readonly place = computed(() => [this.card().district, this.card().city].filter(Boolean).join(', '));
    protected readonly distance = computed(() => (this.card().distanceKm === null ? null : this.card().distanceKm!.toLocaleString('tr-TR', { maximumFractionDigits: 1 })));
    protected readonly hours = computed(() => (this.days().length ? hoursGroups(this.days(), this.now()) : []));
    protected readonly statusLine = computed(() => (this.days().length ? clinicStatus(this.days(), this.now()).detail : 'Çalışma saati girilmemiş'));
    protected readonly bookingHref = computed(() => (this.card().bookingUrl ? vetFinderBookingHref(this.card().bookingUrl!) : null));
    protected readonly telHref = computed(() => {
        const digits = this.card().phone?.replace(/[^\d+]/g, '') ?? '';

        return digits ? `tel:${digits}` : null;
    });
    protected readonly nextSlot = computed(() => {
        const slot = this.slot();
        const bookingUrl = this.card().bookingUrl;

        if (!slot || !bookingUrl || !this.card().showsNextSlot) return null;

        const [day] = nextSlotDays([slot], vetFinderBookingHref(bookingUrl), this.now());
        const vm = day?.slots[0];

        return vm ? { day: day.label, time: vm.time, href: vm.href, label: vm.label } : null;
    });
}
