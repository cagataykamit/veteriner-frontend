import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_MOVEMENTS_CREATE_CLAIM, CASH_MOVEMENTS_VOID_CLAIM, CASH_REGISTERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CASH_REGISTER_REPORT_KIND_LABELS, type CashMovementCategoryDto, type CashRegisterDto, type CashRegisterReportDto, type CashRegisterReportRowDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { CashMovementFormsComponent } from '@/app/features/reports/cash-registers/components/cash-movement-forms.component';
import { CashRegisterSettingsComponent } from '@/app/features/reports/cash-registers/components/cash-register-settings.component';
import { ymdDaysBefore } from '@/app/features/reports/end-of-day/utils/cash-count.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

const MOVEMENT_KINDS: ReadonlySet<string> = new Set(['In', 'Out', 'TransferIn', 'TransferOut']);

/**
 * Kasa (TIER-008, `CASH_REGISTERS_API_CONTRACT.md`): kasa hareketleri raporu (devreden, hareketler, dönem sonu; CSV/Excel), kasaya giriş/çıkış
 * ve kasalar arası aktarım, kasa ve tür tanımı. Tek klinik: aktif klinik. Temel pakette "üst pakete geç" kutusu; paket düşmüşse kayıtlar
 * raporda okunur, yeni işlem girilmez.
 */
@Component({
    selector: 'app-cash-registers-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectModule, DateInputComponent, MoneyPipe, AppPageHeaderComponent, AppPlanUpgradeNoticeComponent, ReasonConfirmDialogComponent, CashMovementFormsComponent, CashRegisterSettingsComponent],
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

        .cash-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;

            th,
            td {
                padding: 0.5rem 0.625rem;
                border-bottom: 1px solid var(--surface-border);
                text-align: left;
                vertical-align: top;
            }

            th {
                font-weight: 600;
                color: var(--text-color-secondary);
            }
        }
    `,
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" title="Kasa" description="Kasaların nakit hareketleri, kasaya giriş/çıkış ve kasalar arası aktarım." />

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

            @if (!planLocked() && canCreate() && registers().length > 0) {
                <app-cash-movement-forms [clinicId]="clinicId" [registers]="registers()" [categories]="categories()" (changed)="loadReport()" />
            }

            @if (showReport()) {
                <section class="card mb-4" aria-labelledby="cashReportTitle" data-testid="cash-report">
                    <h5 id="cashReportTitle" class="mt-0 mb-3">Kasa hareketleri</h5>
                    <form class="flex flex-wrap items-end gap-3 mb-4" (ngSubmit)="loadReport()">
                        <div>
                            <label for="crFrom" class="block text-sm font-medium text-muted-color mb-2">Başlangıç</label>
                            <app-date-input inputId="crFrom" name="from" [ngModel]="from()" (ngModelChange)="from.set($event)" limit="past" />
                        </div>
                        <div>
                            <label for="crTo" class="block text-sm font-medium text-muted-color mb-2">Bitiş</label>
                            <app-date-input inputId="crTo" name="to" [ngModel]="to()" (ngModelChange)="to.set($event)" limit="past" />
                        </div>
                        <div class="min-w-52">
                            <label for="crRegister" class="block text-sm font-medium text-muted-color mb-2">Kasa</label>
                            <p-select inputId="crRegister" name="register" [options]="registerOptions()" optionLabel="name" optionValue="id" [ngModel]="registerFilter()" (ngModelChange)="registerFilter.set($event)" class="w-full" />
                        </div>
                        <button pButton type="submit" [disabled]="loading()"><i class="p-button-icon pi pi-search"></i>Göster</button>
                        <button pButton type="button" severity="secondary" [outlined]="true" (click)="export('csv')" [disabled]="!report() || exporting()"><i class="p-button-icon pi pi-file"></i>CSV</button>
                        <button pButton type="button" severity="secondary" [outlined]="true" (click)="export('xlsx')" [disabled]="!report() || exporting()"><i class="p-button-icon pi pi-file-excel"></i>Excel</button>
                    </form>

                    @if (reportError(); as err) {
                        <p class="text-red-500 text-sm" role="alert">{{ err }}</p>
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
                            <div class="overflow-x-auto">
                                <table class="cash-table" aria-label="Kasa hareketleri" data-testid="cash-report-rows">
                                    <thead>
                                        <tr>
                                            <th>Tarih</th>
                                            @if (!r.cashRegisterId) {
                                                <th>Kasa</th>
                                            }
                                            <th>Hareket</th>
                                            <th>Açıklama</th>
                                            <th class="text-right">Giriş</th>
                                            <th class="text-right">Çıkış</th>
                                            <th class="text-right">Bakiye</th>
                                            <th>İşlemi yapan</th>
                                            @if (canVoid()) {
                                                <th><span class="sr-only">İşlem</span></th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (row of r.rows; track row.referenceId + row.kind) {
                                            <tr>
                                                <td>{{ timeLabel(row.atUtc) }}</td>
                                                @if (!r.cashRegisterId) {
                                                    <td>{{ row.cashRegisterName }}</td>
                                                }
                                                <td>{{ kindLabel(row) }}</td>
                                                <td>{{ row.description }}</td>
                                                <td class="text-right">{{ row.inAmount ? (row.inAmount | money) : '' }}</td>
                                                <td class="text-right">{{ row.outAmount ? (row.outAmount | money) : '' }}</td>
                                                <td class="text-right font-medium">{{ row.balance | money }}</td>
                                                <td>{{ row.performedByName || '—' }}</td>
                                                @if (canVoid()) {
                                                    <td>
                                                        @if (isMovement(row)) {
                                                            <button pButton type="button" class="p-button-text p-button-sm p-button-danger" (click)="openVoid(row)" data-testid="cash-movement-void"><i class="pi pi-times"></i>İptal et</button>
                                                        }
                                                    </td>
                                                }
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        }
                    } @else {
                        <p class="text-sm text-muted-color m-0">Yükleniyor…</p>
                    }
                </section>
            }

            @if (!planLocked() && canManage()) {
                <app-cash-register-settings [clinicId]="clinicId" [registers]="allRegisters()" [categories]="allCategories()" (changed)="loadDefinitions()" />
            }

            <app-reason-confirm-dialog
                [(visible)]="voidVisible"
                header="Kasa hareketini iptal et"
                [summary]="voidTarget() ? kindLabel(voidTarget()!) + ' · ' + voidTarget()!.description : null"
                description="Kayıt silinmez; gerekçeyle iptal edilir ve kasa bakiyesine girmez. Aktarımda iki kasadaki bacak birlikte iptal edilir."
                confirmLabel="İptal et"
                failureFallback="Kasa hareketi iptal edilemedi."
                [execute]="voidMovement"
                (confirmed)="loadReport()"
            />
        }
    `
})
export class CashRegistersPageComponent implements OnInit {
    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly reportsRoute = REPORTS_ROUTE;
    readonly clinicId = this.auth.getClinicId()?.trim() || null;

