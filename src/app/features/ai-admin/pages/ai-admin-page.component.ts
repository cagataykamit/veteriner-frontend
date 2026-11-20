import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';
import { AiFundGrantDialogComponent } from '@/app/features/ai-admin/components/ai-fund-grant-dialog.component';
import {
    aiFeatureLabel,
    aiMonthLabel,
    aiRecentMonths,
    formatAiNumber,
    formatAiUsd,
    type AiAdminClinicDto,
    type AiAdminTotalsDto,
    type AiAdminUsageDto
} from '@/app/features/ai-admin/models/ai-admin.model';
import { AiAdminService } from '@/app/features/ai-admin/services/ai-admin.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

/** Kullanım oranı bu eşikte amber görünür (ADR-044 madde 7; kliniğe giden uyarıyla aynı). */
const WARNING_PERCENT = 80;
const MONTH_OPTION_COUNT = 12;

interface MetricCard {
    readonly testId: string;
    readonly label: string;
    readonly value: string;
    readonly detail: string;
}

interface BreakdownRow {
    readonly key: string;
    readonly label: string;
    readonly detail: string | null;
    readonly usage: AiAdminTotalsDto;
}

/**
 * Platform yöneticisi: yapay zekâ (AI-007 kota, AI-008 maliyet). Klinik bazında aç/kapat, fon ekleme, bu ayın kredi durumu;
 * seçilen ayın gerçek token, kredi ve tahmini maliyeti, sistem sınırına uzaklık ve klinik/özellik/model kırılımı.
 * Maliyet ayardaki fiyatla tahmindir; hiçbir alan klinik metin içermez.
 */
