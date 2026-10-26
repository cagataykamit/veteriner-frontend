import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { RegisterTableComponent } from '@/app/features/reports/registers/components/register-table.component';
import { dayText } from '@/app/features/reports/registers/data/register-definition';
import { REGISTER_DEFINITIONS } from '@/app/features/reports/registers/data/register-definitions';
import type { RegisterResultVm } from '@/app/features/reports/registers/models/register.model';
import { RegisterReportSource } from '@/app/features/reports/registers/services/register-report.source';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState, type ReportExtraKey, type ReportListQueryBase } from '@/app/features/reports/shared/report-list-state';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { HBS_STATUS_FILTER_OPTIONS, HBS_STATUS_LABEL } from '@/app/features/hbs/utils/hbs-status.utils';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

/** Gövdeye eklenen sınıf: yazdırma stili yalnız bu sayfa açıkken yerleşimi (üst çubuk, menü) gizler. */
const PRINT_BODY_CLASS = 'register-page-active';

type RegisterRow = { readonly rowNumber: number };

/**
 * Kayıt defteri sayfası: tanım (`REGISTER_DEFINITIONS`) rota verisindeki `register` anahtarıyla seçilir.
 * Yeni defter = `register-definitions.ts`'e tanım + rota + Rapor Merkezi kartı. Yazdırma tarayıcı yazdırmasıdır (A4 yatay, "PDF olarak kaydet" ile PDF).
 */
