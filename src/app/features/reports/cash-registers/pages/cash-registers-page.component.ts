import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_MOVEMENTS_VOID_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CASH_REGISTER_ROUTE, REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CashReportRowsComponent } from '@/app/entities/cash-register/components/cash-report-rows.component';
import type { CashRegisterDto, CashRegisterReportDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { ymdDaysBefore } from '@/app/features/reports/end-of-day/utils/cash-count.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppListFilterToggleComponent } from '@/app/shared/ui/list-filters/app-list-filter-toggle.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

/**
 * Raporlar › Kasa hareketleri (TIER-008, `CASH_REGISTERS_API_CONTRACT.md` §3.6): devreden, dönemin hareketleri ve dönem sonu; CSV/Excel.
 * Günlük işlem (para girişi, çıkışı, aktarım) Para › Kasa sekmesinde, kasa ve tür tanımları Ayarlar › Tanımlar'da (S-05). Adres eskisiyle
 * aynı kaldı (rapor anahtarı ve kayıtlı tercihler bozulmasın). Tek klinik: aktif klinik. Temel pakette "üst pakete geç" kutusu; paket
 * düşmüşse kayıtlar okunur.
 */
@Component({
    selector: 'app-cash-registers-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        MenuModule,
        SelectModule,
        DateInputComponent,
        MoneyPipe,
        AppPageHeaderComponent,
        AppPlanUpgradeNoticeComponent,
        CashReportRowsComponent,
        FilterFieldComponent,
        AppListFiltersComponent,
        AppListFilterToggleComponent
    ],
    styles: `
        .cash-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
            gap: 0.75rem 1rem;
            margin: 0 0 1rem;

            dt {
                font-size: 0.875rem;
                color: var(--text-color-secondary);
            }

            dd {
                margin: 0.25rem 0 0;
                font-size: 1.25rem;
                font-weight: 500;
            }
        }
    `,
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" title="Kasa hareketleri" description="Kasaların nakit hareketleri; tarih aralığı, kasa ve dışa aktarma." />
        <p class="m-0 mb-4 text-sm text-muted-color" data-testid="cash-report-where">
            Para girişi, çıkışı ve kasalar arası aktarım <a [routerLink]="cashRoute" class="text-primary font-medium hover:underline">Para › Kasa</a> sekmesinde yapılır.
        </p>

        @if (!clinicId) {
            <section class="card"><p class="text-sm text-muted-color m-0">Kasa tek klinik için tutulur. Bir klinik seçerek girin.</p></section>
        } @else {
            @if (planLocked()) {
                <section class="card mb-4">
                    <app-plan-upgrade-notice
                        feature="CashManagement"
                        detail="Birden fazla kasa tanımlayın, nakit tahsilatta kasayı seçin, kasaya giriş/çıkış ve kasalar arası aktarımı kaydedin, kasa bazında gün sonu ve kasa hareketleri raporu alın. Bugünkü ödeme ve gün sonu her pakette aynen çalışır."
                    />
                </section>
            }

            @if (showReport()) {
                <section class="card mb-4" aria-labelledby="cashReportTitle" data-testid="cash-report">
                    <h5 id="cashReportTitle" class="mt-0 mb-3">Dönem</h5>
                    <!-- Rapor filtre çubuğuyla aynı desen (G-10): alanlar, altında Filtrele · Temizle, sağda tek Dışa aktar; telefonda "Filtre (n)". -->
                    <form class="mb-4" (ngSubmit)="loadReport()">
                        <div class="sm:hidden flex justify-end"><app-list-filter-toggle [filters]="filters" /></div>
                        <app-list-filters #filters [showClear]="false">
                            <app-filter-field label="Başlangıç" labelFor="crFrom" [active]="from() !== defaultFrom" width="date">
                                <app-date-input inputId="crFrom" name="from" [ngModel]="from()" (ngModelChange)="from.set($event)" limit="past" />
                            </app-filter-field>
                            <app-filter-field label="Bitiş" labelFor="crTo" [active]="to() !== defaultTo" width="date">
                                <app-date-input inputId="crTo" name="to" [ngModel]="to()" (ngModelChange)="to.set($event)" limit="past" />
                            </app-filter-field>
                            <app-filter-field label="Kasa" labelFor="crRegister" [active]="!!registerFilter()" width="select">
                                <p-select inputId="crRegister" name="register" [options]="registerOptions()" optionLabel="name" optionValue="id" [ngModel]="registerFilter()" (ngModelChange)="registerFilter.set($event)" class="w-full" />
                            </app-filter-field>
                        </app-list-filters>
                        <div class="mt-4 flex flex-wrap items-center gap-2">
                            <button pButton type="submit" [disabled]="loading()"><i class="p-button-icon pi pi-filter"></i>{{ copy.reportsApplyFilter }}</button>
                            <button pButton type="button" severity="secondary" [text]="true" (click)="resetReportFilters()" [disabled]="loading()">{{ copy.buttonClear }}</button>
                            <button pButton type="button" severity="secondary" [outlined]="true" class="ml-auto" aria-haspopup="menu" (click)="exportMenu.toggle($event)" [disabled]="!report() || exporting()" data-testid="cash-export">
                                <i class="p-button-icon" [class]="exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>{{ copy.reportsExport }}<i class="pi pi-chevron-down text-xs" aria-hidden="true"></i>
                            </button>
                            <p-menu #exportMenu [popup]="true" [model]="exportItems" appendTo="body" />
                        </div>
                    </form>

                    @if (reportError(); as err) {
                        <p class="text-danger text-sm" role="alert">{{ err }}</p>
                    } @else if (report(); as r) {
                        <dl class="cash-summary" data-testid="cash-report-summary">
                            <div>
                                <dt>Devreden bakiye</dt>
                                <dd>{{ r.openingBalance | money }}</dd>
                            </div>
                            <div>
                                <dt>Nakit tahsilat neti</dt>
                                <dd>{{ r.totals.cashNetAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Giriş</dt>
                                <dd>{{ r.totals.inAmount + r.totals.transferInAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Çıkış</dt>
                                <dd>{{ r.totals.outAmount + r.totals.transferOutAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Dönem sonu bakiye</dt>
                                <dd data-testid="cash-report-closing">{{ r.closingBalance | money }}</dd>
                            </div>
                        </dl>
                        @if (r.rows.length === 0) {
                            <p class="text-sm text-muted-color m-0">Bu aralıkta kasa hareketi yok.</p>
                        } @else {
                            <app-cash-report-rows [rows]="r.rows" [showRegister]="!r.cashRegisterId" [canVoid]="canVoid()" (voided)="loadReport()" />
                        }
                    } @else {
                        <p class="text-sm text-muted-color m-0">Yükleniyor…</p>
                    }
                </section>
            }
        }
    `
})
export class CashRegistersPageComponent implements OnInit {
    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly reportsRoute = REPORTS_ROUTE;
    protected readonly cashRoute = CASH_REGISTER_ROUTE;
    readonly clinicId = this.auth.getClinicId()?.trim() || null;

    readonly allRegisters = signal<CashRegisterDto[]>([]);
    readonly registerOptions = computed(() => [{ id: '', name: 'Tüm kasalar' }, ...this.allRegisters()]);

    readonly copy = PANEL_COPY;
    /** Varsayılan aralık son 7 gün; "Temizle" buna döner, filtre sayısı bundan farkı sayar. */
    readonly defaultFrom = ymdDaysBefore(localDateYyyyMmDd(), 6);
    readonly defaultTo = localDateYyyyMmDd();
    readonly from = signal(this.defaultFrom);
    readonly to = signal(this.defaultTo);
    readonly registerFilter = signal('');
    readonly exportItems: MenuItem[] = [
        { label: PANEL_COPY.reportsExportCsv, icon: 'pi pi-file', command: () => this.export('csv') },
        { label: PANEL_COPY.reportsExportXlsx, icon: 'pi pi-file-excel', command: () => this.export('xlsx') }
    ];
    readonly report = signal<CashRegisterReportDto | null>(null);
    readonly reportError = signal<string | null>(null);
    readonly loading = signal(false);
    readonly exporting = signal(false);
    private seq = 0;

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CashManagement') !== null);
    readonly canVoid = computed(() => !this.planLocked() && !this.ro.mutationBlocked() && this.auth.hasOperationClaim(CASH_MOVEMENTS_VOID_CLAIM));
    /** Temel'de rapor yalnız paket düşmüş ve Ana kasa dışında kasası olan kiracıda okunur. */
    readonly showReport = computed(() => !this.planLocked() || this.allRegisters().length > 1);

    ngOnInit(): void {
        if (!this.clinicId) {
            return;
        }

        this.service.list(this.clinicId, true).subscribe({ next: (rows) => this.allRegisters.set(rows), error: () => this.allRegisters.set([]) });
        this.loadReport();
    }

    loadReport(): void {
        if (!this.clinicId) {
            return;
        }

        const seq = ++this.seq;

        this.loading.set(true);
        this.reportError.set(null);
        this.service.report(this.from(), this.to(), this.clinicId, this.registerFilter() || null).subscribe({
            next: (r) => {
                if (seq === this.seq) {
                    this.loading.set(false);
                    this.report.set(r);
                }
            },
            error: (err: unknown) => {
                if (seq === this.seq) {
                    this.loading.set(false);
                    this.report.set(null);
                    this.reportError.set(panelHttpFailureMessage(err, 'Kasa hareketleri yüklenemedi.'));
                }
            }
        });
    }

    resetReportFilters(): void {
        this.from.set(this.defaultFrom);
        this.to.set(this.defaultTo);
        this.registerFilter.set('');
        this.loadReport();
    }

    export(format: 'csv' | 'xlsx'): void {
        const r = this.report();

        if (!this.clinicId || !r) {
            return;
        }

        this.exporting.set(true);
        this.service.exportReport(format, r.from, r.to, this.clinicId, r.cashRegisterId).subscribe({
            next: (res) => {
                this.exporting.set(false);

                if (res.body) {
                    triggerBlobDownload(res.body, fileNameFromContentDisposition(res.headers.get('Content-Disposition')) ?? `kasa-hareketleri.${format}`);
                }
            },
            error: (err: unknown) => {
                this.exporting.set(false);
                this.reportError.set(panelHttpFailureMessage(err, 'Dosya indirilemedi.'));
            }
        });
    }
}