@Component({
    selector: 'app-ai-admin-page',
    standalone: true,
    imports: [
        FormsModule,
        ButtonModule,
        ConfirmDialogModule,
        InputTextModule,
        SelectModule,
        TableModule,
        ToastModule,
        ToggleSwitchModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        AiFundGrantDialogComponent
    ],
    providers: [MessageService, ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="top-right" />
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
        <app-ai-fund-grant-dialog [(visible)]="fundDialogVisible" [clinic]="fundClinic()" (granted)="onFundGranted($event)" />

        <app-page-header
            title="Yapay zekâ"
            description="Klinik bazında açma, kredi ve fon, aylık kullanım ve tahmini maliyet. Maliyet ayardaki model fiyatıyla hesaplanır, fatura değildir. Yalnız Vetinity platform yöneticisi görür."
        >
            <div actions class="flex items-center gap-2">
                <label for="aiAdminMonth" class="text-sm text-muted-color">Ay</label>
                <p-select inputId="aiAdminMonth" [options]="monthOptions" optionLabel="label" optionValue="value" [ngModel]="month()" (ngModelChange)="selectMonth($event)" styleClass="min-w-40" data-testid="ai-admin-month" />
            </div>
        </app-page-header>

        @if (usageLoading() && !usage()) {
            <div class="card"><app-loading-state message="Yapay zekâ kullanımı yükleniyor…" /></div>
        } @else if (usageError()) {
            <div class="card"><app-error-state [detail]="usageError()!" (retry)="loadUsage()" /></div>
        } @else if (usage(); as u) {
            @if (!u.isConfigured) {
                <p class="mt-0 mb-3 text-sm text-muted-color" role="status" data-testid="ai-admin-not-configured">
                    <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>Sağlayıcı anahtarı tanımlı değil; yapay zekâ bu sunucuda kapalı. Klinik açılsa da kullanılamaz.
                </p>
            }
            <div class="grid grid-cols-12 gap-4 mb-4">
                @for (card of cards(); track card.testId) {
                    <div class="col-span-12 md:col-span-6 xl:col-span-3">
                        <div class="card mb-0 h-full" [attr.data-testid]="card.testId">
                            <div class="text-muted-color text-sm mb-1">{{ card.label }}</div>
                            <div class="text-3xl font-semibold leading-tight">{{ card.value }}</div>
                            <div class="text-sm text-muted-color mt-1">{{ card.detail }}</div>
                        </div>
                    </div>
                }
            </div>
        }

        <div class="card">
            <div class="flex flex-wrap items-end justify-between gap-3 mb-3">
                <div>
                    <h3 class="m-0 text-base font-semibold">Klinikler</h3>
                    <p class="mt-1 mb-0 text-sm text-muted-color">Kredi durumu bu ayındır. Filtre boşken yapay zekâsı bir kez açılmış klinikler görünür; açılacak kliniği adıyla ya da kurum adıyla arayın.</p>
                </div>
                <form class="flex gap-2" (submit)="$event.preventDefault(); searchClinics()">
                    <input pInputText type="search" [(ngModel)]="searchText" name="aiAdminSearch" placeholder="Klinik ya da kurum adı" aria-label="Klinik ya da kurum adına göre filtre" class="w-60" data-testid="ai-admin-search" />
                    <button pButton type="submit" severity="secondary" [disabled]="clinicsLoading()"><i class="pi pi-search p-button-icon"></i>Filtrele</button>
                </form>
            </div>

            @if (clinicsLoading() && clinics().length === 0) {
                <app-loading-state message="Klinikler yükleniyor…" />
            } @else if (clinicsError()) {
                <app-error-state [detail]="clinicsError()!" (retry)="searchClinics()" />
            } @else if (clinics().length === 0) {
                <app-empty-state [message]="appliedSearch() ? 'Filtreye uyan klinik yok.' : 'Henüz yapay zekâsı açılmış klinik yok. Açmak için kliniği arayın.'" />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="clinics()" dataKey="clinicId">
                        <ng-template #header>
                            <tr>
                                <th>Klinik</th>
                                <th>Paket</th>
                                <th>Yapay zekâ</th>
                                <th class="min-w-48">Bu ay</th>
                                <th class="text-right">Kalan</th>
                                <th class="text-right">Fon</th>
                                <th>Yenilenme</th>
                                <th></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr data-testid="ai-admin-clinic-row">
                                <td>
                                    <div class="font-medium">{{ row.clinicName }}</div>
                                    <div class="text-sm text-muted-color">{{ row.tenantName }}@if (!row.isClinicActive) {<span> · pasif klinik</span>}</div>
                                </td>
                                <td>{{ planLabel(row) }}</td>
                                <td>
                                    <p-toggleswitch
                                        [ngModel]="row.isEnabled"
                                        (ngModelChange)="confirmToggle(row, $event)"
                                        [disabled]="savingId() !== null"
                                        [ariaLabel]="row.clinicName + ' için yapay zekâ'"
                                        data-testid="ai-admin-toggle"
                                    />
                                </td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <div class="h-2 flex-1 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden" aria-hidden="true">
                                            <div class="h-full rounded-full" [class]="row.usedPercent >= warningPercent ? 'bg-amber-500' : 'bg-primary'" [style.width.%]="row.usedPercent"></div>
                                        </div>
                                        <span class="text-sm tabular-nums">%{{ row.usedPercent }}</span>
                                    </div>
                                    <div class="text-xs text-muted-color mt-1">{{ number(row.creditsUsedThisMonth) }} / {{ number(row.monthlyCredits) }} kredi</div>
                                </td>
                                <td class="text-right tabular-nums">
                                    @if (row.usedPercent >= 100) {
                                        <app-status-tag label="Bitti" severity="warn" />
                                    } @else {
                                        {{ number(row.creditsRemaining) }}
                                    }
                                </td>
                                <td class="text-right tabular-nums">{{ number(row.fundCredits) }}</td>
                                <td class="whitespace-nowrap">{{ date(row.quotaResetsAtUtc) }}</td>
                                <td class="text-right">
                                    <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="openFund(row)" data-testid="ai-admin-fund"><i class="pi pi-plus p-button-icon"></i>Fon ekle</button>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        @if (usage(); as u) {
            <div class="grid grid-cols-12 gap-4">
                @for (b of breakdowns(); track b.testId) {
                    <div [class]="b.wide ? 'col-span-12' : 'col-span-12 xl:col-span-6'">
                        <div class="card mb-0 h-full" [attr.data-testid]="b.testId">
                            <h3 class="mt-0 mb-3 text-base font-semibold">{{ b.title }} · {{ monthLabel(u.month) }}</h3>
                            @if (b.rows.length === 0) {
                                <p class="m-0 text-sm text-muted-color">Bu ay kullanım yok.</p>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="b.rows" dataKey="key">
                                        <ng-template #header>
                                            <tr>
                                                <th>{{ b.column }}</th>
                                                <th class="text-right">İstek</th>
                                                <th class="text-right">Token (giriş / çıkış)</th>
                                                <th class="text-right">Kredi</th>
                                                <th class="text-right">Tahmini maliyet</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-row>
                                            <tr data-testid="ai-admin-breakdown-row">
                                                <td>
                                                    <div>{{ row.label }}</div>
                                                    @if (row.detail) {
                                                        <div class="text-sm text-muted-color">{{ row.detail }}</div>
                                                    }
                                                </td>
                                                <td class="text-right tabular-nums">
                                                    {{ number(row.usage.requests) }}
                                                    @if (row.usage.failedRequests > 0) {
                                                        <div class="text-xs text-muted-color">{{ number(row.usage.failedRequests) }} başarısız</div>
                                                    }
                                                </td>
                                                <td class="text-right tabular-nums whitespace-nowrap">{{ number(row.usage.inputTokens) }} / {{ number(row.usage.outputTokens) }}</td>
                                                <td class="text-right tabular-nums">{{ credits(row.usage.credits) }}</td>
                                                <td class="text-right tabular-nums">{{ usd(row.usage.costUsd) }}</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>
        }
    `
})
export class AiAdminPageComponent implements OnInit {
    private readonly service = inject(AiAdminService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly messages = inject(MessageService);

    readonly monthOptions = aiRecentMonths(MONTH_OPTION_COUNT);
    readonly warningPercent = WARNING_PERCENT;

    readonly month = signal<string>(this.monthOptions[0].value);
    readonly usage = signal<AiAdminUsageDto | null>(null);
    readonly usageLoading = signal(true);
    readonly usageError = signal<string | null>(null);

    searchText = '';
    readonly appliedSearch = signal('');
    readonly clinics = signal<AiAdminClinicDto[]>([]);
    readonly clinicsLoading = signal(true);
    readonly clinicsError = signal<string | null>(null);
    readonly savingId = signal<string | null>(null);

    fundDialogVisible = false;
    readonly fundClinic = signal<AiAdminClinicDto | null>(null);

    readonly cards = computed<MetricCard[]>(() => {
        const u = this.usage();

        if (!u) {
            return [];
        }

        const s = u.system;

        return [
            {
                testId: 'ai-admin-cost',
                label: 'Tahmini maliyet',
                value: formatAiUsd(s.costUsd),
                detail: `Sistem sınırı ${formatAiUsd(u.budget.limitUsd)} · kalan ${formatAiUsd(u.budget.remainingUsd)} (%${u.budget.usedPercent} kullanıldı)`
            },
            { testId: 'ai-admin-requests', label: 'İstek', value: formatAiNumber(s.requests), detail: `${formatAiNumber(s.failedRequests)} başarısız · model ${u.model}` },
            { testId: 'ai-admin-tokens', label: 'Token', value: formatAiNumber(s.tokens), detail: `Giriş ${formatAiNumber(s.inputTokens)} · çıkış ${formatAiNumber(s.outputTokens)}` },
            { testId: 'ai-admin-credits', label: 'Harcanan kredi', value: this.credits(s.credits), detail: `Fondan ${this.credits(s.fundCredits)} · 1 kredi = ${formatAiUsd(u.limits.creditValueUsd)}` }
        ];
    });

    readonly breakdowns = computed(() => {
        const u = this.usage();

        if (!u) {
            return [];
        }

        const byClinic: BreakdownRow[] = u.clinics.map((c) => ({ key: c.clinicId, label: c.clinicName, detail: c.tenantName + (c.isEnabled ? '' : ' · kapalı'), usage: c.usage }));
        const byFeature: BreakdownRow[] = u.features.map((f) => ({ key: f.feature, label: aiFeatureLabel(f.feature), detail: null, usage: f.usage }));
        const byModel: BreakdownRow[] = u.models.map((m) => ({ key: m.model, label: m.model, detail: null, usage: m.usage }));
        // Aynı kullanıcı birden çok klinikte ayrı satırdır; anahtar ikisini birlikte taşır.
        const byUser: BreakdownRow[] = (u.users ?? []).map((x) => ({
            key: `${x.userId}:${x.clinicId}`,
            label: x.userName || x.email,
            detail: [x.userName ? x.email : null, x.clinicName, x.tenantName].filter(Boolean).join(' · '),
            usage: x.usage
        }));

        return [
            { testId: 'ai-admin-by-clinic', title: 'Kliniklere göre', column: 'Klinik', rows: byClinic, wide: true },
            { testId: 'ai-admin-by-user', title: 'Kullanıcılara göre (en çok harcayan 50)', column: 'Kullanıcı', rows: byUser, wide: true },
            { testId: 'ai-admin-by-feature', title: 'Özelliklere göre', column: 'Özellik', rows: byFeature, wide: false },
            { testId: 'ai-admin-by-model', title: 'Modellere göre', column: 'Model', rows: byModel, wide: false }
        ];
    });

    ngOnInit(): void {
        this.loadUsage();
        this.searchClinics();
    }

    selectMonth(month: string): void {
        if (month && month !== this.month()) {
            this.month.set(month);
            this.loadUsage();
        }
    }

    loadUsage(): void {
        const month = this.month();

        this.usageLoading.set(true);
        this.usageError.set(null);
        this.service.usage(month).subscribe({
            next: (u) => {
                if (this.month() === month) {
                    this.usage.set(u);
                    this.usageLoading.set(false);
                }
            },
            error: (e: unknown) => {
                this.usageError.set(e instanceof Error ? e.message : 'Yapay zekâ kullanımı yüklenemedi.');
                this.usageLoading.set(false);
            }
        });
    }

    searchClinics(): void {
        const term = this.searchText.trim();

        if (term.length === 1) {
            this.clinicsError.set(null);
            this.messages.add({ severity: 'info', summary: 'Filtre', detail: 'Filtre için en az 2 karakter yazın.' });

            return;
        }

        this.appliedSearch.set(term);
        this.clinicsLoading.set(true);
        this.clinicsError.set(null);
        this.service.clinics(term).subscribe({
            next: (rows) => {
                this.clinics.set(rows);
                this.clinicsLoading.set(false);
            },
            error: (e: unknown) => {
                this.clinicsError.set(e instanceof Error ? e.message : 'Klinikler yüklenemedi.');
                this.clinicsLoading.set(false);
            }
        });
    }

    confirmToggle(row: AiAdminClinicDto, enable: boolean): void {
        this.confirmation.confirm({
            header: enable ? 'Yapay zekâyı aç' : 'Yapay zekâyı kapat',
            message: enable
                ? `${row.clinicName} için yapay zekâ açılacak. Kullanım Vetinity'nin sağlayıcı hesabına yazılır; klinik kredisi biterse yalnız yapay zekâ durur.`
                : `${row.clinicName} için yapay zekâ kapatılacak. Bekleyen taslaklar okunabilir ve karara bağlanabilir; yeni üretim durur.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: enable ? 'Aç' : 'Kapat',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setEnabled(row, enable),
            // Vazgeçilirse anahtar eski konumuna döner.
            reject: () => this.replaceRow({ ...row })
        });
    }

    openFund(row: AiAdminClinicDto): void {
        this.fundClinic.set(row);
        this.fundDialogVisible = true;
    }

    onFundGranted(row: AiAdminClinicDto): void {
        this.replaceRow(row);
        this.messages.add({ severity: 'success', summary: 'Tamam', detail: `${row.clinicName} için fon eklendi.` });
    }

    planLabel(row: AiAdminClinicDto): string {
        return row.planCode ? subscriptionPlanLabel(row.planCode, null) : '—';
    }

    monthLabel(month: string): string {
        return aiMonthLabel(month);
    }

    number(value: number): string {
        return formatAiNumber(value);
    }

    /** Kredi kırılımları iki ondalıklı gelir; tabloda bir ondalık yeterli. */
    credits(value: number): string {
        return formatAiNumber(value, 1);
    }

    usd(value: number): string {
        return formatAiUsd(value);
    }

    date(value: string): string {
        return formatDateDisplay(value);
    }

    private setEnabled(row: AiAdminClinicDto, enable: boolean): void {
        this.savingId.set(row.clinicId);
        this.service.setEnabled(row.clinicId, enable).subscribe({
            next: (saved) => {
                this.savingId.set(null);
                this.replaceRow(saved);
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: `${saved.clinicName} için yapay zekâ ${saved.isEnabled ? 'açıldı' : 'kapatıldı'}.` });

                if (this.usage()?.isCurrentMonth) {
                    this.loadUsage();
                }
            },
            error: (e: unknown) => {
                this.savingId.set(null);
                this.replaceRow({ ...row });
                this.messages.add({ severity: 'error', summary: 'Kaydedilemedi', detail: e instanceof Error ? e.message : 'Klinik ayarı kaydedilemedi.' });
            }
        });
    }

    private replaceRow(row: AiAdminClinicDto): void {
        this.clinics.update((rows) => rows.map((r) => (r.clinicId === row.clinicId ? row : r)));
    }
}
