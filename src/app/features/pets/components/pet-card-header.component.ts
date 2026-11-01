import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientBalanceVm } from '@/app/entities/client/models/client-balance-vm.model';
import { CardAccountStatusComponent } from '@/app/entities/patient/components/card-account-status.component';
import type { PetSummaryVm } from '@/app/entities/pet/models/pet-summary-vm.model';
import type { PetNextAppointmentVm } from '@/app/entities/pet/models/pet-open-items-vm.model';
import type { PetDetailVm } from '@/app/entities/pet/models/pet-vm.model';
import { type PetCardSection, petIdentityParts } from '@/app/entities/patient/utils/pet-card.utils';
import { speciesEmoji } from '@/app/shared/utils/species-icon.utils';
import { careStatusLabel } from '@/app/entities/visit/utils/visit-status.utils';
import type { VisitCareStatus } from '@/app/entities/visit/models/visit-vm.model';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { clientPhoneTelHref, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

const KNOWN_CARE_STATUSES: ReadonlySet<string> = new Set(['Waiting', 'InProgress', 'Completed']);

/**
 * Hasta kimlik kartı (ADR-020 karar 2a; müşteri kimlik kartıyla aynı dil): tür simgesi avatarı, ad, künye satırı (tür · ırk · cinsiyet · yaş · kilo · çip),
 * sahip ve telefon, durum rozetleri (vefat — soluk, ayrışan; hasta uyarıları), sağ üstte eylemler (`[editAction]`, yetki sayfada),
 * altta gösterge şeridi (açık borç, son geliş, sonraki randevu).
 */
@Component({
    selector: 'app-pet-card-header',
    standalone: true,
    imports: [RouterLink, PetAlertBadgesComponent, CardAccountStatusComponent, TrDatePipe, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card mb-4 @container" aria-label="Hasta kimliği ve hesap durumu" data-testid="pet-card-header">
            <div class="flex flex-wrap items-start gap-x-5 gap-y-3">
                <div
                    class="shrink-0 flex items-center justify-center w-11 h-11 text-xl @md:w-14 @md:h-14 @md:text-2xl rounded-full bg-primary-50 dark:bg-primary-900/40"
                    [title]="pet().speciesName"
                    aria-hidden="true"
                >
                    {{ speciesIcon() }}
                </div>
                <div class="min-w-0 flex-1 basis-56">
                    <h1 class="m-0 text-2xl font-semibold leading-tight text-surface-900 dark:text-surface-0 break-words" data-testid="pet-name">{{ pet().name }}</h1>
                    <p class="m-0 mt-1 text-sm text-muted-color break-words" data-testid="pet-identity">{{ identityLine() }}</p>

                    <p class="m-0 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Sahip">
                        <span>
                            <span class="text-muted-color">Sahip:</span>
                            @if (pet().ownerId) {
                                <a [routerLink]="['/panel/clients', pet().ownerId]" class="text-primary font-medium no-underline ml-1">{{ pet().clientName }}</a>
                            } @else {
                                <span class="ml-1">{{ pet().clientName }}</span>
                            }
                        </span>
                        @if (phoneHref(); as href) {
                            <a [href]="href" class="text-primary no-underline whitespace-nowrap text-base font-semibold tabular-nums max-sm:inline-flex max-sm:items-center max-sm:min-h-(--touch-target)" data-testid="owner-phone"><i class="pi pi-phone text-sm mr-1.5" aria-hidden="true"></i>{{ phone() }}</a>
                        }
                    </p>

                    @if (pet().status === 'Deceased' || pet().petAlerts.flags.length > 0) {
                        <div class="mt-3 flex flex-wrap items-center gap-2 text-sm" role="region" aria-label="Durum ve uyarılar">
                            @if (pet().status === 'Deceased') {
                                <p
                                    class="m-0 inline-flex items-center gap-1.5 rounded-full border border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800 px-2.5 py-0.5 font-medium text-surface-700 dark:text-surface-200"
                                    role="status"
                                    data-testid="pet-deceased-badge"
                                >
                                    <i class="pi pi-minus-circle text-xs" aria-hidden="true"></i>Vefat
                                    @if (pet().deceasedOn; as on) {
                                        <span class="font-normal">· {{ on | trDate }}</span>
                                    }
                                    <span class="font-normal text-muted-color">· yeni randevu, geliş ve muayene açılmaz</span>
                                </p>
                            }
                            @if (pet().petAlerts.flags.length > 0) {
                                <app-pet-alert-badges [alerts]="pet().petAlerts" />
                            }
                        </div>
                        @if (pet().petAlerts.note; as alertNote) {
                            <p class="m-0 mt-2 text-sm" data-testid="alert-note">{{ alertNote }}</p>
                        }
                    }
                </div>
                <div class="flex flex-wrap gap-2 items-center w-full @md:w-auto @md:ml-auto">
                    <ng-content select="[editAction]" />
                </div>
            </div>

            <app-card-account-status variant="grid" [balance]="balance()" [nextAppointment]="nextAppointment()">
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
                                <span class="field-empty">Yok</span>
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

    readonly speciesIcon = computed(() => speciesEmoji(this.pet().speciesName));
    /** Tür · ırk · cinsiyet · yaş · kilo (ölçülen varsa) · çip. */
    readonly identityLine = computed(() => petIdentityParts(this.pet(), this.summary()?.latestWeight.data?.weightKg ?? null).join(' · '));
    readonly phone = computed(() => formatClientPhoneForDisplay(this.pet().clientPhone));
    readonly phoneHref = computed(() => clientPhoneTelHref(this.pet().clientPhone));

    careLabel(status: string | null): string | null {
        return status && KNOWN_CARE_STATUSES.has(status) ? careStatusLabel(status as VisitCareStatus) : null;
    }
}
