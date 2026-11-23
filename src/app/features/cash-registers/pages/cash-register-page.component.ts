import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_MOVEMENTS_CREATE_CLAIM, CASH_MOVEMENTS_VOID_CLAIM, CASH_REGISTERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CASH_REGISTER_DEFINITIONS_ROUTE, REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CashReportRowsComponent } from '@/app/entities/cash-register/components/cash-report-rows.component';
import type { CashMovementCategoryDto, CashMovementDirection, CashRegisterDto, CashRegisterReportDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { type CashFormKind, CashMovementFormsComponent } from '@/app/features/cash-registers/components/cash-movement-forms.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';

/** Kasa kutusu: bugünkü kapanış bakiyesi ve bugünün neti (rapor uç noktasının kasa başına yanıtından; sunucu hesaplar). */
interface RegisterBalance {
    register: CashRegisterDto;
    balance: number;
    todayNet: number;
}

type FormOpen = { kind: CashFormKind; direction: CashMovementDirection } | null;

/**
 * Para › Kasa sekmesi (S-05 A, TIER-008): kasa bakiyeleri, para girişi / çıkışı / kasalar arası aktarım (form pencerede) ve bugünün
 * hareketleri. Bakiye için yeni uç nokta yok: kasa başına bugünün raporu (`GET cash-registers/report`, dönem sonu bakiye) ve tüm kasalar
 * için bir rapor (bugünün satırları ve toplam). Dönem raporu Raporlar › Kasa hareketleri'nde, tanımlar Ayarlar › Tanımlar'da.
 * İzin ve paket kilidi eski Raporlar › Kasa sayfasıyla aynı: okuma `CashRegisters.Read`, giriş `CashMovements.Create`, iptal
 * `CashMovements.Void`; Temel pakette "üst pakete geç" kutusu, paket düşmüşse bakiyeler okunur, işlem girilmez.
 */
@Component({
    selector: 'app-cash-register-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        ButtonModule,
        DialogModule,
        MessageModule,
        MoneyPipe,
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppPlanUpgradeNoticeComponent,
        CashMovementFormsComponent,
        CashReportRowsComponent
    ],
    template: `
        <div class="card mb-4">
            <app-list-header class="mb-4" title="Kasa" />

            @if (!clinicId) {
                <p class="text-sm text-muted-color m-0">Kasa tek klinik için tutulur. Bir klinik seçerek girin.</p>
            } @else {
                @if (planLocked()) {
                    <app-plan-upgrade-notice
                        class="block mb-4"
                        feature="CashManagement"
                        detail="Birden fazla kasa tanımlayın, nakit tahsilatta kasayı seçin, kasaya giriş/çıkış ve kasalar arası aktarımı kaydedin, kasa bazında gün sonu ve kasa hareketleri raporu alın. Bugünkü ödeme ve gün sonu her pakette aynen çalışır."
                    />
                }
                @if (message(); as m) {
                    <p-message severity="success" class="block mb-4" role="status" data-testid="cash-saved">{{ m }}</p-message>
                }

                @if (showBalances()) {
                    @if (loading() && balances().length === 0) {
                        <app-loading-state message="Kasa bakiyeleri yükleniyor…" />
                    } @else if (error(); as err) {
                        <app-error-state [detail]="err" (retry)="load()" />
                    } @else {
                        <div class="grid gap-3 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]" data-testid="cash-balances">
                            @for (b of balances(); track b.register.id) {
                                <div class="rounded-lg border border-surface px-4 py-3 flex flex-col gap-1 min-w-0" [attr.data-testid]="'cash-balance-' + b.register.id">
                                    <span class="flex items-center gap-2 text-sm text-muted-color min-w-0">
                                        <span class="truncate">{{ b.register.name }}</span>
                                        @if (b.register.isMain && b.register.name !== 'Ana kasa') {
                                            <span class="shrink-0 rounded px-1.5 text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-color">Ana kasa</span>
                                        }
                                    </span>
                                    <b class="text-2xl font-semibold tabular-nums">{{ b.balance | money }}</b>
                                    <span class="text-xs text-muted-color tabular-nums">Bugün {{ b.todayNet >= 0 ? '+' : '−' }}{{ abs(b.todayNet) | money }}</span>
                                </div>
                            }
                            @if (balances().length > 1 && today(); as t) {
                                <div class="rounded-lg border border-primary bg-primary-50 dark:bg-primary-950/40 px-4 py-3 flex flex-col gap-1 min-w-0" data-testid="cash-balance-total">
                                    <span class="text-sm text-muted-color">Toplam nakit</span>
                                    <b class="text-2xl font-semibold tabular-nums">{{ t.closingBalance | money }}</b>
                                    <span class="text-xs text-muted-color">{{ balances().length }} kasa</span>
                                </div>
                            }
                        </div>
                    }
                }

                @if (canCreate() && activeRegisters().length > 0) {
                    <div class="grid grid-cols-1 gap-2 mt-4 sm:flex sm:flex-wrap" data-testid="cash-actions">
                        <button pButton type="button" (click)="openForm('movement', 'In')" data-testid="cash-open-in"><i class="pi pi-arrow-down"></i>Para girişi</button>
                        <button pButton type="button" severity="secondary" [outlined]="true" (click)="openForm('movement', 'Out')" data-testid="cash-open-out"><i class="pi pi-arrow-up"></i>Para çıkışı</button>
                        @if (activeRegisters().length > 1) {
                            <button pButton type="button" severity="secondary" [outlined]="true" (click)="openForm('transfer', 'Out')" data-testid="cash-open-transfer"><i class="pi pi-arrow-right-arrow-left"></i>Aktarım</button>
                        }
                    </div>
                }
            }
        </div>

        @if (clinicId && showBalances()) {
            <section class="card mb-0" aria-labelledby="cashTodayTitle" data-testid="cash-today">
                <h5 id="cashTodayTitle" class="mt-0 mb-3">Bugünkü hareketler</h5>
                @if (today(); as t) {
                    @if (t.rows.length === 0) {
                        <p class="text-sm text-muted-color m-0">Bugün kasa hareketi yok.</p>
                    } @else {
                        <app-cash-report-rows [rows]="t.rows" [timeOnly]="true" [canVoid]="canVoid()" label="Bugünkü kasa hareketleri" (voided)="load()" />
                    }
                }
                <div class="flex flex-wrap gap-x-6 mt-2 text-sm">
                    <a [routerLink]="reportRoute" class="inline-flex items-center min-h-11 text-primary font-medium hover:underline">Tarih aralığı ve dışa aktarma: Kasa hareketleri raporu</a>
                    @if (canManage()) {
                        <a [routerLink]="definitionsRoute" class="inline-flex items-center min-h-11 text-primary font-medium hover:underline">Kasaları ve türleri düzenle</a>
                    }
                </div>
            </section>
        }

        <p-dialog [visible]="!!form()" (visibleChange)="$event || form.set(null)" [header]="formTitle()" [modal]="true" [dismissableMask]="true" [draggable]="false" [style]="{ width: 'min(40rem, 96vw)' }">
            @if (form(); as f) {
                <app-cash-movement-forms
                    [clinicId]="clinicId!"
                    [registers]="activeRegisters()"
                    [categories]="categories()"
                    [kind]="f.kind"
                    [direction]="f.direction"
                    (saved)="onSaved($event)"
                    (cancelled)="form.set(null)"
                />
            }
        </p-dialog>
    `
})
export class CashRegisterPageComponent implements OnInit {
    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly reportRoute = `${REPORTS_ROUTE}/cash-registers`;
    protected readonly definitionsRoute = CASH_REGISTER_DEFINITIONS_ROUTE;
    readonly clinicId = this.auth.getClinicId()?.trim() || null;