    readonly allRegisters = signal<CashRegisterDto[]>([]);
    readonly allCategories = signal<CashMovementCategoryDto[]>([]);
    readonly registers = computed(() => this.allRegisters().filter((r) => r.isActive));
    readonly categories = computed(() => this.allCategories().filter((c) => c.isActive));
    readonly registerOptions = computed(() => [{ id: '', name: 'Tüm kasalar' }, ...this.allRegisters()]);

    readonly from = signal(ymdDaysBefore(localDateYyyyMmDd(), 6));
    readonly to = signal(localDateYyyyMmDd());
    readonly registerFilter = signal('');
    readonly report = signal<CashRegisterReportDto | null>(null);
    readonly reportError = signal<string | null>(null);
    readonly loading = signal(false);
    readonly exporting = signal(false);
    readonly voidTarget = signal<CashRegisterReportRowDto | null>(null);
    voidVisible = false;
    private seq = 0;

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CashManagement') !== null);
    private readonly writable = computed(() => !this.planLocked() && !this.ro.mutationBlocked());
    readonly canCreate = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_MOVEMENTS_CREATE_CLAIM));
    readonly canVoid = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_MOVEMENTS_VOID_CLAIM));
    readonly canManage = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_REGISTERS_MANAGE_CLAIM));
    /** Temel'de rapor yalnız paket düşmüş ve Ana kasa dışında kasası olan kiracıda okunur. */
    readonly showReport = computed(() => !this.planLocked() || this.allRegisters().length > 1);

    readonly voidMovement = (reason: string) => this.service.voidMovement(this.voidTarget()!.referenceId, reason);

    ngOnInit(): void {
        this.loadDefinitions();
        this.loadReport();
    }

    loadDefinitions(): void {
        if (!this.clinicId) {
            return;
        }

        this.service.list(this.clinicId, true).subscribe({ next: (rows) => this.allRegisters.set(rows), error: () => this.allRegisters.set([]) });
        this.service.listCategories(true).subscribe({ next: (rows) => this.allCategories.set(rows), error: () => this.allCategories.set([]) });
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

    openVoid(row: CashRegisterReportRowDto): void {
        this.voidTarget.set(row);
        this.voidVisible = true;
    }

    isMovement(row: CashRegisterReportRowDto): boolean {
        return MOVEMENT_KINDS.has(row.kind);
    }

    kindLabel(row: CashRegisterReportRowDto): string {
        return CASH_REGISTER_REPORT_KIND_LABELS[row.kind] ?? row.kind;
    }

    timeLabel(utcIso: string): string {
        return formatUtcIsoAsLocalDateTimeDisplay(utcIso);
    }
}
