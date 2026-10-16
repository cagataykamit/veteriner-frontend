import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ChargeSuggestionsPagedVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { pendingChargesSummary } from '@/app/features/clients/utils/client-card.utils';
import { clientContactChannelLabel } from '@/app/features/clients/utils/client-contact-preference.utils';
import { kvkkConsentStatusLabel } from '@/app/features/clients/utils/client-kvkk-consent.utils';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { kvkkTextVersionLabel } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { CardAccountStatusComponent } from '@/app/features/pets/components/card-account-status.component';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { formatDateDisplay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { clientPhoneTelHref, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

/**
 * Müşteri kartı başlığı (ADR-020 karar 6): iletişim (aranabilir telefon, e-posta, adres, tercih edilen kanal; hatırlatma istemiyorsa belirgin not)
 * ve hesap durumu (açık borç, ücret bekleyen işlem, son muayene, sonraki randevu). Ad ve "Düzenle" sayfa başlığındadır.
 * KVKK açık rıza satırı (ADR-021): durum, form tarihi, işaretleyen ve işaretleme anındaki metin sürümü (ADR-032); işaretleme eylemi `[kvkkAction]` ile sayfadan yansıtılır (yetki sayfada).
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
                @if (client().preferredContactChannel !== 'None') {
                    <span class="text-muted-color" data-testid="client-preferred-channel">Tercih: <span class="font-medium text-color">{{ channelLabel() }}</span></span>
                }
            </p>
            @if (client().remindersOptedOut) {
                <p
                    class="m-0 mt-2 inline-flex items-center gap-2 rounded-border border border-amber-300 dark:border-amber-700 px-2 py-1 text-sm font-medium text-amber-800 dark:text-amber-300"
                    role="note"
                    data-testid="client-reminders-opted-out"
                >
                    <i class="pi pi-bell-slash" aria-hidden="true"></i>Otomatik hatırlatma istemiyor: aşı ve randevu hatırlatma e-postaları gönderilmez.
                </p>
            }
            <p class="m-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="KVKK açık rıza" data-testid="client-kvkk">
                <span class="text-muted-color"><i class="pi pi-file-check mr-1" aria-hidden="true"></i>KVKK açık rıza:</span>
                @switch (client().kvkkConsent.status) {
                    @case ('Accepted') {
                        <span class="font-medium text-green-700 dark:text-green-400" data-testid="client-kvkk-status">{{ kvkkLabel() }}</span>
                    }
                    @case ('Declined') {
                        <span class="font-medium text-amber-800 dark:text-amber-300" data-testid="client-kvkk-status">{{ kvkkLabel() }}</span>
                    }
                    @default {
                        <span class="font-medium" data-testid="client-kvkk-status">{{ kvkkLabel() }}</span>
                        <span class="text-muted-color">· imzalı form alınmadı</span>
                    }
                }
                @if (client().kvkkConsent.recordedOn; as on) {
                    <span class="text-muted-color" data-testid="client-kvkk-date">· {{ formatDate(on) }}</span>
                }
                @if (client().kvkkConsent.recordedByName; as by) {
                    <span class="text-muted-color" data-testid="client-kvkk-by">· işaretleyen: {{ by }}</span>
                }
                @if (client().kvkkConsent.status !== 'None') {
                    <span class="text-muted-color" data-testid="client-kvkk-text-version" [attr.title]="kvkkTextHashTitle()">· metin sürümü: {{ kvkkTextVersion() }}</span>
                }
                <ng-content select="[kvkkAction]" />
            </p>

            <app-card-account-status [balance]="balance()" [nextAppointment]="nextAppointment()">
                @if (pendingCharges(); as p) {
                    <div data-testid="account-pending-charges">
                        <dt class="text-muted-color text-sm">Ücret bekleyen</dt>
                        <dd class="m-0">
                            @switch (p.state) {
                                @case ('ok') {
                                    @if (pendingSummary(); as s) {
                                        @if (s.count > 0) {
                                            <span class="font-semibold text-amber-700 dark:text-amber-400">{{ s.count }} işlem</span>
                                            @if (s.amount > 0) {
                                                <span class="tabular-nums" data-testid="pending-amount"> · {{ s.partial ? 'en az ' : '' }}{{ money(s.amount, s.currency) }}</span>
                                            }
                                            @if (s.unpricedCount > 0) {
                                                <span class="block text-muted-color text-sm" data-testid="pending-unpriced">{{ s.unpricedCount }} kalem fiyat bekliyor</span>
                                            }
                                        } @else {
                                            <span class="text-muted-color">Yok</span>
                                        }
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
    /** Müşteri süzgeçli öneri sayfası; sayı `totalItems`, tutar sayfadan (`pendingChargesSummary`). */
    readonly pendingCharges = input<PetCardSection<ChargeSuggestionsPagedVm>>(null);
    readonly pendingSummary = computed(() => {
        const p = this.pendingCharges();

        return p?.state === 'ok' ? pendingChargesSummary(p.data) : null;
    });
    readonly money = formatMoney;
    /** Müşteri son özetinden; `ok` + `null` = kayıt yok. */
    readonly lastExamination = input<PetCardSection<ExaminationListItemVm | null>>(null);
    readonly nextAppointment = input<PetCardSection<AppointmentListItemVm | null>>(null);

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly hasText = (v: string | null | undefined) => !!v && !!v.trim() && v.trim() !== '—';

    readonly phone = computed(() => formatClientPhoneForDisplay(this.client().phone));
    readonly phoneHref = computed(() => clientPhoneTelHref(this.client().phone));
    readonly channelLabel = computed(() => clientContactChannelLabel(this.client().preferredContactChannel));
    readonly kvkkLabel = computed(() => kvkkConsentStatusLabel(this.client().kvkkConsent.status));
    readonly kvkkTextVersion = computed(() => kvkkTextVersionLabel(this.client().kvkkConsent.templateVersion));
    /** Tam özet ipucu olarak (ispat için karşılaştırılır); bilinmiyorsa ipucu yok. */
    readonly kvkkTextHashTitle = computed(() => {
        const hash = this.client().kvkkConsent.templateHash;

        return hash ? `Metin özeti (SHA-256): ${hash}` : null;
    });
    readonly formatDate = (v: string) => formatDateDisplay(v);
}