    readonly registers = signal<CashRegisterDto[]>([]);
    readonly categories = signal<CashMovementCategoryDto[]>([]);
    readonly activeRegisters = computed(() => this.registers().filter((r) => r.isActive));
    readonly balances = signal<RegisterBalance[]>([]);
    /** Tüm kasalar için bugünün raporu: satırlar ve toplam nakit. */
    readonly today = signal<CashRegisterReportDto | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly message = signal<string | null>(null);
    readonly form = signal<FormOpen>(null);
    readonly formTitle = computed(() => {
        const f = this.form();

        return !f ? '' : f.kind === 'transfer' ? 'Kasalar arası aktarım' : f.direction === 'In' ? 'Para girişi' : 'Para çıkışı';
    });

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CashManagement') !== null);
    private readonly writable = computed(() => !this.planLocked() && !this.ro.mutationBlocked());
    readonly canCreate = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_MOVEMENTS_CREATE_CLAIM));
    readonly canVoid = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_MOVEMENTS_VOID_CLAIM));
    readonly canManage = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_REGISTERS_MANAGE_CLAIM));
    /** Temel'de bakiye yalnız paket düşmüş ve Ana kasa dışında kasası olan kiracıda okunur (eski sayfanın rapor kuralı). */
    readonly showBalances = computed(() => !this.planLocked() || this.registers().length > 1);

    private seq = 0;

    ngOnInit(): void {
        if (!this.clinicId) {
            return;
        }

        this.service.listCategories(false).subscribe({ next: (rows) => this.categories.set(rows), error: () => this.categories.set([]) });
        this.load();
    }

    /** Kasalar, kasa başına bugünkü bakiye ve tüm kasaların bugünkü hareketleri; işlem ve iptal sonrası yeniden. */
    load(): void {
        const clinicId = this.clinicId;

        if (!clinicId) {
            return;
        }

        const seq = ++this.seq;
        const day = localDateYyyyMmDd();

        this.loading.set(true);
        this.error.set(null);
        this.service.list(clinicId, true).subscribe({
            next: (registers) => {
                if (seq !== this.seq) {
                    return;
                }

                this.registers.set(registers);
                const active = registers.filter((r) => r.isActive);

                forkJoin([this.service.report(day, day, clinicId, null), ...active.map((r) => this.service.report(day, day, clinicId, r.id))]).subscribe({
                    next: ([all, ...each]) => {
                        if (seq === this.seq) {
                            this.today.set(all);
                            this.balances.set(active.map((register, i) => ({ register, balance: each[i].closingBalance, todayNet: each[i].totals.netAmount })));
                            this.loading.set(false);
                        }
                    },
                    error: (err: unknown) => this.fail(seq, err)
                });
            },
            error: (err: unknown) => this.fail(seq, err)
        });
    }

    openForm(kind: CashFormKind, direction: CashMovementDirection): void {
        this.message.set(null);
        this.form.set({ kind, direction });
    }

    onSaved(text: string): void {
        this.form.set(null);
        this.message.set(text);
        this.load();
    }

    abs(n: number): number {
        return Math.abs(n);
    }

    private fail(seq: number, err: unknown): void {
        if (seq === this.seq) {
            this.loading.set(false);
            this.error.set(panelHttpFailureMessage(err, 'Kasa bakiyeleri yüklenemedi.'));
        }
    }
}
