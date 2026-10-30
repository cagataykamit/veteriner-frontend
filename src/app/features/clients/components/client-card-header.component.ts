import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import type { ChargeSuggestionsPagedVm } from '@/app/entities/charge/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/entities/client/models/client-balance-vm.model';
import type { ClientDetailVm } from '@/app/entities/client/models/client-vm.model';
import { pendingChargesSummary } from '@/app/features/clients/utils/client-card.utils';
import { clientContactChannelLabel } from '@/app/entities/client/utils/client-contact-preference.utils';
import { formatClientInvoicingSummary } from '@/app/entities/client/utils/client-invoicing.utils';
import { kvkkConsentStatusLabel } from '@/app/entities/client/utils/client-kvkk-consent.utils';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { kvkkTextVersionLabel } from '@/app/entities/kvkk/utils/kvkk-form.utils';
import { CardAccountStatusComponent } from '@/app/entities/patient/components/card-account-status.component';
import type { PetCardSection } from '@/app/entities/patient/utils/pet-card.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { clientPhoneTelHref, formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** KVKK rıza rozeti: durum rengi (kabul yeşil, ret amber, yok nötr). */
const KVKK_CHIP_CLASS: Record<'Accepted' | 'Declined' | 'None', string> = {
    Accepted: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400',
    Declined: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    None: 'border-surface-300 bg-surface-50 text-color dark:border-surface-600 dark:bg-surface-800'
};

/**
 * Müşteri kimlik kartı (ADR-020 karar 6): baş harf avatarı, ad, kayıt/güncellenme satırı, "Düzenle" (`[editAction]`, yetki sayfada),
 * iletişim (aranabilir telefon öne çıkar, e-posta, adres, tercih edilen kanal; hatırlatma istemiyorsa belirgin not),
 * durum rozetleri ve gösterge şeridi (açık borç, ücret bekleyen işlem, son muayene, sonraki randevu).
 * KVKK açık rıza (ADR-021) rozet + ayrıntı: durum, form tarihi, işaretleyen ve işaretleme anındaki metin sürümü (ADR-032); işaretleme eylemi `[kvkkAction]` ile sayfadan yansıtılır (yetki sayfada).
 * "Fatura bilgileri" satırı (ADR-036): kişi türü, unvan, TCKN/VKN yalnız maskeli, vergi dairesi ve fatura adresi.
 */
