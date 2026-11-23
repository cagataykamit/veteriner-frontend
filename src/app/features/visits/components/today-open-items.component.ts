import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OpenItemVisitKind, OpenItemVisitVm, TodayOpenItemsVm } from '@/app/entities/visit/models/visit-vm.model';
import { TodayOpenVisitsChipComponent } from '@/app/features/visits/components/today-open-visits-chip.component';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Her çip bir yere götürür: mevcut liste sayfasına (`link`) ya da çipten açılan ziyaret listesine (`visits`, `OPEN_ITEMS_API_CONTRACT.md` §10). */
type OpenItemEntry = {
    key: string;
    icon: string;
    label: string;
    value: string;
    title: string;
    /** Bugünün işini en çok etkileyen (ücret yok, lab bekliyor): kırmızı dolgulu çip, en başta. */
    hot: boolean;
} & ({ link: string; queryParams?: Record<string, string>; visits?: never } | { visits: OpenItemVisitKind; link?: never; queryParams?: never });

/** Çip görünümü tek yerde (B-02 seçenek B'nin ton kuralı): kırmızı yalnız sıcak işte, diğerleri sakin çerçeve; telefonda 44 px. */
const CHIP_BASE = 'inline-flex items-center gap-[6px] rounded-border border px-[10px] min-h-[28px] text-sm whitespace-nowrap no-underline cursor-pointer touch:min-h-(--touch-target)';
const CHIP_HOT = `${CHIP_BASE} bg-red-50 border-red-300 text-red-700 dark:bg-red-400/10 dark:border-red-800 dark:text-red-300`;
const CHIP_CALM = `${CHIP_BASE} bg-surface-0 border-surface-300 text-color dark:bg-surface-900 dark:border-surface-600 [&>i]:text-muted-color`;

/**
 * Bugün üstü "Açık işler" şeridi: klinik geneli, tarih ve hekim filtresinden bağımsız, yalnız bugünün işini etkileyen sayılar.
 * Birikmiş işler (HBS'e girilmeyen reçete/aşı, gecikmiş randevu) Rapor Merkezi'nin "Bakmanız gerekenler" bandındadır (B-02); burada
 * yalnız toplamları sessiz bir bağlantıdır.
 * Yalnızca sıfırdan büyük sayılar görünür (sıcak olanlar öne); `null` alan (yetki yok) hiç gösterilmez.
 * Ücretsiz ziyaret ve tamamlanmamış geliş için liste sayfası yoktur: çip, ziyaretleri küçük bir panelde açar.
 * Satır başına dışarıdan bir çip yansıtılabilir (bekleyen online talepler); özet henüz yoksa (`null`) satır yalnız o çiple çizilir.
 * Telefonda şerit tek satır özete iner ("Açık işler 3" + en acil iş); dokununca çipler altında alt alta açılır (B-01).
 */
