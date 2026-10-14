import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChild, TemplateRef, input } from '@angular/core';
import { Paginator } from 'primeng/paginator';
import type { AnyReportListState } from '@/app/features/reports/shared/report-list-state';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';

/**
 * Rapor sonucu alanı: yükleniyor / hata / özet kartı / boş / liste durumları ve mobil sayfalayıcı.
 * Rapora özgü kısımlar iki şablonla verilir: `#summary` (toplam kayıt kartına ek alanlar, isteğe bağlı) ve `#rows` (tablo ve mobil satırlar).
 */
@Component({
    selector: 'app-report-results',
    standalone: true,
    imports: [NgTemplateOutlet, Paginator, AppLoadingStateComponent, AppErrorStateComponent, AppEmptyStateComponent],
    template: `
        @let s = state();
        @if (s.loading()) {
            <app-loading-state [message]="copy.reportsLoadingMessage" />
        } @else if (s.error()) {
            <div class="card">
                <app-error-state [detail]="s.error()!" (retry)="s.reload()" />
            </div>
        } @else if (s.report(); as r) {
            @if (summaryLine()) {
                <p class="text-sm text-muted-color mt-0 mb-3">{{ r.totalCount }} {{ copy.registerRecordCount }}</p>
            } @else if (showSummary()) {
            <div class="card mb-4 report-summary">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 sm:col-span-6">
                        <span class="block text-muted-color text-sm mb-1">{{ totalLabel() }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totalCount }}</div>
                    </div>
                    @if (summaryTpl) {
                        <ng-container [ngTemplateOutlet]="summaryTpl" />
                    }
                </div>
            </div>
            }

            @if (r.items.length === 0) {
                <div class="card">
                    <app-empty-state [message]="emptyMessage()" [hint]="emptyHint()" />
                </div>
            } @else {
                <div class="card">
                    <ng-container [ngTemplateOutlet]="rowsTpl" />
                    <div [class]="alwaysPaginate() ? 'register-screen-only mt-4' : 'lg:hidden mt-4'">
                        <p-paginator
                            [rows]="s.pageSize()"
                            [totalRecords]="r.totalCount"
                            [first]="s.first()"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            [rowsPerPageOptions]="s.rowsPerPageOptions"
                            (onPageChange)="s.onMobilePageChange($event)"
                        />
                    </div>
                </div>
            }
        }
    `
})
export class ReportResultsComponent {
    readonly copy = PANEL_COPY;
    readonly state = input.required<AnyReportListState>();
    readonly totalLabel = input<string>(PANEL_COPY.reportsTotalRecords);
    readonly emptyMessage = input.required<string>();
    readonly emptyHint = input.required<string>();

    /** Tablo kendi sayfalayıcısını taşımıyorsa (düz tablo) sayfalayıcı her genişlikte görünür. */
    readonly alwaysPaginate = input(false);

    /** Toplam kayıt kartı; sayıyı başka yerde gösteren sade ekranlar kapatır. */
    readonly showSummary = input(true);

    /** Toplam kayıt kartı yerine tek satır sayaç (`N kayıt`). */
    readonly summaryLine = input(false);

    @ContentChild('summary') summaryTpl?: TemplateRef<unknown>;
    @ContentChild('rows') rowsTpl?: TemplateRef<unknown>;
}
