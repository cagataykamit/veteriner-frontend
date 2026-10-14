import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { CardAccountStatusComponent } from '@/app/features/pets/components/card-account-status.component';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { clientPhoneTelHref, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

/**
 * Müşteri kartı başlığı (ADR-020 karar 6): iletişim (aranabilir telefon, e-posta, adres) ve hesap durumu
 * (açık borç, ücret bekleyen işlem, son muayene, sonraki randevu). Ad ve "Düzenle" sayfa başlığındadır.
 * İletişim tercihi alanı sözleşmede yok; eklenince burada gösterilir.
 */
@Component({
    selector: 'app-client-card-header',
    standalone: true,
    imports: [RouterLink, CardAccountStatusComponent],
    template: `
        <section class="card mb-4" aria-label="İletişim ve hesap durumu" data-testid="client-card-header">
            <p class="m-0 flex flex-wrap gap-x-6 gap-y-1" aria-label="İletişim">
                @if (phoneHref(); as href) {
                    <a [href]="href" class="text-primary no-underline whitespace-nowrap" data-testid="client-phone"><i class="pi pi-phone text-sm mr-1" aria-hidden="true"></i>{{ phone() }}</a>
                } @else {
                    <span class="text-muted-color" data-testid="client-phone-missing"><i class="pi pi-phone text-sm mr-1" aria-hidden="true"></i>Telefon yok</span>
                }
                @if (hasText(client().email)) {
                    <a [href]="'mailto:' + client().email.trim()" class="text-primary no-underline break-all" data-testid="client-email"
                        ><i class="pi pi-envelope text-sm mr-1" aria-hidden="true"></i>{{ client().email }}</a
                    >
                }
                @if (hasText(client().address)) {
                    <span class="break-words" data-testid="client-address"><i class="pi pi-map-marker text-sm mr-1 text-muted-color" aria-hidden="true"></i>{{ client().address }}</span>
                }
            </p>

            <app-card-account-status [balance]="balance()" [nextAppointment]="nextAppointment()">
                @if (pendingCharges(); as p) {
                    <div data-testid="account-pending-charges">
                        <dt class="text-muted-color text-sm">Ücret bekleyen</dt>
                        <dd class="m-0">
                            @switch (p.state) {
                                @case ('ok') {
                                    @if (p.data.length > 0) {
                                        <span class="font-semibold text-amber-700 dark:text-amber-400">{{ p.data.length }} işlem</span>
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
                @if (lastExamination(); as e) {
                    <div data-testid="account-last-examination">
                        <dt class="text-muted-color text-sm">Son muayene</dt>
                        <dd class="m-0">
                            @switch (e.state) {
                                @case ('ok') {
                                    @if (e.data; as exam) {
                                        <a [routerLink]="['/panel/examinations', exam.id]" class="text-primary font-medium no-underline">{{ formatDt(exam.examinedAtUtc) }}</a>
                                        @if (hasText(exam.petName)) {
                                            <span class="text-muted-color text-sm"> · {{ exam.petName }}</span>
                                        }
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
            </app-card-account-status>
        </section>
    `
})
export class ClientCardHeaderComponent {
    readonly client = input.required<ClientDetailVm>();
    /** `null` = ücret okuma yetkisi yok (alan gösterilmez). */
    readonly balance = input<PetCardSection<ClientBalanceVm>>(null);
    readonly pendingCharges = input<PetCardSection<ChargeSuggestionVm[]>>(null);
    /** Müşteri son özetinden; `ok` + `null` = kayıt yok. */
    readonly lastExamination = input<PetCardSection<ExaminationListItemVm | null>>(null);
    readonly nextAppointment = input<PetCardSection<AppointmentListItemVm | null>>(null);

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly hasText = (v: string | null | undefined) => !!v && !!v.trim() && v.trim() !== '—';

    readonly phone = computed(() => formatClientPhoneForDisplay(this.client().phone));
    readonly phoneHref = computed(() => clientPhoneTelHref(this.client().phone));
}
