import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OpenItemVisitKind, OpenItemVisitVm, TodayOpenItemsVm } from '@/app/entities/visit/models/visit-vm.model';
import { TodayOpenVisitsChipComponent } from '@/app/features/visits/components/today-open-visits-chip.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Her çip bir yere götürür: mevcut liste sayfasına (`link`) ya da çipten açılan ziyaret listesine (`visits`, `OPEN_ITEMS_API_CONTRACT.md` §10). */
type OpenItemEntry = {
    key: string;
    icon: string;
    text: string;
    title: string;
    tone: string;
} & ({ link: string; queryParams?: Record<string, string>; visits?: never } | { visits: OpenItemVisitKind; link?: never; queryParams?: never });

const TONE_DANGER = 'text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
const TONE_WARN = 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
const TONE_MUTED = 'text-muted-color border-surface-300 dark:border-surface-700';

/**
 * Bugün üstü "Açık işler" şeridi: klinik geneli, tarih ve hekim süzgecinden bağımsız özet.
 * Yalnızca sıfırdan büyük sayılar görünür (ücret yok ve lab öne); `null` alan (yetki yok) hiç gösterilmez.
 * Ücretsiz ziyaret ve tamamlanmamış geliş için liste sayfası yoktur: çip, ziyaretleri küçük bir panelde açar.
 * Satır başına dışarıdan bir çip yansıtılabilir (bekleyen online talepler); özet henüz yoksa (`null`) satır yalnız o çiple çizilir.
 */
