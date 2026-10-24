import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Hasta ve müşteri kartı başlığındaki hesap durumu satırı (ADR-020 karar 2a, 6): açık borç, [kart özgü alanlar], sonraki randevu.
 * Kart özgü alanlar (son geliş, ücret bekleyen vb.) `<div>` + `dt`/`dd` olarak içerik yansıtmasıyla araya girer.
 */
@Component({
    selector: 'app-card-account-status',
    standalone: true,
    imports: [RouterLink, TrDateTimePipe],
    template: `
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
            <ng-content />
            @if (nextAppointment(); as n) {
                <div data-testid="account-next-appointment">
                    <dt class="text-muted-color text-sm">Sonraki randevu</dt>
                    <dd class="m-0">
                        @switch (n.state) {
                            @case ('ok') {
                                @if (n.data; as a) {
                                    <a [routerLink]="['/panel/appointments', a.id]" class="text-primary font-medium no-underline">{{ a.scheduledAtUtc | trDateTime }}</a>
                                    @if (a.petName) {
                                        <span class="text-muted-color text-sm"> · {{ a.petName }}</span>
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
        </dl>
    `
})
export class CardAccountStatusComponent {
    /** Müşterinin bakiyesi; `null` = ücret okuma yetkisi yok (alan gösterilmez). */
    readonly balance = input<PetCardSection<Pick<ClientBalanceVm, 'outstandingAmount' | 'currency'>>>(null);
    /** `null` = randevu okuma yetkisi yok (alan gösterilmez); `ok` + `null` veri = planlı randevu yok. Hayvan adı müşteri kartında verilir. */
    readonly nextAppointment = input<PetCardSection<{ id: string; scheduledAtUtc: string | null; petName?: string } | null>>(null);

    readonly outstanding = computed(() => {
        const b = this.balance();

        return b?.state === 'ok' ? b.data.outstandingAmount : 0;
    });
    readonly outstandingLabel = computed(() => {
        const b = this.balance();

        return b?.state === 'ok' ? formatMoney(b.data.outstandingAmount, b.data.currency || 'TRY') : '';
    });
}
