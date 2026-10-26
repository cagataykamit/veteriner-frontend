import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import { CardAccountStatusComponent } from '@/app/features/pets/components/card-account-status.component';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import type { PetNextAppointmentVm } from '@/app/features/pets/models/pet-open-items-vm.model';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { careStatusLabel } from '@/app/features/visits/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/features/visits/models/visit-vm.model';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { clientPhoneTelHref, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

const KNOWN_CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/**
 * Hasta kartı başlığının ikinci yarısı (ADR-020 karar 2a): vefat rozeti (soluk, ayrışan), uyarı rozetleri, sahip ve telefon, hesap durumu (açık borç, son geliş, sonraki randevu).
 * Ad, kimlik satırı ve "Düzenle" sayfa başlığındadır (`app-page-header`).
 */
@Component({
    selector: 'app-pet-card-header',
    standalone: true,
    imports: [RouterLink, PetAlertBadgesComponent, CardAccountStatusComponent, TrDatePipe, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <section class="card mb-4" aria-label="Sahip, uyarılar ve hesap durumu" data-testid="pet-card-header">
            @if (pet().status === 'Deceased') {
                <p
                    class="m-0 mb-3 inline-flex items-center gap-2 rounded-border border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 px-3 py-1 text-sm font-medium text-surface-700 dark:text-surface-200"
                    role="status"
                    data-testid="pet-deceased-badge"
                >
                    <i class="pi pi-minus-circle" aria-hidden="true"></i>Vefat
                    @if (pet().deceasedOn; as on) {
                        <span class="font-normal">· {{ on | trDate }}</span>
                    }
                    <span class="font-normal text-muted-color">· yeni randevu, geliş ve muayene açılmaz</span>
                </p>
            }
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

            <app-card-account-status [balance]="balance()" [nextAppointment]="nextAppointment()">
                <div data-testid="account-last-visit">
                    <dt class="text-muted-color text-sm">Son geliş</dt>
                    <dd class="m-0">
                        @if (summary()?.lastVisit; as v) {
                            @if (v.data; as visit) {
                                {{ visit.arrivedAtUtc | trDateTime }}
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
            </app-card-account-status>
        </section>
    `
})
export class PetCardHeaderComponent {
    readonly pet = input.required<PetDetailVm>();
    readonly summary = input<PetSummaryVm | null>(null);
    /** Sahibin toplam açık borcu; `null` = ücret okuma yetkisi yok (alan gösterilmez). */
    readonly balance = input<PetCardSection<Pick<ClientBalanceVm, 'outstandingAmount' | 'currency'>>>(null);
    /** `null` = randevu okuma yetkisi yok (alan gösterilmez); `ok` + `null` veri = planlı randevu yok. */
    readonly nextAppointment = input<PetCardSection<PetNextAppointmentVm | null>>(null);

    readonly phone = computed(() => formatClientPhoneForDisplay(this.pet().clientPhone));
    readonly phoneHref = computed(() => clientPhoneTelHref(this.pet().clientPhone));

    careLabel(status: string | null): string | null {
        return status && KNOWN_CARE_STATUSES.has(status) ? careStatusLabel(status as VisitCareStatus) : null;
    }
}
