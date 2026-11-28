import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicAiSettingsVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { ClinicAiSettingsService } from '@/app/entities/ai/services/clinic-ai-settings.service';
import { AI_USAGE_WARNING_PERCENT, aiStatusResetLabel } from '@/app/entities/ai/utils/ai-error.utils';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Kullanılamama nedeni → tek cümle (`/ai/status` sırası). Klinikte kapalıysa anahtar zaten söyler, cümle yok. */
const UNAVAILABLE_REASONS: Record<string, string> = {
    'Ai.NotConfigured': 'Yapay zekâ hizmeti sistemde henüz açılmadı. Burada açarsanız hizmet açıldığında çalışmaya başlar.',
    'Ai.ClinicQuotaExceeded': 'Bu ayın kredisi bitti. Yalnız yapay zekâ özellikleri durdu, diğer işler etkilenmez.',
    'Ai.SystemBudgetExhausted': 'Yapay zekâ şu an kullanılamıyor; daha sonra tekrar deneyin.'
};

const NUMBER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/**
 * Klinik ayarlarında yapay zekâ (ADR-044 E1, TIER-013 Dilim 1; `AI_HISTORY_SUMMARY_API_CONTRACT.md` §3a): durum, bu ayın kredisi
 * ve eklenen krediler. Klinik yöneticisi (`Clinics.Update`) açar ve kapatır; ilk açılışta sunucudan gelen bilgilendirmeyi kabul
 * eder. Dolar gösterilmez. Ek kredi satın alma sonraki dilimde gelir; çalışmadığı için burada yer almaz.
 */