@Component({
    selector: 'app-today-open-items',
    standalone: true,
    imports: [RouterLink, TodayOpenVisitsChipComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="flex flex-wrap items-center gap-[6px]" aria-label="Açık işler" data-testid="open-items-strip">
            <span class="text-[13px] font-semibold mr-[2px]">Açık işler</span>
            <ng-content />
            @for (e of entries(); track e.key) {
                @if (e.visits; as kind) {
                    <app-today-open-visits-chip
                        [kind]="kind"
                        [text]="e.text"
                        [title]="e.title"
                        [icon]="e.icon"
                        [tone]="e.tone"
                        [canAddCharge]="canAddCharge()"
                        [canCompleteVisit]="canCompleteVisit()"
                        [canCorrectVisit]="canCorrectVisit()"
                        (complete)="completeVisit.emit($event)"
                        (correct)="correctVisit.emit($event)"
                        (markNoCharge)="markNoCharge.emit($event)"
                    />
                } @else {
                    <a [routerLink]="e.link" [queryParams]="e.queryParams ?? null" [attr.title]="e.title" class="inline-flex items-center gap-1 rounded-border border px-2 py-0.5 text-sm no-underline touch:min-h-(--touch-target)" [class]="e.tone">
                        <i [class]="e.icon" aria-hidden="true"></i>{{ e.text }}
                    </a>
                }
            } @empty {
                @if (!hasLeadingItem()) {
                    <span class="inline-flex items-center gap-1 text-sm text-muted-color"><i class="pi pi-check" aria-hidden="true"></i>Açık iş yok</span>
                }
            }
        </section>
    `
})
export class TodayOpenItemsComponent {
    readonly summary = input<TodayOpenItemsVm | null>(null);
    /** Satır başına çip yansıtılıyor: "Açık iş yok" yazılmaz. */
    readonly hasLeadingItem = input(false);
    /** Ücret yok listesinde "Ücret ekle" (ücret oluşturma yetkisi, salt okunur değil). */
    readonly canAddCharge = input(false);
    /** Açık geliş listesinde Tamamla (`Visits.Update`, salt okunur değil). */
    readonly canCompleteVisit = input(false);
    /** Açık geliş listesinde Düzelt (`Visits.Correct`, salt okunur değil). */
    readonly canCorrectVisit = input(false);
    readonly completeVisit = output<OpenItemVisitVm>();
    readonly correctVisit = output<OpenItemVisitVm>();
    /** "Ücret yok" listesinde tamamlanmış gelişi ücretsiz işaretle. */
    readonly markNoCharge = output<OpenItemVisitVm>();

    readonly entries = computed<OpenItemEntry[]>(() => {
        const s = this.summary();
        const out: OpenItemEntry[] = [];

        if (!s) {
            return out;
        }

        if ((s.unchargedVisitCount ?? 0) > 0) {
            out.push({
                key: 'uncharged',
                icon: 'pi pi-exclamation-circle',
                text: `Ücret yok: ${s.unchargedVisitCount} ziyaret`,
                title: 'Son 30 günde işlem yapılmış ama ücret kaydı olmayan ziyaret',
                visits: 'Uncharged',
                tone: TONE_DANGER
            });
        }

        // Ziyarette tek ücret olsa da kalan kalemler kaybolmasın (OPEN_ITEMS madde 1b): Ücretlendir ekranına gider.
        if ((s.pendingChargeItemCount ?? 0) > 0) {
            out.push({
                key: 'pendingCharges',
                icon: 'pi pi-receipt',
                text: `Ücret bekliyor: ${s.pendingChargeItemCount} kalem`,
                title: 'Son 30 günde ücrete çevrilmeyi bekleyen kalemler (Ücretlendir ekranı)',
                link: '/panel/charges/pending',
                tone: TONE_WARN
            });
        }

        if ((s.awaitingLabCount ?? 0) > 0) {
            out.push({
                key: 'lab',
                icon: 'pi pi-clock',
                text: `Lab bekliyor: ${s.awaitingLabCount}`,
                title: 'Sonucu girilmemiş lab istekleri (Lab sonuçları sayfası)',
                link: '/panel/lab-results',
                tone: TONE_DANGER
            });
        }

        if ((s.outstandingVisitCount ?? 0) > 0) {
            const amount = s.outstandingAmount != null ? ` · ${formatMoney(s.outstandingAmount, 'TRY')}` : '';

            out.push({
                key: 'outstanding',
                icon: 'pi pi-wallet',
                text: `Ödeme bekliyor: ${s.outstandingVisitCount} ziyaret${amount}`,
                title: 'Tamamlanmış ama ödemesi açık ziyaretler (Borçlu müşteriler raporu)',
                link: '/panel/reports/outstanding-balances',
                tone: TONE_WARN
            });
        }

        // HBS (ADR-036 Dilim 2): nötr dil; süzgeçli listeye gider (Kayıtlar > Reçeteler / Aşılar, yeni menü öğesi yok).
        if ((s.hbsNotEnteredPrescriptionCount ?? 0) > 0) {
            out.push({
                key: 'hbsPrescriptions',
                icon: 'pi pi-file-edit',
                text: `HBS'e girilmedi: ${s.hbsNotEnteredPrescriptionCount} reçete`,
                title: "Son 30 günde HBS'e girildi veya gerekmiyor olarak işaretlenmemiş reçeteler",
                link: '/panel/prescriptions',
                queryParams: { hbsStatus: 'NotEntered' },
                tone: TONE_WARN
            });
        }

        if ((s.hbsNotEnteredVaccinationCount ?? 0) > 0) {
            out.push({
                key: 'hbsVaccinations',
                icon: 'pi pi-shield',
                text: `HBS'e girilmedi: ${s.hbsNotEnteredVaccinationCount} aşı`,
                title: "Son 30 günde uygulanan ve HBS'e girildi veya gerekmiyor olarak işaretlenmemiş aşılar",
                link: '/panel/vaccinations',
                queryParams: { hbsStatus: 'NotEntered' },
                tone: TONE_WARN
            });
        }

        // Zamanı geçmiş randevu (ADR-052 K5; Özet'ten taşındı): önceki günlerden kalan planlı randevu, takvimde "Gecikmiş" süzgeciyle açılır.
        // Bugünün saati geçmiş randevusu zaten listede görünür; gelişi açılmış olan aşağıdaki "açık geliş"tedir.
        if ((s.overdueAppointmentCount ?? 0) > 0) {
            out.push({
                key: 'overdueAppointments',
                icon: 'pi pi-calendar-times',
                text: `Gecikmiş randevu: ${s.overdueAppointmentCount}`,
                title: 'Önceki günlerden kalan, gelinmemiş ve hâlâ planlı randevular (son 30 gün; Randevu takvimi)',
                link: '/panel/appointments/calendar',
                queryParams: { view: 'month', states: 'Overdue' },
                tone: TONE_WARN
            });
        }

        if (s.incompleteVisitCount > 0) {
            out.push({
                key: 'incomplete',
                icon: 'pi pi-history',
                text: `Önceki günden açık geliş: ${s.incompleteVisitCount}`,
                title: 'Önceki günlerden tamamlanmadan kalan geliş',
                visits: 'Incomplete',
                tone: TONE_MUTED
            });
        }

        return out;
    });
}
