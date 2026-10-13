import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { registerHeaderLayout } from '@/app/features/reports/registers/data/register-definition';
import { REGISTER_DEFINITIONS } from '@/app/features/reports/registers/data/register-definitions';
import type { RegisterResultVm } from '@/app/features/reports/registers/models/register.model';
import { RegisterReportSource } from '@/app/features/reports/registers/services/register-report.source';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState, type ReportListQueryBase } from '@/app/features/reports/shared/report-list-state';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Gövdeye eklenen sınıf: yazdırma stili yalnız bu sayfa açıkken yerleşimi (üst çubuk, menü) gizler. */
const PRINT_BODY_CLASS = 'register-page-active';

type RegisterRow = { readonly rowNumber: number };

const ymdToDisplay = (ymd: string) => ymd.split('-').reverse().join('.');

/**
 * Kayıt defteri sayfası: tanım (`REGISTER_DEFINITIONS`) rota verisindeki `register` anahtarıyla seçilir.
 * Yeni defter = `register-definitions.ts`'e tanım + rota + Rapor Merkezi kartı. Yazdırma tarayıcı yazdırmasıdır (A4 yatay, "PDF olarak kaydet" ile PDF).
 */
@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [RouterLink, ButtonModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent],
    styleUrl: './register-page.component.scss',
    encapsulation: ViewEncapsulation.None,
    template: `
        <div class="register-page">
            <a [routerLink]="reportsRoute" class="register-screen-only text-primary font-medium no-underline inline-block mb-4">← Raporlar</a>
            <app-page-header class="register-screen-only" [title]="definition.title" [description]="definition.description" />
            <p class="register-screen-only text-sm text-muted-color mt-0 mb-4" role="note">{{ copy.registerFormatUnverified }}</p>

            <app-report-filter-bar
                class="register-screen-only block"
                [state]="state"
                idPrefix="registerRep"
                dateLimit="past"
                [periodHint]="copy.registerPeriodHint"
                searchPlaceholder=""
            >
                <p-button barActions [label]="copy.registerPrint" icon="pi pi-print" severity="secondary" (onClick)="print()" [disabled]="state.loading() || !state.report()?.items?.length" />
            </app-report-filter-bar>

            <app-report-results [state]="state" [alwaysPaginate]="true" [emptyMessage]="copy.registerEmptyMessage" [emptyHint]="copy.registerEmptyHint">
                <ng-template #rows>
                    <div class="register-print-head">
                        <h2 class="register-print-title">{{ definition.title }}</h2>
                        <p class="register-meta text-sm text-muted-color">{{ meta() }}</p>
                    </div>
                    <div class="register-scroll overflow-x-auto">
                        <table class="register-table">
                            <thead>
                                <tr class="register-head-row">
                                    @for (cell of header.top; track $index) {
                                        <th [attr.colspan]="cell.colSpan" [attr.rowspan]="cell.rowSpan" [class.register-sticky]="$first">{{ cell.label }}</th>
                                    }
                                </tr>
                                @if (header.sub.length) {
                                    <tr class="register-head-row">
                                        @for (label of header.sub; track $index) {
                                            <th>{{ label }}</th>
                                        }
                                    </tr>
                                }
                            </thead>
                            <tbody>
                                @for (row of rowsOnPage(); track row.rowNumber) {
                                    <tr>
                                        @for (col of definition.columns; track $index) {
                                            <td [style.min-width]="col.minWidth" [class.register-nowrap]="col.nowrap" [class.register-sticky]="$first">{{ col.cell(row) }}</td>
                                        }
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                    <div class="register-signature">
                        <div class="register-signature-box">{{ copy.registerSignature }}</div>
                        <p class="register-signature-note">{{ copy.registerFormatUnverified }}</p>
                    </div>
                </ng-template>
            </app-report-results>
        </div>
    `
})
export class RegisterPageComponent implements OnInit, OnDestroy {
    readonly copy = PANEL_COPY;
    readonly reportsRoute = REPORTS_ROUTE;
    private readonly document = inject(DOCUMENT);

    readonly definition = REGISTER_DEFINITIONS[inject(ActivatedRoute).snapshot.data['register'] as string];
    readonly header = registerHeaderLayout(this.definition.columns);

    readonly state = new ReportListState<ReportListQueryBase, RegisterResultVm<RegisterRow>>({
        source: new RegisterReportSource<RegisterRow>(inject(ApiClient), inject(AuthService), this.definition.book),
        stateKey: this.definition.stateKey,
        readClaim: this.definition.readClaim,
        exportFilePrefix: this.definition.exportFilePrefix,
        dateRangeOnly: true,
        rowsPerPageOptions: [25, 50, 100, 200]
    });

    readonly rowsOnPage = computed(() => this.state.report()?.items ?? []);

    /** Yazdırma üstbilgisi: tarih aralığı, klinik ve yazdırma zamanı. */
    readonly meta = computed(() => {
        const clinicId = this.state.activeClinicId();
        const clinic = this.state.clinicOptions().find((o) => o.value === clinicId)?.label ?? PANEL_COPY.reportsClinicPanelDefault;
        const range = `${ymdToDisplay(this.state.activeFromDate())} – ${ymdToDisplay(this.state.activeToDate())}`;
        return `${PANEL_COPY.registerDateRange}: ${range} · ${PANEL_COPY.reportsFilterClinic}: ${clinic} · ${PANEL_COPY.registerPrintedAt}: ${formatDateTimeDisplay(new Date())}`;
    });

    ngOnInit(): void {
        this.document.body.classList.add(PRINT_BODY_CLASS);
        this.state.init();
    }

    ngOnDestroy(): void {
        this.document.body.classList.remove(PRINT_BODY_CLASS);
    }

    print(): void {
        window.print();
    }
}