@Component({
    selector: 'app-ai-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ButtonModule,
        CheckboxModule,
        ConfirmDialogModule,
        DialogModule,
        MessageModule,
        SelectModule,
        ToggleSwitchModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="settingsRoute"
            categoryLinkLabel="Ayarlar"
            title="Yapay zekâ"
            description="Yapay zekâ hasta geçmişi özeti, muayene notu ve hasta sahibine açıklama gibi taslaklar hazırlar; hekim kontrol etmeden hiçbir kayda yazılmaz."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle ayar salt okunur.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Ayarı yalnız klinik yönetim yetkisi olan kullanıcı değiştirir.</p>
        }

        @if (clinicOptions().length > 1) {
            <div class="flex flex-col gap-1 w-full md:max-w-sm mb-4">
                <label for="aiClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                <p-select inputId="aiClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="onClinicChange($event)" optionLabel="label" optionValue="value" class="w-full" />
            </div>
        }

        @if (loading()) {
            <app-loading-state message="Yapay zekâ ayarı yükleniyor…" />
        } @else if (error()) {
            <app-error-state [detail]="error()!" (retry)="reload()" />
        } @else if (settings(); as s) {
            <div class="flex flex-col gap-4">
                <section class="card mb-0" aria-labelledby="aiStateTitle" data-testid="ai-settings-state">
                    <h5 id="aiStateTitle" class="mt-0 mb-3">Durum</h5>
                    <div class="flex flex-col gap-3">
                        @if (message(); as m) {
                            <p-message [severity]="m.severity" class="w-full" role="status">{{ m.text }}</p-message>
                        }
                        <div class="flex flex-wrap items-center gap-x-7 gap-y-3">
                            <div class="flex items-center gap-3">
                                <p-toggleswitch inputId="aiEnabled" [ngModel]="toggle()" (ngModelChange)="onToggle($event)" [disabled]="!canWrite() || saving()" data-testid="ai-enabled" />
                                <label for="aiEnabled">Yapay zekâ bu klinikte açık</label>
                            </div>
                            <app-status-tag [label]="stateLabel()" [severity]="stateSeverity()" />
                        </div>
                        @if (reason(); as r) {
                            <p class="m-0 text-sm" data-testid="ai-settings-reason">{{ r }}</p>
                        }
                        <small class="text-muted-color">
                            Kapatmak taslakları ve krediyi silmez; tekrar açınca kaldığı yerden devam eder.
                            @if (s.updatedAtUtc) {
                                <span class="whitespace-nowrap">Son değişiklik: {{ dateTime(s.updatedAtUtc) }}</span>
                            }
                            @if (s.acknowledgedAtUtc) {
                                <span class="whitespace-nowrap">· Bilgilendirme kabulü: {{ dateTime(s.acknowledgedAtUtc) }}</span>
                            }
                        </small>
                    </div>
                </section>

                <section class="card mb-0" aria-labelledby="aiMonthTitle" data-testid="ai-settings-month">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                        <h5 id="aiMonthTitle" class="m-0">Bu ay</h5>
                        <span class="text-sm text-muted-color">{{ resetLabel() }}</span>
                    </div>
                    <dl class="grid grid-cols-2 md:grid-cols-4 gap-4 m-0">
                        @for (c of creditCells(); track c.label) {
                            <div class="flex flex-col gap-0.5">
                                <dt class="text-sm text-muted-color">{{ c.label }}</dt>
                                <dd class="m-0 text-xl font-semibold tabular-nums" [attr.data-testid]="c.testId">{{ c.value }}</dd>
                            </div>
                        }
                    </dl>
                    <div
                        class="h-2 mt-4 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden"
                        role="progressbar"
                        aria-label="Bu ayki yapay zekâ kullanımı"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        [attr.aria-valuenow]="s.usedPercent"
                    >
                        <div class="h-full rounded-full" [class]="s.usedPercent >= warningPercent ? 'bg-amber-500' : 'bg-primary'" [style.width.%]="s.usedPercent"></div>
                    </div>
                    <p class="mt-3 mb-0 text-sm text-muted-color">
                        Önce bu ayın paket kredisi, sonra eklenen kredi harcanır. Paket kredisi ay sonunda sıfırlanır; eklenen kredi devreder.
                        @if (s.monthlyCredits === 0) {
                            Paketinizde aylık yapay zekâ kredisi yok; yalnız eklenen kredi kullanılır.
                        }
                    </p>
                </section>

                <section class="card mb-0" aria-labelledby="aiGrantsTitle" data-testid="ai-settings-grants">
                    <h5 id="aiGrantsTitle" class="mt-0 mb-3">Eklenen krediler</h5>
                    @if (s.creditGrants.length === 0) {
                        <p class="m-0 text-sm text-muted-color" data-testid="ai-settings-grants-empty">Henüz eklenen kredi yok.</p>
                    } @else {
                        <ul class="m-0 p-0 list-none flex flex-col divide-y divide-surface" data-testid="ai-settings-grant-list">
                            @for (g of s.creditGrants; track g.id) {
                                <li class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0 text-sm">
                                    <span><span class="font-medium tabular-nums">+{{ number(g.credits) }} kredi</span> <span class="text-muted-color">· {{ grantKindLabel(g.kind) }}</span></span>
                                    <span class="text-muted-color whitespace-nowrap">{{ date(g.createdAtUtc) }}</span>
                                </li>
                            }
                        </ul>
                    }
                </section>
            </div>

            <p-dialog header="Yapay zekâyı aç" [modal]="true" [visible]="ackOpen()" (visibleChange)="onAckVisibleChange($event)" [style]="{ width: 'min(36rem, 95vw)' }" [draggable]="false" [closable]="!saving()" data-testid="ai-ack-dialog">
                <p class="mt-0 mb-3 text-sm">Açmadan önce lütfen okuyun:</p>
                <ul class="mt-0 mb-4 pl-5 flex flex-col gap-2 text-sm" data-testid="ai-ack-items">
                    @for (item of s.acknowledgementItems; track $index) {
                        <li>{{ item }}</li>
                    }
                </ul>
                <div class="flex items-start gap-2">
                    <p-checkbox inputId="aiAck" [binary]="true" [ngModel]="ackChecked()" (ngModelChange)="ackChecked.set($event)" data-testid="ai-ack-check" />
                    <label for="aiAck" class="text-sm">Okudum; bu klinikte yapay zekânın açılmasını kabul ediyorum.</label>
                </div>
                <ng-template #footer>
                    <button pButton type="button" severity="secondary" (click)="onAckVisibleChange(false)" [disabled]="saving()">Vazgeç</button>
                    <button pButton type="button" (click)="acceptAndEnable()" [disabled]="!ackChecked() || saving()" data-testid="ai-ack-submit">
                        <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kabul et ve aç
                    </button>
                </ng-template>
            </p-dialog>
        }

        <p-confirmdialog [style]="{ width: 'min(480px, 95vw)' }" />
    `
})
export class AiSettingsPageComponent implements OnInit {
    readonly settingsRoute = SETTINGS_ROUTE;
    readonly warningPercent = AI_USAGE_WARNING_PERCENT;

    private readonly service = inject(ClinicAiSettingsService);
    private readonly aiStatus = inject(AiStatusService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly confirmation = inject(ConfirmationService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());
    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly settings = signal<ClinicAiSettingsVm | null>(null);
    /** Anahtarın görünen değeri; onay ya da bilgilendirme reddedilirse sunucudaki değere döner. */
    readonly toggle = signal(false);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly message = signal<{ text: string; severity: 'success' | 'error' } | null>(null);
    readonly ackOpen = signal(false);
    readonly ackChecked = signal(false);

    readonly stateLabel = computed(() => {
        const s = this.settings();

        if (!s?.isEnabled) {
            return 'Kapalı';
        }

        return s.isAvailable ? 'Açık: kullanılabilir' : 'Açık: şu an kullanılamıyor';
    });
    readonly stateSeverity = computed(() => {
        const s = this.settings();

        return !s?.isEnabled ? 'secondary' : s.isAvailable ? 'success' : 'warn';
    });
    readonly reason = computed(() => {
        const code = this.settings()?.unavailableCode;

        return code ? (UNAVAILABLE_REASONS[code] ?? null) : null;
    });
    readonly resetLabel = computed(() => `Paket kredisi ${aiStatusResetLabel(this.settings())}`);
    readonly creditCells = computed(() => {
        const s = this.settings();

        if (!s) {
            return [];
        }

        return [
            { label: 'Paket kredisi', value: NUMBER.format(s.monthlyCredits), testId: 'ai-credit-monthly' },
            { label: 'Bu ay harcanan', value: NUMBER.format(s.creditsUsedThisMonth), testId: 'ai-credit-used' },
            { label: 'Eklenen kredi', value: NUMBER.format(s.fundCredits), testId: 'ai-credit-fund' },
            { label: 'Kalan', value: NUMBER.format(s.creditsRemaining), testId: 'ai-credit-remaining' }
        ];
    });

    number = (value: number) => NUMBER.format(value);
    date = (utc: string) => formatDateDisplay(utc);
    dateTime = (utc: string) => formatDateTimeDisplay(utc);
    grantKindLabel = (kind: string) => (kind === 'Manual' ? 'Vetinity tarafından eklendi' : 'Satın alındı');

    private loadSeq = 0;

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.reload();
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((c) => c.isActive !== false || c.id === active).map((c) => ({ value: c.id, label: c.name }));

                this.clinicOptions.set(options.length > 0 ? options : this.clinicOptions());

                if (!this.clinicId() && options.length > 0) {
                    this.onClinicChange(options[0].value);
                }
            },
            error: () => undefined
        });
    }

    onClinicChange(clinicId: string): void {
        if (clinicId !== this.clinicId()) {
            this.clinicId.set(clinicId);
            this.reload();
        }
    }

    reload(): void {
        const clinicId = this.clinicId();
        const seq = ++this.loadSeq;

        this.message.set(null);

        if (!clinicId) {
            this.loading.set(false);
            this.error.set('Aktif klinik bulunamadı.');

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.service.get(clinicId).subscribe({
            next: (s) => {
                if (seq === this.loadSeq) {
                    this.apply(s);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Yapay zekâ ayarı yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }

    onToggle(enabled: boolean): void {
        const s = this.settings();

        this.toggle.set(enabled);

        if (!s || !this.canWrite() || enabled === s.isEnabled) {
            return;
        }

        if (enabled) {
            if (s.hasAcknowledged) {
                this.save(true);
            } else {
                this.ackChecked.set(false);
                this.ackOpen.set(true);
            }

            return;
        }

        this.confirmation.confirm({
            header: 'Yapay zekâyı kapat',
            message: 'Bu klinikte yapay zekâ özellikleri kapanır. Taslaklar, kredi ve geçmiş silinmez; tekrar açınca geri gelir. Diğer işler etkilenmez.',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Kapat',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.save(false),
            reject: () => this.toggle.set(s.isEnabled)
        });
    }

    onAckVisibleChange(visible: boolean): void {
        if (!visible && !this.saving()) {
            this.ackOpen.set(false);
            this.toggle.set(this.settings()?.isEnabled ?? false);
        }
    }

    acceptAndEnable(): void {
        const s = this.settings();

        if (s && this.ackChecked()) {
            this.save(true, s.acknowledgementVersion);
        }
    }

    private save(enabled: boolean, acknowledgementVersion?: number): void {
        this.saving.set(true);
        this.message.set(null);
        this.service.save(this.clinicId(), enabled, acknowledgementVersion).subscribe({
            next: (s) => {
                this.saving.set(false);
                this.ackOpen.set(false);
                this.apply(s);
                this.message.set({ text: s.isEnabled ? 'Kaydedildi. Yapay zekâ bu klinikte açık.' : 'Kaydedildi. Yapay zekâ bu klinikte kapalı.', severity: 'success' });
                // Giriş düğmeleri ve Ayarlar'daki kullanım kartı yeni durumu görsün.
                this.aiStatus.refresh();
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.ackOpen.set(false);
                this.toggle.set(this.settings()?.isEnabled ?? false);
                this.message.set({ text: e instanceof Error ? e.message : 'Yapay zekâ ayarı kaydedilemedi.', severity: 'error' });
            }
        });
    }

    private apply(s: ClinicAiSettingsVm): void {
        this.settings.set(s);
        this.toggle.set(s.isEnabled);
    }
}
