import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import type { PetDetailVm, PetHistoryAppointmentItemVm } from '@/app/features/pets/models/pet-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { careStatusLabel } from '@/app/features/visits/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/features/visits/models/visit-vm.model';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { CLIENT_PHONE_DISPLAY_PLACEHOLDER, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

const KNOWN_CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/**
 * Hasta kartı başlığının ikinci yarısı (ADR-020 karar 2a): uyarı rozetleri, sahip ve telefon, hesap durumu (açık borç, son geliş, sonraki randevu).
 * Ad, kimlik satırı ve "Düzenle" sayfa başlığındadır (`app-page-header`).
 */
@Component({
    selector: 'app-pet-card-header',
    standalone: true,
    imports: [RouterLink, PetAlertBadgesComponent],
    template: `
        <section class="card mb-4" aria-label="Sahip, uyarılar ve hesap durumu" data-testid="pet-card-header">
            @if (pet().petAlerts.flags.length > 0) {
                <div class="mb-3" role="region" aria-label="Hasta uyarıları">
                    <app-pet-alert-badges [alerts]="pet().petAlerts" />
                    @if (pet().petAlerts.note; as alertNote) {
                        <p class="m-0 mt-2" data-testid="alert-note">{{ alertNote }}</p>
                    }
                </div>
            }
            <p class="m-0">
                <span class="text-muted-color">Sahip:</span>
                @if (pet().ownerId) {
                    <a [routerLink]="['/panel/clients', pet().ownerId]" class="text-primary font-medium no-underline ml-1">{{ pet().clientName }}</a>
                } @else {
                    <span class="ml-1">{{ pet().clientName }}</span>
                }
                @if (phoneHref(); as href) {
                    <a [href]="href" class="text-primary no-underline ml-3 whitespace-nowrap" data-testid="owner-phone"><i class="pi pi-phone text-sm mr-1" aria-hidden="true"></i>{{ phone() }}</a>
                }
            </p>

            <dl class="m-0 mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 flex flex-wrap gap-x-8 gap-y-2" aria-label="Hesap durumu">
                @if (balance(); as b) {
                    <div data-testid="account-balance">
                        <dt class="text-muted-color text-sm">Açık borç</dt>
                        <dd class="m-0">
                            @switch (b.state) {
                                @case ('ok') {
                                    @if (outstanding() > 0) {
                                        <span class="font-semibold text-red-600 dark:text-red-400 tabular-nums">{{ outstandingLabel() }}</span>
                                    } @else {
                                        <span class="text-muted-color">Yok</span>
                                    }
                                }
                                @case ('error') {
                                    <span class="text-orange-600 dark:text-orange-400 text-sm">alınamadı</span>
                                }
                                @default {
                                    <span class="text-muted-color text-sm">…</span>
                                }
                            }
                        </dd>
                    </div>
                }
                <div data-testid="account-last-visit">
                    <dt class="text-muted-color text-sm">Son geliş</dt>
                    <dd class="m-0">
                        @if (summary()?.lastVisit; as v) {
                            @if (v.data; as visit) {
                                {{ formatDt(visit.arrivedAtUtc) }}
                                @if (careLabel(visit.careStatus); as label) {
                                    <span class="text-muted-color text-sm"> · {{ label }}</span>
                                }
                            } @else if (v.state === 'Empty') {
                                <span class="text-muted-color">Yok</span>
                            } @else if (v.state === 'Forbidden') {
                                <span class="text-muted-color text-sm"><i class="pi pi-lock mr-1" aria-hidden="true"></i>yetki yok</span>
                            } @else {
                                <span class="text-orange-600 dark:text-orange-400 text-sm">alınamadı</span>
                            }
                        } @else {
                            <span class="text-muted-color text-sm">…</span>
                        }
                    </dd>
                </div>
                @if (nextAppointment(); as n) {
                    <div data-testid="account-next-appointment">
                        <dt class="text-muted-color text-sm">Sonraki randevu</dt>
                        <dd class="m-0">
                            @switch (n.state) {
                                @case ('ok') {
                                    @if (n.data; as a) {
                                        <a [routerLink]="['/panel/appointments', a.id]" class="text-primary font-medium no-underline">{{ formatDt(a.scheduledAtUtc) }}</a>
                                    } @else {
                                        <span class="text-muted-color">Yok</span>
                                    }
                                }
                                @case ('error') {
                                    <span class="text-orange-600 dark:text-orange-400 text-sm">alınamadı</span>
                                }
                                @default {
                                    <span class="text-muted-color text-sm">…</span>
                                }
                            }
                        </dd>
                    </div>
                }
            </dl>
        </section>
    `
})
export class PetCardHeaderComponent {
    readonly pet = input.required<PetDetailVm>();
    readonly summary = input<PetSummaryVm | null>(null);
    /** Sahibin bakiyesi; `null` = ücret okuma yetkisi yok (alan gösterilmez). */
    readonly balance = input<PetCardSection<ClientBalanceVm>>(null);
    /** `null` = randevu okuma yetkisi yok (alan gösterilmez); `ok` + `null` veri = planlı randevu yok. */
    readonly nextAppointment = input<PetCardSection<PetHistoryAppointmentItemVm | null>>(null);
    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    readonly phone = computed(() => formatClientPhoneForDisplay(this.pet().clientPhone));
    readonly phoneHref = computed(() => {
        const digits = (this.pet().clientPhone ?? '').replace(/[^\d+]/g, '');
        return this.phone() !== CLIENT_PHONE_DISPLAY_PLACEHOLDER && digits ? `tel:${digits}` : null;
    });
    readonly outstanding = computed(() => {
        const b = this.balance();
        return b?.state === 'ok' ? b.data.outstandingAmount : 0;
    });
    readonly outstandingLabel = computed(() => {
        const b = this.balance();
        return b?.state === 'ok' ? formatMoney(b.data.outstandingAmount, b.data.currency || 'TRY') : '';
    });

    careLabel(status: string | null): string | null {
        return status && KNOWN_CARE_STATUSES.has(status) ? careStatusLabel(status as VisitCareStatus) : null;
    }
}