@Component({
    selector: 'app-client-card-header',
    standalone: true,
    imports: [RouterLink, CardAccountStatusComponent, MoneyPipe, TrDatePipe, TrDateTimePipe],
    /** `.card:last-child` alt boşluğu sıfırladığından boşluk ana öğede (bölüm bileşenin tek çocuğu). */
    host: { class: 'block mb-4' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card mb-0 @container" aria-label="Müşteri kimliği ve hesap durumu" data-testid="client-card-header">
            <div class="flex flex-wrap items-start gap-x-5 gap-y-3">
                <div class="shrink-0 flex items-center justify-center w-14 h-14 rounded-full text-lg font-semibold tracking-tight bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200" aria-hidden="true">
                    {{ initials() }}
                </div>
                <div class="min-w-0 flex-1 basis-56">
                    <h1 class="m-0 text-2xl font-semibold leading-tight text-surface-900 dark:text-surface-0 break-words" data-testid="client-name">{{ client().fullName }}</h1>
                    <p class="m-0 mt-1 text-sm text-muted-color" data-testid="client-registration">{{ registrationLine() }}</p>
                </div>
                <div class="flex flex-wrap gap-2 items-center w-full @md:w-auto @md:ml-auto">
                    <ng-content select="[editAction]" />
                </div>
            </div>

            <p class="m-0 mt-4 flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="İletişim">
                @if (phoneHref(); as href) {
                    <a [href]="href" class="text-primary no-underline whitespace-nowrap text-base font-semibold tabular-nums" data-testid="client-phone"><i class="pi pi-phone text-sm mr-1.5" aria-hidden="true"></i>{{ phone() }}</a>
                } @else {
                    <span class="text-muted-color text-base" data-testid="client-phone-missing"><i class="pi pi-phone text-sm mr-1.5" aria-hidden="true"></i>Telefon yok</span>
                }
                @if (hasText(client().email)) {
                    <a [href]="'mailto:' + client().email.trim()" class="text-primary no-underline break-all" data-testid="client-email"><i class="pi pi-envelope text-sm mr-1.5" aria-hidden="true"></i>{{ client().email }}</a>
                }
                @if (hasText(client().address)) {
                    <span class="break-words" data-testid="client-address"><i class="pi pi-map-marker text-sm mr-1.5 text-muted-color" aria-hidden="true"></i>{{ client().address }}</span>
                }
                @if (client().preferredContactChannel !== 'None') {
                    <span class="text-muted-color" data-testid="client-preferred-channel"
                        >Tercih: <span class="font-medium text-color">{{ channelLabel() }}</span></span
                    >
                }
            </p>

            <p class="m-0 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm" aria-label="KVKK açık rıza" data-testid="client-kvkk">
                <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium whitespace-nowrap" [class]="kvkkChipClass()">
                    <i class="pi pi-file-check text-xs" aria-hidden="true"></i>
                    <span class="font-normal">KVKK rıza:</span>
                    <span data-testid="client-kvkk-status">{{ kvkkLabel() }}</span>
                </span>
                @if (client().kvkkConsent.status === 'None') {
                    <span class="text-muted-color">imzalı form alınmadı</span>
                }
                @if (client().kvkkConsent.recordedOn; as on) {
                    <span class="text-muted-color" data-testid="client-kvkk-date">{{ on | trDate }}</span>
                }
                @if (client().kvkkConsent.recordedByName; as by) {
                    <span class="text-muted-color" data-testid="client-kvkk-by">· işaretleyen: {{ by }}</span>
                }
                @if (client().kvkkConsent.status !== 'None') {
                    <span class="text-muted-color" data-testid="client-kvkk-text-version" [attr.title]="kvkkTextHashTitle()">· metin sürümü: {{ kvkkTextVersion() }}</span>
                }
                <ng-content select="[kvkkAction]" />
            </p>
            @if (client().remindersOptedOut) {
                <p class="m-0 mt-2 inline-flex items-center gap-2 rounded-border border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 px-2.5 py-1 text-sm font-medium text-amber-800 dark:text-amber-300" role="note" data-testid="client-reminders-opted-out">
                    <i class="pi pi-bell-slash text-xs" aria-hidden="true"></i>Otomatik hatırlatma istemiyor: aşı ve randevu hatırlatma e-postaları gönderilmez.
                </p>
            }
            @if (invoicingSummary(); as summary) {
                <p class="m-0 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Fatura bilgileri" data-testid="client-invoicing">
                    <span class="text-muted-color"><i class="pi pi-id-card mr-1" aria-hidden="true"></i>Fatura bilgileri:</span>
                    <span class="font-medium break-words" data-testid="client-invoicing-summary">{{ summary }}</span>
                </p>
            }

            <app-card-account-status variant="grid" [balance]="balance()" [nextAppointment]="nextAppointment()">
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
                                                <span class="tabular-nums" data-testid="pending-amount"> · {{ s.partial ? 'en az ' : '' }}{{ s.amount | money: s.currency }}</span>
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
                                        <a [routerLink]="['/panel/examinations', exam.id]" class="text-primary font-medium no-underline">{{ exam.examinedAtUtc | trDateTime }}</a>
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
    /** Müşteri son özetinden; `ok` + `null` = kayıt yok. */
    readonly lastExamination = input<PetCardSection<ExaminationListItemVm | null>>(null);
    readonly nextAppointment = input<PetCardSection<AppointmentListItemVm | null>>(null);

    readonly hasText = (v: string | null | undefined) => !!v && !!v.trim() && v.trim() !== '—';

    /** Avatar: adın ilk iki sözcüğünün baş harfleri (tek sözcükte ilk harf). */
    readonly initials = computed(() => {
        const parts = this.client().fullName.trim().split(/\s+/).filter(Boolean);

        return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : (parts[0]?.[0] ?? '')).toLocaleUpperCase('tr-TR');
    });
    readonly registrationLine = computed(() => {
        const c = this.client();
        const created = `Kayıt: ${formatUtcIsoAsLocalDateTimeDisplay(c.createdAtUtc)}`;

        return c.updatedAtUtc ? `${created} · Güncellenme: ${formatUtcIsoAsLocalDateTimeDisplay(c.updatedAtUtc)}` : created;
    });
    readonly phone = computed(() => formatClientPhoneForDisplay(this.client().phone));
    readonly phoneHref = computed(() => clientPhoneTelHref(this.client().phone));
    readonly channelLabel = computed(() => clientContactChannelLabel(this.client().preferredContactChannel));
    readonly kvkkLabel = computed(() => kvkkConsentStatusLabel(this.client().kvkkConsent.status));
    readonly kvkkChipClass = computed(() => KVKK_CHIP_CLASS[this.client().kvkkConsent.status]);
    readonly kvkkTextVersion = computed(() => kvkkTextVersionLabel(this.client().kvkkConsent.templateVersion));
    /** Tam özet ipucu olarak (ispat için karşılaştırılır); bilinmiyorsa ipucu yok. */
    readonly kvkkTextHashTitle = computed(() => {
        const hash = this.client().kvkkConsent.templateHash;

        return hash ? `Metin özeti (SHA-256): ${hash}` : null;
    });
    /** Maskeli fatura kimliği (ADR-036); bilgi yoksa satır yok. */
    readonly invoicingSummary = computed(() => {
        const invoicing = this.client().invoicing;

        return invoicing ? formatClientInvoicingSummary(invoicing) : null;
    });
}
