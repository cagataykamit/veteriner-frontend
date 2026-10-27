import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TodayOpenItemsVm } from '@/app/entities/visit/models/visit-vm.model';
import { formatMoney } from '@/app/shared/utils/money.utils';

interface OpenItemEntry {
    key: string;
    icon: string;
    text: string;
    title: string;
    /** Yalnızca mevcut bir liste sayfası varsa; süzgeçli liste ucu yoktur (`OPEN_ITEMS_API_CONTRACT.md` §7.7). */
    link: string | null;
    queryParams?: Record<string, string>;
    tone: string;
}

const TONE_DANGER = 'text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
const TONE_WARN = 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
const TONE_MUTED = 'text-muted-color border-surface-300 dark:border-surface-700';

/**
 * Bugün üstü "Açık işler" şeridi: klinik geneli, tarih ve hekim süzgecinden bağımsız özet.
 * Yalnızca sıfırdan büyük sayılar görünür (ücret yok ve lab öne); `null` alan (yetki yok) hiç gösterilmez.
 * Ücretsiz ziyaret ve tamamlanmamış geliş için liste sayfası yoktur: bağlantısız metin.
 */
@Component({
    selector: 'app-today-open-items',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="flex flex-wrap items-center gap-2 mb-4" aria-label="Açık işler" data-testid="open-items-strip">
            <span class="text-sm font-medium">Açık işler</span>
            @for (e of entries(); track e.key) {
                @if (e.link; as link) {
                    <a [routerLink]="link" [queryParams]="e.queryParams ?? null" [attr.title]="e.title" class="inline-flex items-center gap-1 rounded-border border px-2 py-0.5 text-sm no-underline" [class]="e.tone">
                        <i [class]="e.icon" aria-hidden="true"></i>{{ e.text }}
                    </a>
                } @else {
                    <span [attr.title]="e.title" class="inline-flex items-center gap-1 rounded-border border px-2 py-0.5 text-sm" [class]="e.tone"> <i [class]="e.icon" aria-hidden="true"></i>{{ e.text }} </span>
                }
            } @empty {
                <span class="inline-flex items-center gap-1 text-sm text-muted-color"><i class="pi pi-check" aria-hidden="true"></i>Açık iş yok</span>
            }
        </section>
    `
})
export class TodayOpenItemsComponent {
    readonly summary = input.required<TodayOpenItemsVm>();

    readonly entries = computed<OpenItemEntry[]>(() => {
        const s = this.summary();
        const out: OpenItemEntry[] = [];

        if ((s.unchargedVisitCount ?? 0) > 0) {
            out.push({
                key: 'uncharged',
                icon: 'pi pi-exclamation-circle',
                text: `Ücret yok: ${s.unchargedVisitCount} ziyaret`,
                title: 'Son 30 günde işlem yapılmış ama ücret kaydı olmayan ziyaret',
                link: null,
                tone: TONE_DANGER
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

        if (s.incompleteVisitCount > 0) {
            out.push({
                key: 'incomplete',
                icon: 'pi pi-history',
                text: `Önceki günden açık geliş: ${s.incompleteVisitCount}`,
                title: 'Önceki günlerden tamamlanmadan kalan geliş',
                link: null,
                tone: TONE_MUTED
            });
        }

        return out;
    });
}
