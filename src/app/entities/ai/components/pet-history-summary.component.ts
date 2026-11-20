import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AiDraftNoticeComponent } from '@/app/entities/ai/components/ai-draft-notice.component';
import { AiSourceLinkComponent } from '@/app/entities/ai/components/ai-source-link.component';
import type { PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';
import { aiDayMonthYearLabel } from '@/app/entities/ai/utils/ai-labels';
import { formatTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Hasta geçmişi özetinin gövdesi (AI-002): şerit, kapsam satırı, gerektiğinde kapsam notları, sabit sıralı bölümler ve her maddenin
 * altında kaynak çipleri. Kayda geçmez; kaydetme düğmesi yoktur.
 */
@Component({
    selector: 'app-pet-history-summary',
    standalone: true,
    imports: [AiDraftNoticeComponent, AiSourceLinkComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let s = summary();
        <div class="flex flex-col gap-3">
            <app-ai-draft-notice text="Yalnız bu klinikteki kayıtlardan hazırlandı ve kaydedilmez. Tanı ya da tedavi önermez; her maddenin kaynağını açıp doğrulayın." />

            <div class="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-color" data-testid="ai-summary-coverage">
                @if (rangeLabel(); as range) {
                    <span
                        ><i class="pi pi-calendar mr-1 text-[0.75rem]" aria-hidden="true"></i><b class="text-color font-semibold">{{ range }}</b></span
                    >
                }
                <span
                    ><b class="text-color font-semibold">{{ s.coverage.recordCount }} kayıt{{ s.coverage.countsLabel ? ':' : '' }}</b> {{ s.coverage.countsLabel }}</span
                >
                <span>Hazırlandı {{ generatedAt() }}</span>
            </div>

            @if (s.coverage.omittedTypesLabel; as omitted) {
                <p class="ai-cnote" data-testid="ai-summary-omitted">
                    <i class="pi pi-lock" aria-hidden="true"></i
                    ><span
                        >Görme yetkiniz olmadığı için <b>{{ omitted }}</b> kayıtları özete girmedi.</span
                    >
                </p>
            }
            @if (s.coverage.truncated) {
                <p class="ai-cnote" data-testid="ai-summary-truncated">
                    <i class="pi pi-history" aria-hidden="true"></i><span>Geçmiş uzun olduğu için en eski kayıtlar özete sığmadı{{ fromLabel() ? '; özet ' + fromLabel() + ' tarihinden başlıyor' : '' }}.</span>
                </p>
            }
            @if (s.droppedItemCount > 0) {
                <p class="ai-cnote" data-testid="ai-summary-dropped">
                    <i class="pi pi-filter-slash" aria-hidden="true"></i><span>Kaynağı doğrulanamayan {{ s.droppedItemCount }} madde özetten çıkarıldı.</span>
                </p>
            }

            <div class="flex flex-col gap-3.5 mt-1">
                @for (sec of s.sections; track sec.kind) {
                    <section [attr.aria-label]="sec.title" [attr.data-testid]="'ai-summary-section-' + sec.kind">
                        <h3 class="m-0 mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" [class]="sec.isAlert ? 'text-red-700 dark:text-red-400' : 'text-muted-color'">
                            @if (sec.isAlert) {
                                <i class="pi pi-exclamation-triangle text-[0.75rem]" aria-hidden="true"></i>
                            }
                            {{ sec.title }} <span class="font-semibold text-surface-400" [attr.aria-label]="sec.items.length + ' madde'">{{ sec.items.length }}</span>
                        </h3>
                        <ul class="m-0 p-0 list-none flex flex-col gap-2">
                            @for (item of sec.items; track $index) {
                                <li class="pl-3 border-l-2 text-sm" [class]="sec.isAlert ? 'border-red-600 dark:border-red-400' : 'border-surface'">
                                    {{ item.text }}
                                    @if (item.sources.length) {
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            @for (src of item.sources; track src.type + src.id) {
                                                <app-ai-source-link [source]="src" />
                                            }
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                    </section>
                }
            </div>

            @if (usageWarning(); as warning) {
                <p class="ai-cnote ai-cnote-warn" data-testid="ai-usage-warning">
                    <i class="pi pi-chart-pie" aria-hidden="true"></i><span>{{ warning }}</span>
                </p>
            }
        </div>
    `,
    styles: `
        .ai-cnote {
            display: flex;
            gap: 0.5rem;
            align-items: flex-start;
            margin: 0;
            padding: 0.5rem 0.75rem;
            font-size: 0.8572rem;
            color: var(--text-color-secondary);
            background: var(--p-content-hover-background);
            border: 1px solid var(--p-content-border-color);
            border-radius: var(--p-border-radius-md);
        }

        .ai-cnote > i {
            margin-top: 0.15rem;
            font-size: 0.8rem;
        }

        .ai-cnote-warn {
            color: var(--text-color);
            background: color-mix(in srgb, var(--p-amber-500), transparent 88%);
            border-color: transparent;
        }

        .ai-cnote-warn > i {
            color: var(--p-amber-600);
        }
    `
})
export class PetHistorySummaryComponent {
    readonly summary = input.required<PetHistorySummaryVm>();
    /** %80 ve üstünde kliniğin kullanım uyarısı; işi bölmesin diye sonucun altında durur. */
    readonly usageWarning = input<string | null>(null);

    protected readonly fromLabel = computed(() => aiDayMonthYearLabel(this.summary().coverage.fromUtc));

    protected readonly rangeLabel = computed(() => {
        const from = this.fromLabel();
        const to = aiDayMonthYearLabel(this.summary().coverage.toUtc);

        return from && to ? (from === to ? from : `${from} – ${to}`) : (from ?? to);
    });

    protected readonly generatedAt = computed(() => formatTimeDisplay(this.summary().generatedAtUtc));
}
