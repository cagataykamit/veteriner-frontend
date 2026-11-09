import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { REMINDERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import {
    CLINIC_REMINDER_RULE_TEXT,
    type ClinicMarketingGateDto,
    type ClinicReminderRuleDto,
    type ClinicReminderRuleUpdateDto
} from '@/app/features/reminders/models/clinic-reminder-rule.model';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Klinik başına otomatik hatırlatıcılar (TIER-003, `AUTOMATED_REMINDERS_API_CONTRACT.md`): kural aç/kapat ve gün. Aktif klinik içindir.
 * Pakette yoksa "üst pakete geç" kutusu çıkar. Ticari ileti sayılan kural (`NoReturn`) açılabilir; gönderim kliniğin ticari ileti kapısına
 * bağlıdır (ADR-046). Kapı İYS beyanıyla açılır; kapalıyken kuralın gönderim yapmadığı açıkça yazılır.
 */
@Component({
    selector: 'app-clinic-reminder-rules-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, CheckboxModule, InputNumberModule, ToggleSwitchModule, AppPlanUpgradeNoticeComponent, AppErrorStateComponent, AppLoadingStateComponent, TrDateTimePipe],
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
                                    [disabled]="editLocked()"
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
                                        [disabled]="editLocked()"
                                        [ariaLabel]="text[rule.ruleType].title + ' gün sayısı'"
                                        inputStyleClass="w-20"
                                    />
                                    <span>{{ text[rule.ruleType].after }}</span>
                                </span>
                            </div>
                            <small class="text-muted-color">{{ text[rule.ruleType].detail }} {{ rule.minDays }}–{{ rule.maxDays }} gün.</small>
                            @if (!rule.sendingAvailable) {
                                <small class="text-amber-700 dark:text-amber-300" role="note" data-testid="reminder-rule-commercial">
                                    <i class="pi pi-info-circle mr-1" aria-hidden="true"></i>Kliniğin ticari ileti gönderimi kapalı: kural açık olsa da gönderim yapılmaz. Aşağıdan İYS beyanıyla açabilirsiniz.
                                </small>
                            }
                        </div>
                    }
                </div>
                @if (saveError(); as err) {
                    <p class="text-danger text-sm mt-4 mb-0" role="alert">{{ err }}</p>
                }
                @if (saved()) {
                    <p class="text-sm mt-4 mb-0" role="status">Kaydedildi.</p>
                }
                @if (canWrite()) {
                    <div class="mt-4">
                        <button pButton type="button" [disabled]="saving() || !dirty()" data-testid="reminder-rules-save" (click)="save()"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Kaydet</button>
                    </div>
                }

                @if (gate(); as g) {
                    <div class="mt-5 p-3 border-round border border-surface-200 dark:border-surface-700" data-testid="marketing-gate">
                        <div class="font-medium mb-1">Ticari ileti gönderimi</div>
                        @if (g.isEnabled) {
                            <p class="m-0 text-sm" data-testid="marketing-gate-open">
                                Açık. "Uzun süredir gelmedi" iletisi yalnız bu klinik için ticari ileti onayı veren sahibe gider.
                                @if (g.declaredAtUtc) {
                                    İYS beyanı {{ g.declaredAtUtc | trDateTime }} tarihinde verildi.
                                }
                            </p>
                            @if (canWrite()) {
                                <button pButton type="button" severity="secondary" class="mt-3" [disabled]="gateSaving()" data-testid="marketing-gate-close" (click)="closeGate()"><i class="p-button-icon" [class]="gateSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-times'"></i>Gönderimi kapat</button>
                            }
                        } @else {
                            <p class="m-0 text-sm text-muted-color" data-testid="marketing-gate-closed">Kapalı. Açmadan ticari ileti gönderilmez; hatırlatmalar (randevu, aşı, kontrol, borç) bundan etkilenmez.</p>
                            @if (canWrite()) {
                                <div class="flex items-start gap-2 mt-3">
                                    <p-checkbox inputId="marketingDeclaration" [binary]="true" [ngModel]="declarationAccepted()" (ngModelChange)="declarationAccepted.set($event)" [disabled]="gateSaving()" />
                                    <label for="marketingDeclaration" class="text-sm" data-testid="marketing-gate-declaration">{{ g.declarationText }}</label>
                                </div>
                                <button pButton type="button" class="mt-3" [disabled]="gateSaving() || !declarationAccepted()" data-testid="marketing-gate-open-button" (click)="openGate()"><i class="p-button-icon" [class]="gateSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Beyanı onayla ve gönderimi aç</button>
                            }
                        }
                        @if (gateError(); as err) {
                            <p class="text-danger text-sm mt-3 mb-0" role="alert">{{ err }}</p>
                        }
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
    readonly gate = signal<ClinicMarketingGateDto | null>(null);
    readonly declarationAccepted = signal(false);
    readonly gateSaving = signal(false);
    readonly gateError = signal<string | null>(null);

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('AutomatedReminders') !== null);
    readonly canWrite = computed(() => this.auth.hasOperationClaim(REMINDERS_MANAGE_CLAIM) && !this.ro.mutationBlocked());
    readonly clinicName = computed(() => this.auth.getClinicName() ?? 'Aktif');
    /** Ticari kural da açılabilir; gönderim kliniğin ticari ileti kapısına bağlıdır (ADR-046). */
    readonly editLocked = computed(() => !this.canWrite() || this.saving());

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
                this.gate.set(dto.marketingGate ?? null);
                this.dirty.set(false);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Kurallar yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }


    patch(ruleType: ClinicReminderRuleDto['ruleType'], change: Partial<Pick<ClinicReminderRuleDto, 'isEnabled' | 'days'>>): void {
        this.rules.update((rows) => rows.map((r) => (r.ruleType === ruleType ? { ...r, ...change } : r)));
        this.dirty.set(true);
        this.saved.set(false);
    }

    save(): void {
        const rows: ClinicReminderRuleUpdateDto[] = this.rules().map((r) => ({ ruleType: r.ruleType, isEnabled: r.isEnabled, days: Number(r.days) }));

        this.saving.set(true);
        this.saveError.set(null);
        this.reminders.saveClinicRules(this.clinicId, rows).subscribe({
            next: (dto) => {
                this.rules.set(dto.rules);
                this.gate.set(dto.marketingGate ?? this.gate());
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

    /** Beyan onaylanmadan açılmaz (backend de reddeder); açınca kurallar yeniden okunur, ticari kuralın gönderim durumu güncellenir. */
    openGate(): void {
        this.saveGate(true, this.declarationAccepted());
    }

    closeGate(): void {
        this.saveGate(false, false);
    }

    private saveGate(isEnabled: boolean, declarationAccepted: boolean): void {
        this.gateSaving.set(true);
        this.gateError.set(null);
        this.reminders.saveMarketingGate(this.clinicId, isEnabled, declarationAccepted).subscribe({
            next: (gate) => {
                this.gate.set(gate);
                this.declarationAccepted.set(false);
                this.gateSaving.set(false);
                this.rules.update((rows) => rows.map((r) => (r.ruleType === 'NoReturn' ? { ...r, sendingAvailable: gate.isEnabled } : r)));
            },
            error: (e: Error) => {
                this.gateSaving.set(false);
                this.gateError.set(panelHttpFailureMessage(e, 'Ticari ileti ayarı kaydedilemedi.'));
            }
        });
    }
}
