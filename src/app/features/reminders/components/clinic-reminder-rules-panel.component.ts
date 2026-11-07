import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { REMINDERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { CLINIC_REMINDER_RULE_TEXT, type ClinicReminderRuleDto, type ClinicReminderRuleUpdateDto } from '@/app/features/reminders/models/clinic-reminder-rule.model';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Klinik başına otomatik hatırlatıcılar (TIER-003, `AUTOMATED_REMINDERS_API_CONTRACT.md`): kural aç/kapat ve gün. Aktif klinik içindir.
 * Pakette yoksa "üst pakete geç" kutusu çıkar. Ticari ileti sayılan kural, gönderim açılana dek değiştirilemez ve nedeni yazılır.
 */
@Component({
    selector: 'app-clinic-reminder-rules-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputNumberModule, ToggleSwitchModule, AppPlanUpgradeNoticeComponent, AppErrorStateComponent, AppLoadingStateComponent],
    template: `
        <section class="card mt-4 mb-0" aria-labelledby="automatedRemindersTitle" data-testid="reminder-rules">
            <h5 id="automatedRemindersTitle" class="mt-0">Otomatik hatırlatıcılar</h5>
            @if (planLocked()) {
                <app-plan-upgrade-notice feature="AutomatedReminders" detail="Kontrol muayenesi ve ödenmemiş bakiye için hasta sahibine kendiliğinden e-posta gider. Randevu ve aşı hatırlatmaları her pakette açıktır." />
            } @else if (loading()) {
                <app-loading-state message="Kurallar yükleniyor…" />
            } @else if (loadError(); as err) {
                <app-error-state [detail]="err" (retry)="reload()" />
            } @else {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    {{ clinicName() }} kliniği için geçerlidir. Kurallar kapalı başlar; açtığınız andan sonra vadesi gelenlere e-posta gider. E-posta kanalı açık olmalıdır, hatırlatma istemeyen müşteriye gitmez.
                </p>
                <div class="flex flex-col gap-4">
                    @for (rule of rules(); track rule.ruleType) {
                        <div class="flex flex-col gap-2" [attr.data-testid]="'reminder-rule-' + rule.ruleType">
                            <div class="flex flex-wrap items-center gap-3">
                                <p-toggleswitch
                                    [inputId]="'rule-' + rule.ruleType"
                                    [ngModel]="rule.isEnabled"
                                    (ngModelChange)="patch(rule.ruleType, { isEnabled: $event })"
                                    [disabled]="locked(rule)"
                                />
                                <label [for]="'rule-' + rule.ruleType" class="font-medium">{{ text[rule.ruleType].title }}</label>
                                <span class="flex flex-wrap items-center gap-2 text-sm">
                                    <span>{{ text[rule.ruleType].before }}</span>
                                    <p-inputnumber
                                        [inputId]="'rule-days-' + rule.ruleType"
                                        [ngModel]="rule.days"
                                        (ngModelChange)="patch(rule.ruleType, { days: $event })"
                                        [min]="rule.minDays"
                                        [max]="rule.maxDays"
                                        [useGrouping]="false"
                                        [disabled]="locked(rule)"
                                        [ariaLabel]="text[rule.ruleType].title + ' gün sayısı'"
                                        inputStyleClass="w-20"
                                    />
                                    <span>{{ text[rule.ruleType].after }}</span>
                                </span>
                            </div>
                            <small class="text-muted-color">{{ text[rule.ruleType].detail }} {{ rule.minDays }}–{{ rule.maxDays }} gün.</small>
                            @if (!rule.sendingAvailable) {
                                <small class="text-amber-700 dark:text-amber-300" role="note" data-testid="reminder-rule-commercial">
                                    <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>Şu an kullanılamıyor: bu ileti ticari ileti sayılabildiği için yasal onay süreci tamamlanmadan gönderilmez.
                                </small>
                            }
                        </div>
                    }
                </div>
                @if (saveError(); as err) {
                    <p class="text-red-500 text-sm mt-4 mb-0" role="alert">{{ err }}</p>
                }
                @if (saved()) {
                    <p class="text-sm mt-4 mb-0" role="status">Kaydedildi.</p>
                }
                @if (canWrite()) {
                    <div class="mt-4">
                        <button pButton type="button" [disabled]="saving() || !dirty()" data-testid="reminder-rules-save" (click)="save()"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Kaydet</button>
                    </div>
                }
            }
        </section>
    `
})
export class ClinicReminderRulesPanelComponent implements OnInit {
    private readonly reminders = inject(RemindersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly text = CLINIC_REMINDER_RULE_TEXT;
    readonly rules = signal<readonly ClinicReminderRuleDto[]>([]);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly saved = signal(false);
    readonly dirty = signal(false);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('AutomatedReminders') !== null);
    readonly canWrite = computed(() => this.auth.hasOperationClaim(REMINDERS_MANAGE_CLAIM) && !this.ro.mutationBlocked());
    readonly clinicName = computed(() => this.auth.getClinicName() ?? 'Aktif');

    private clinicId = '';

    ngOnInit(): void {
        this.clinicId = this.auth.getClinicId()?.trim() ?? '';
        this.reload();
    }

    reload(): void {
        if (!this.clinicId) {
            this.loading.set(false);
            this.loadError.set('Aktif klinik bulunamadı.');

            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.reminders.getClinicRules(this.clinicId).subscribe({
            next: (dto) => {
                this.rules.set(dto.rules);
                this.dirty.set(false);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Kurallar yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    locked(rule: ClinicReminderRuleDto): boolean {
        return !this.canWrite() || this.saving() || !rule.sendingAvailable;
    }

    patch(ruleType: ClinicReminderRuleDto['ruleType'], change: Partial<Pick<ClinicReminderRuleDto, 'isEnabled' | 'days'>>): void {
        this.rules.update((rows) => rows.map((r) => (r.ruleType === ruleType ? { ...r, ...change } : r)));
        this.dirty.set(true);
        this.saved.set(false);
    }

    save(): void {
        const rows: ClinicReminderRuleUpdateDto[] = this.rules()
            .filter((r) => r.sendingAvailable)
            .map((r) => ({ ruleType: r.ruleType, isEnabled: r.isEnabled, days: Number(r.days) }));

        this.saving.set(true);
        this.saveError.set(null);
        this.reminders.saveClinicRules(this.clinicId, rows).subscribe({
            next: (dto) => {
                this.rules.set(dto.rules);
                this.saving.set(false);
                this.dirty.set(false);
                this.saved.set(true);
            },
            error: (e: Error) => {
                this.saving.set(false);
                this.saveError.set(panelHttpFailureMessage(e, 'Kurallar kaydedilemedi.'));
            }
        });
    }
}