@Component({
    selector: 'app-today-open-items',
    standalone: true,
    imports: [RouterLink, TodayOpenVisitsChipComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section aria-label="Açık işler" data-testid="open-items-strip">
            @if (total() > 0) {
                <button
                    type="button"
                    class="sm:hidden w-full flex items-center gap-2 min-h-(--touch-target) px-3 rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 text-left text-color cursor-pointer"
                    [attr.aria-expanded]="expanded()"
                    aria-controls="todayOpenItemsList"
                    (click)="expanded.set(!expanded())"
                    data-testid="open-items-toggle"
                >
                    <span class="text-sm font-semibold">Açık işler</span>
                    <span class="text-xs font-semibold rounded-full px-2 py-px border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 tabular-nums">{{ total() }}</span>
                    <span class="flex-1 min-w-0 truncate text-sm" data-testid="open-items-top">
                        @if (!expanded() && top(); as t) {
                            <span [class]="t.hot ? 'font-semibold text-danger' : 'text-muted-color'">{{ t.label }}: {{ t.value }}</span>
                        }
                    </span>
                    @if (!expanded() && total() > 1) {
                        <span class="text-xs text-muted-color tabular-nums">+{{ total() - 1 }}</span>
                    }
                    <i class="pi text-xs" [class]="expanded() ? 'pi-chevron-up' : 'pi-chevron-down'" aria-hidden="true"></i>
                </button>
            }
            <div id="todayOpenItemsList" class="flex flex-wrap items-center gap-[6px] max-sm:flex-col max-sm:items-stretch" [class.max-sm:hidden]="total() > 0 && !expanded()" [class.max-sm:mt-2]="total() > 0">
                <span class="text-[13px] font-semibold mr-[2px]" [class.max-sm:hidden]="total() > 0">Açık işler</span>
                <ng-content />
                @for (e of entries(); track e.key) {
                    @if (e.visits; as kind) {
                        <app-today-open-visits-chip
                            [kind]="kind"
                            [label]="e.label"
                            [value]="e.value"
                            [title]="e.title"
                            [icon]="e.icon"
                            [chipClass]="chipClass(e)"
                            [canAddCharge]="canAddCharge()"
                            [canCompleteVisit]="canCompleteVisit()"
                            [canCorrectVisit]="canCorrectVisit()"
                            (complete)="completeVisit.emit($event)"
                            (correct)="correctVisit.emit($event)"
                            (markNoCharge)="markNoCharge.emit($event)"
                        />
                    } @else {
                        <a [routerLink]="e.link" [queryParams]="e.queryParams ?? null" [attr.title]="e.title" [class]="chipClass(e)" [attr.data-testid]="'open-items-link-' + e.key">
                            <i [class]="e.icon" aria-hidden="true"></i>{{ e.label }} <b class="tabular-nums">{{ e.value }}</b>
                        </a>
                    }
                } @empty {
                    @if (!hasLeadingItem()) {
                        <span class="inline-flex items-center gap-1 text-sm text-muted-color"><i class="pi pi-check" aria-hidden="true"></i>Açık iş yok</span>
                    }
                }
                @if (backlogCount() > 0) {
                    <a
                        [routerLink]="reportsRoute"
                        class="inline-flex items-center gap-1 text-sm text-muted-color no-underline hover:underline touch:min-h-(--touch-target) sm:ml-1"
                        title="HBS'e girilmeyen reçete ve aşılar ile gecikmiş randevular: Rapor Merkezi, Bakmanız gerekenler"
                        data-testid="open-items-backlog-link"
                        >Birikmiş {{ backlogCount() }} iş Raporlar'da →</a
                    >
                }
            </div>
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

    /** Telefonda özet satırı açık mı (geniş ekranda çipler hep görünür). */
    readonly expanded = signal(false);

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
                label: 'Ücret yok',
                value: `${s.unchargedVisitCount} geliş`,
                title: 'Son 30 günde işlem yapılmış ama ücret kaydı olmayan geliş',
                visits: 'Uncharged',
                hot: true
            });
        }

        if ((s.awaitingLabCount ?? 0) > 0) {
            out.push({
                key: 'lab',
                icon: 'pi pi-clock',
                label: 'Lab bekliyor',
                value: `${s.awaitingLabCount}`,
                title: 'Sonucu girilmemiş lab istekleri (Lab sonuçları sayfası)',
                link: '/panel/lab-results',
                hot: true
            });
        }

        // Ziyarette tek ücret olsa da kalan kalemler kaybolmasın (OPEN_ITEMS madde 1b): Ücretlendir ekranına gider.
        if ((s.pendingChargeItemCount ?? 0) > 0) {
            out.push({
                key: 'pendingCharges',
                icon: 'pi pi-receipt',
                label: 'Ücret bekliyor',
                value: `${s.pendingChargeItemCount} kalem`,
                title: 'Son 30 günde ücrete çevrilmeyi bekleyen kalemler (Ücretlendir ekranı)',
                link: '/panel/charges/pending',
                hot: false
            });
        }

        if ((s.outstandingVisitCount ?? 0) > 0) {
            const amount = s.outstandingAmount != null ? ` · ${formatMoney(s.outstandingAmount, 'TRY')}` : '';

            out.push({
                key: 'outstanding',
                icon: 'pi pi-wallet',
                label: 'Ödeme bekliyor',
                value: `${s.outstandingVisitCount} geliş${amount}`,
                title: 'Tamamlanmış ama ödemesi açık gelişler (Borçlu müşteriler raporu)',
                link: '/panel/reports/outstanding-balances',
                hot: false
            });
        }

        if (s.incompleteVisitCount > 0) {
            out.push({
                key: 'incomplete',
                icon: 'pi pi-history',
                label: 'Önceki günden açık geliş',
                value: `${s.incompleteVisitCount}`,
                title: 'Önceki günlerden tamamlanmadan kalan geliş',
                visits: 'Incomplete',
                hot: false
            });
        }

        return out;
    });

    readonly reportsRoute = REPORTS_ROUTE;
    /**
     * Birikmiş işler (B-02 A): HBS'e girilmeyen reçete ve aşı ile gecikmiş randevu Bugün'de çip olmaz; toplamı Rapor Merkezi'ne sessiz bir
     * bağlantıdır. Sayı Bugün yanıtındaki alanlardan (bant aynı tanım ve izinle sayar); izin yoksa alan 
ull, toplam 0 ise bağlantı yok.
     */
    readonly backlogCount = computed(() => {
        const s = this.summary();

        return s ? (s.hbsNotEnteredPrescriptionCount ?? 0) + (s.hbsNotEnteredVaccinationCount ?? 0) + (s.overdueAppointmentCount ?? 0) : 0;
    });
    /** Özet satırındaki sayı: çipler ve yansıtılan talep çipi. */
    readonly total = computed(() => this.entries().length + (this.hasLeadingItem() ? 1 : 0));
    /** Özet satırında yazılı kalan iş: ilk sıcak iş, yoksa ilk iş (yalnız talep çipi varsa yazı yok). */
    readonly top = computed(() => this.entries().find((e) => e.hot) ?? this.entries()[0] ?? null);

    chipClass(e: OpenItemEntry): string {
        return `${e.hot ? CHIP_HOT : CHIP_CALM} max-sm:w-full`;
    }
}