@Component({
    selector: 'app-register-page',
    standalone: true,
    imports: [FormsModule, ButtonModule, CheckboxModule, SelectModule, FilterFieldComponent, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, RegisterTableComponent],
    styleUrl: './register-page.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="register-page">
            <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" class="register-screen-only" [title]="definition.title" [description]="definition.description" />
            @if (!definition.notOfficialRegister) {
                <p class="register-screen-only text-sm text-muted-color mt-0 mb-4" role="note">{{ copy.registerFormatUnverified }}</p>
            }
            @if (definition.screenHint) {
                <p class="register-screen-only text-sm text-muted-color mt-0 mb-4" role="note">{{ definition.screenHint }}</p>
            }

            <app-report-filter-bar class="register-screen-only block" [state]="state" idPrefix="registerRep" dateLimit="past" [periodHint]="copy.registerPeriodHint" searchPlaceholder="" [activeBadges]="false">
                @if (definition.extraFilters; as extra) {
                    <ng-container ngProjectAs="[extraFilters]">
                        @if (extra.product) {
                            <app-filter-field [label]="copy.registerFilterProduct" labelId="registerRepProductLabel" [active]="false" width="select">
                                <p-select
                                    ariaLabelledBy="registerRepProductLabel"
                                    inputId="registerRepProduct"
                                    [options]="productOptions()"
                                    [ngModel]="state.extraInputs['productId']"
                                    (ngModelChange)="setExtra('productId', $event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    class="w-full"
                                    [filter]="true"
                                    [showClear]="true"
                                />
                            </app-filter-field>
                        }
                        @if (extra.veterinarian) {
                            <app-filter-field [label]="copy.registerFilterVeterinarian" labelId="registerRepVetLabel" [active]="false" width="select">
                                <p-select
                                    ariaLabelledBy="registerRepVetLabel"
                                    inputId="registerRepVet"
                                    [options]="veterinarianOptions()"
                                    [ngModel]="state.extraInputs['veterinarianId']"
                                    (ngModelChange)="setExtra('veterinarianId', $event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    class="w-full"
                                    [showClear]="true"
                                />
                            </app-filter-field>
                        }
                        @if (extra.hbsStatus) {
                            <app-filter-field label="HBS durumu" labelId="registerRepHbsLabel" [active]="false" width="select">
                                <p-select
                                    ariaLabelledBy="registerRepHbsLabel"
                                    inputId="registerRepHbs"
                                    [options]="hbsOptions"
                                    [ngModel]="state.extraInputs['hbsStatus'] || null"
                                    (ngModelChange)="setExtra('hbsStatus', $event)"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="hbsDefaultLabel"
                                    class="w-full"
                                    [showClear]="true"
                                />
                            </app-filter-field>
                        }
                        @if (extra.includeVoidedLabel) {
                            <div class="flex items-center gap-2 pb-2">
                                <p-checkbox inputId="registerRepVoided" [binary]="true" [ngModel]="state.extraInputs['includeVoided'] === 'true'" (ngModelChange)="setExtra('includeVoided', $event ? 'true' : '')" />
                                <label for="registerRepVoided" class="text-sm">{{ extra.includeVoidedLabel }}</label>
                            </div>
                        }
                    </ng-container>
                }
                <p-button barActions [label]="copy.registerPrint" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="print()" [disabled]="state.loading() || !state.report()?.items?.length" />
            </app-report-filter-bar>

            <app-report-results [state]="state" [alwaysPaginate]="true" [showSummary]="false" [emptyMessage]="copy.registerEmptyMessage" [emptyHint]="copy.registerEmptyHint">
                <ng-template #rows>
                    <div class="register-print-head">
                        <h2 class="register-print-title">{{ definition.title }}</h2>
                        <p class="register-meta text-sm text-muted-color">{{ meta() }}</p>
                    </div>
                    <app-register-table [definition]="definition" [rows]="rowsOnPage()" />
                    @if (!definition.notOfficialRegister) {
                        <div class="register-signature">
                            <div class="register-signature-box">{{ copy.registerSignature }}</div>
                            <p class="register-signature-note">{{ copy.registerFormatUnverified }}</p>
                        </div>
                    }
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
        readClaim: this.definition.readClaims,
        exportFilePrefix: this.definition.exportFilePrefix,
        extraKeys: this.extraKeys(),
        dateRangeOnly: true,
        rowsPerPageOptions: [25, 50, 100, 200]
    });

    readonly rowsOnPage = computed(() => this.state.report()?.items ?? []);

    /** Süzgeç seçenekleri: aşı ürünleri ve kliniğin hekimleri; yalnız tanım isterse yüklenir. */
    readonly productOptions = signal<{ label: string; value: string }[]>([]);
    /** HBS takip listeleri: boş seçim sunucuda "HBS'e girilmedi" demektir (iş listesi). */
    readonly hbsOptions = HBS_STATUS_FILTER_OPTIONS;
    readonly hbsDefaultLabel = HBS_STATUS_LABEL.NotEntered;
    readonly veterinarianOptions = signal<{ label: string; value: string }[]>([]);
    private readonly products = inject(ProductService);
    private readonly visits = inject(VisitsService);
    private readonly auth = inject(AuthService);

    constructor() {
        effect(() => {
            const clinicId = this.state.activeClinicId() || this.auth.getClinicId() || '';

            if (this.definition.extraFilters?.veterinarian && clinicId) {
                this.visits.getVeterinarians(clinicId).subscribe({
                    next: (list) => this.veterinarianOptions.set(list.map((v) => ({ label: v.name, value: v.userId }))),
                    error: () => this.veterinarianOptions.set([])
                });
            }
        });
    }

    setExtra(key: ReportExtraKey, value: string | null): void {
        this.state.extraInputs = { ...this.state.extraInputs, [key]: value ?? '' };
        this.state.scheduleApply();
    }

    private extraKeys(): ReportExtraKey[] {
        const f = this.definition.extraFilters;

        return [f?.includeVoidedLabel && 'includeVoided', f?.product && 'productId', f?.veterinarian && 'veterinarianId', f?.hbsStatus && 'hbsStatus'].filter(Boolean) as ReportExtraKey[];
    }

    /** Tablo üstbilgisi: kayıt sayısı, tarih aralığı, klinik ve yazdırma zamanı. */
    readonly meta = computed(() => {
        const count = `${this.state.report()?.totalCount ?? 0} ${PANEL_COPY.registerRecordCount}`;
        const clinicId = this.state.activeClinicId();
        const clinic = this.state.clinicOptions().find((o) => o.value === clinicId)?.label ?? PANEL_COPY.reportsClinicPanelDefault;
        const range = `${dayText(this.state.activeFromDate())} – ${dayText(this.state.activeToDate())}`;

        return `${count} · ${PANEL_COPY.registerDateRange}: ${range} · ${PANEL_COPY.reportsFilterClinic}: ${clinic} · ${PANEL_COPY.registerPrintedAt}: ${formatDateTimeDisplay(new Date())}`;
    });

    ngOnInit(): void {
        this.document.body.classList.add(PRINT_BODY_CLASS);
        this.state.init();

        if (this.definition.extraFilters?.product) {
            this.products.getProducts({ pageSize: 200 }).subscribe({
                next: (res) => this.productOptions.set(res.items.filter((p) => p.kind === 'Vaccine').map((p) => ({ label: p.name, value: p.id }))),
                error: () => this.productOptions.set([])
            });
        }
    }

    ngOnDestroy(): void {
        this.document.body.classList.remove(PRINT_BODY_CLASS);
    }

    print(): void {
        window.print();
    }
}
