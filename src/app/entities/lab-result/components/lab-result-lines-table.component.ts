import { CommonModule } from '@angular/common';
import { Component, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { LabParameterHistoryPointVm, LabResultLineVm } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { formatLabNumber, formatLabReferenceRange, labValueFlagLabel, labValueFlagSeverity, labValueTrendIcon, labValueTrendLabel } from '@/app/entities/lab-result/utils/lab-result-lines.utils';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

interface ParameterHistoryState {
    parameterName: string;
    loading: boolean;
    error: string | null;
    points: LabParameterHistoryPointVm[];
}

/**
 * Lab değer satırları (REF-001 Dilim 3): değer, sonuçla gelen referans aralığı, sunucunun hesapladığı işaret ve aynı
 * parametrenin önceki (aynı birimli) değeri. "Geçmiş" o parametrenin hastadaki bütün değerlerini açar. Tanı ya da yorum yok.
 */
@Component({
    selector: 'app-lab-result-lines-table',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, AppStatusTagComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="overflow-x-auto" data-testid="lab-result-lines">
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr class="text-left text-muted-color">
                        <th scope="col" class="font-medium py-1.5 pr-3">Parametre</th>
                        <th scope="col" class="font-medium py-1.5 px-3 text-right">Değer</th>
                        <th scope="col" class="font-medium py-1.5 px-3">Referans</th>
                        <th scope="col" class="font-medium py-1.5 px-3">İşaret</th>
                        <th scope="col" class="font-medium py-1.5 px-3">Önceki sonuç</th>
                        <th scope="col" class="py-1.5 pl-3"><span class="sr-only">Geçmiş</span></th>
                    </tr>
                </thead>
                <tbody>
                    @for (l of lines(); track l.parameterName) {
                        <tr class="border-t border-surface" data-testid="lab-result-line">
                            <th scope="row" class="py-1.5 pr-3 text-left font-medium">{{ l.parameterName }}</th>
                            <td class="py-1.5 px-3 text-right tabular-nums whitespace-nowrap">
                                <span class="font-semibold">{{ num(l.value) }}</span>
                                @if (l.unit) {
                                    <span class="text-muted-color"> {{ l.unit }}</span>
                                }
                            </td>
                            <td class="py-1.5 px-3 tabular-nums text-muted-color whitespace-nowrap">{{ range(l.referenceLow, l.referenceHigh) || '—' }}</td>
                            <td class="py-1.5 px-3">
                                @if (l.flag) {
                                    <app-status-tag [label]="flagLabel(l.flag)" [severity]="flagSeverity(l.flag)" />
                                } @else {
                                    <span class="text-muted-color" title="Referans aralığı girilmedi">—</span>
                                }
                            </td>
                            <td class="py-1.5 px-3 whitespace-nowrap">
                                @if (l.previous; as p) {
                                    @if (l.trend) {
                                        <i [class]="trendIcon(l.trend) + ' text-xs text-muted-color mr-1'" [attr.aria-label]="trendLabel(l.trend)" [title]="trendLabel(l.trend)" role="img"></i>
                                    }
                                    <span class="tabular-nums">{{ num(p.value) }}</span>
                                    <a [routerLink]="['/panel/lab-results', p.labResultId]" class="text-muted-color text-xs ml-1">{{ p.resultDateUtc | trDateTime }}</a>
                                } @else {
                                    <span class="text-muted-color">—</span>
                                }
                            </td>
                            <td class="py-1.5 pl-3 text-right">
                                <button pButton type="button" size="small" [text]="true" severity="secondary" data-testid="lab-line-history" [attr.aria-expanded]="history()?.parameterName === l.parameterName" (click)="toggleHistory(l.parameterName)">
                                    <i class="p-button-icon pi pi-chart-line"></i>Geçmiş
                                </button>
                            </td>
                        </tr>
                        @if (history(); as h) {
                            @if (h.parameterName === l.parameterName) {
                                <tr data-testid="lab-line-history-panel">
                                    <td colspan="6" class="pb-3 pt-1">
                                        <div class="rounded-border bg-surface-50 dark:bg-surface-800 p-3">
                                            @if (h.loading) {
                                                <p class="m-0 text-muted-color">Yükleniyor…</p>
                                            } @else if (h.error) {
                                                <p class="m-0 text-danger" role="alert">{{ h.error }}</p>
                                            } @else {
                                                <p class="m-0 mb-2 text-muted-color">{{ h.parameterName }}: bu hastadaki sonuçlar, yeniden eskiye</p>
                                                <ul class="list-none m-0 p-0 flex flex-col gap-1">
                                                    @for (pt of h.points; track pt.labResultId) {
                                                        <li class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                            <a [routerLink]="['/panel/lab-results', pt.labResultId]" class="tabular-nums">{{ pt.resultDateUtc | trDateTime }}</a>
                                                            <span class="tabular-nums font-medium">{{ num(pt.value) }}{{ pt.unit ? ' ' + pt.unit : '' }}</span>
                                                            @if (pt.flag) {
                                                                <app-status-tag [label]="flagLabel(pt.flag)" [severity]="flagSeverity(pt.flag)" />
                                                            }
                                                            <span class="text-muted-color">{{ pt.testName }}</span>
                                                        </li>
                                                    }
                                                </ul>
                                            }
                                        </div>
                                    </td>
                                </tr>
                            }
                        }
                    }
                </tbody>
            </table>
        </div>
    `
})
export class LabResultLinesTableComponent {
    readonly lines = input.required<LabResultLineVm[]>();
    readonly petId = input.required<string | null>();

    private readonly labResultsService = inject(LabResultsService);

    readonly history = signal<ParameterHistoryState | null>(null);

    protected readonly num = formatLabNumber;
    protected readonly range = formatLabReferenceRange;
    protected readonly flagLabel = labValueFlagLabel;
    protected readonly flagSeverity = labValueFlagSeverity;
    protected readonly trendLabel = labValueTrendLabel;
    protected readonly trendIcon = labValueTrendIcon;

    toggleHistory(parameterName: string): void {
        const petId = this.petId();

        if (this.history()?.parameterName === parameterName || !petId) {
            this.history.set(null);

            return;
        }

        this.history.set({ parameterName, loading: true, error: null, points: [] });
        this.labResultsService.getParameterHistory(petId, parameterName).subscribe({
            next: (points) => this.updateHistory(parameterName, { loading: false, points }),
            error: (e: Error) => this.updateHistory(parameterName, { loading: false, error: e.message })
        });
    }

    /** Geç gelen yanıt, bu arada başka parametre açıldıysa yazılmaz. */
    private updateHistory(parameterName: string, patch: Partial<ParameterHistoryState>): void {
        const current = this.history();

        if (current?.parameterName === parameterName) {
            this.history.set({ ...current, ...patch });
        }
    }
}
