import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { RegisterTableComponent } from '@/app/features/reports/registers/components/register-table.component';
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
    imports: [RouterLink, ButtonModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, RegisterTableComponent],
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
                [activeBadges]="false"
            >
                <p-button barActions [label]="copy.registerPrint" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="print()" [disabled]="state.loading() || !state.report()?.items?.length" />
            </app-report-filter-bar>

            <app-report-results [state]="state" [alwaysPaginate]="true" [showSummary]="false" [emptyMessage]="copy.registerEmptyMessage" [emptyHint]="copy.registerEmptyHint">
                <ng-template #rows>
                    <div class="register-print-head">
                        <h2 class="register-print-title">{{ definition.title }}</h2>
                        <p class="register-meta text-sm text-muted-color">{{ meta() }}</p>
                    </div>
                    <app-register-table [definition]="definition" [rows]="rowsOnPage()" />
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

    readonly state = new ReportListState<ReportListQueryBase, RegisterResultVm<RegisterRow>>({
        source: new RegisterReportSource<RegisterRow>(inject(ApiClient), inject(AuthService), this.definition.book),
        stateKey: this.definition.stateKey,
        readClaim: this.definition.readClaim,
        exportFilePrefix: this.definition.exportFilePrefix,
        dateRangeOnly: true,
        rowsPerPageOptions: [25, 50, 100, 200]
    });

    readonly rowsOnPage = computed(() => this.state.report()?.items ?? []);

    /** Tablo üstbilgisi: kayıt sayısı, tarih aralığı, klinik ve yazdırma zamanı. */
    readonly meta = computed(() => {
        const count = `${this.state.report()?.totalCount ?? 0} ${PANEL_COPY.registerRecordCount}`;
        const clinicId = this.state.activeClinicId();
        const clinic = this.state.clinicOptions().find((o) => o.value === clinicId)?.label ?? PANEL_COPY.reportsClinicPanelDefault;
        const range = `${ymdToDisplay(this.state.activeFromDate())} – ${ymdToDisplay(this.state.activeToDate())}`;
        return `${count} · ${PANEL_COPY.registerDateRange}: ${range} · ${PANEL_COPY.reportsFilterClinic}: ${clinic} · ${PANEL_COPY.registerPrintedAt}: ${formatDateTimeDisplay(new Date())}`;
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
