import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { FINALIZED_LOCK_MESSAGE, type FinalizeCheckItem } from '@/app/features/examinations/utils/examination-procedures.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Muayene çalışma alanının sağ paneli: kesinleştirme kontrol listesi (ADR-020 karar 4). Maddeler uyarıdır, engel değildir;
 * kesinleştirme onayı aynı kuralı (`finalizeChecklist`) kullanır. Kesinleşmiş muayenede kilit nedeni gösterilir (ADR-013).
 * "Kesinleştir" düğmesi listenin altındadır: karar uyarıların okunduğu yerde verilir (ADR-027).
 */
@Component({
    selector: 'app-examination-finalize-checklist',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    template: `
        <section class="card mb-0 p-4" aria-label="Kesinleştirme kontrolü" data-testid="finalize-checklist">
            @if (exam().status === 'Finalized') {
                <h5 class="mt-0 mb-2">Kesinleşti</h5>
                <p class="text-sm text-muted-color m-0">
                    {{ formatDateTime(exam().finalizedAtUtc) }}@if (exam().finalizedByName) {
                        · {{ exam().finalizedByName }}
                    }
                </p>
                <p class="text-sm text-muted-color mt-2 mb-0" role="note"><i class="pi pi-lock text-xs mr-1"></i>{{ lockMessage }}</p>
            } @else {
                <h5 class="mt-0 mb-1">Kesinleştirme kontrolü</h5>
                <p class="text-sm text-muted-color mt-0 mb-0">Uyarılar kesinleştirmeyi engellemez.</p>
            }
            @if (visibleItems().length > 0) {
                <ul class="list-none mt-3 mb-0 p-0 space-y-2 text-sm">
                    @for (item of visibleItems(); track item.key) {
                        <li class="flex items-start gap-2" [attr.data-testid]="'check-' + item.key" [attr.data-ok]="item.ok">
                            @if (item.ok) {
                                <i class="pi pi-check-circle text-green-600 dark:text-green-400 mt-0.5" aria-label="Tamam"></i>
                                <span>{{ item.okLabel }}</span>
                            } @else {
                                <i class="pi pi-exclamation-circle text-orange-600 dark:text-orange-400 mt-0.5" aria-label="Uyarı"></i>
                                <span class="min-w-0">
                                    {{ item.warning }}
                                    @if (item.key === 'pendingCharges') {
                                        <a
                                            routerLink="/panel/charges/pending"
                                            [queryParams]="{ examinationId: exam().id }"
                                            class="text-primary font-medium no-underline block"
                                            data-testid="pending-charges-link"
                                            >Ücretlendir →</a
                                        >
                                    }
                                </span>
                            }
                        </li>
                    }
                </ul>
            }
            @if (canFinalize()) {
                <button
                    pButton
                    type="button"
                    label="Kesinleştir"
                    icon="pi pi-lock"
                    class="w-full mt-3"
                    data-testid="finalize-open"
                    (click)="finalizeRequested.emit()"
                ></button>
            }
        </section>
    `
})
export class ExaminationFinalizeChecklistComponent {
    readonly exam = input.required<ExaminationDetailVm>();
    readonly items = input<readonly FinalizeCheckItem[]>([]);
    /** Görünürlük kuralı sayfadadır (yetki, taslak, salt okunur kurum); kart yalnız düğmeyi gösterir (ADR-027). */
    readonly canFinalize = input(false);
    readonly finalizeRequested = output<void>();

    /** Kesinleşince yalnız hâlâ iş doğuran madde (ücret bekleyen) kalır; diğerleri artık değiştirilemez. */
    readonly visibleItems = computed(() =>
        this.exam().status === 'Finalized' ? this.items().filter((i) => i.key === 'pendingCharges' && !i.ok) : this.items()
    );

    readonly lockMessage = FINALIZED_LOCK_MESSAGE;
    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
}
