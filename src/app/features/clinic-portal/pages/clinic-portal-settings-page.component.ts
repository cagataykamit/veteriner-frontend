import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicPortalSettingsVm, OwnerNotificationChannel, OwnerNotificationRuleVm } from '@/app/entities/owner-portal/models/owner-portal.model';
import { ClinicPortalSettingsService } from '@/app/entities/owner-portal/services/owner-portal.service';
import {
    channelModeLabel,
    channelModeSeverity,
    NOTIFICATION_CHANNELS,
    notificationCategoryLabel,
    notificationTypeLabel
} from '@/app/entities/owner-portal/utils/owner-portal-labels.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Hasta sahibi portalı (PORTAL-009/010; `PORTAL_API_CONTRACT.md` §12, §13), Ayarlar altında: portalı klinik için açma/kapatma
 * (kayıt yoksa açık; kapatınca hesaplar ve bağlar silinmez, erişim durur, yeni davet gitmez) ve hasta sahibine giden bildirimlerin
 * tür × kanal kuralı (salt okunur; kural sunucuda tek yerde). Yazma `Clinics.Update` ve salt okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-clinic-portal-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ConfirmDialogModule,
        MessageModule,
        SelectModule,
        TableModule,
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
            title="Hasta sahibi portalı"
            description="Hasta sahipleri portalda hayvanlarını, randevularını, aşılarını ve bakiyelerini görür; randevu ve veri talebi gönderir. Portal daveti müşteri kartından gönderilir."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle ayar salt okunur.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Ayarı yalnız klinik yönetim yetkisi olan kullanıcı değiştirir.</p>
        }

        @if (clinicOptions().length > 1) {
            <div class="flex flex-col gap-1 w-full md:max-w-sm mb-4">
                <label for="portalClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                <p-select inputId="portalClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="onClinicChange($event)" optionLabel="label" optionValue="value" class="w-full" />
            </div>
        }

        <div class="grid grid-cols-12 gap-4">
            <section class="card col-span-12 lg:col-span-5 mb-0" aria-labelledby="portalAccessTitle">
                <h5 id="portalAccessTitle" class="mt-0">Portal erişimi</h5>
                @if (loading()) {
                    <app-loading-state message="Portal ayarı yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (settings(); as s) {
                    <div class="flex flex-col gap-3">
                        @if (message(); as m) {
                            <p-message [severity]="m.severity" class="w-full" role="status">{{ m.text }}</p-message>
                        }
                        <div class="flex items-center gap-3">
                            <p-toggleswitch inputId="portalEnabled" [ngModel]="toggle()" (ngModelChange)="onToggle($event)" [disabled]="!canWrite() || saving()" data-testid="portal-enabled" />
                            <label for="portalEnabled">Hasta sahibi portalı bu klinikte açık</label>
                        </div>
                        <app-status-tag [label]="s.isEnabled ? 'Açık: hasta sahipleri giriş yapabilir' : 'Kapalı: erişim durduruldu'" [severity]="s.isEnabled ? 'success' : 'warn'" />
                        <p class="m-0 text-sm" data-testid="portal-counts">
                            Aktif portal erişimi: <span class="font-medium">{{ s.activeLinkCount }}</span> · Bekleyen davet: <span class="font-medium">{{ s.pendingInviteCount }}</span>
                        </p>
                        @if (s.updatedAtUtc) {
                            <small class="text-muted-color">Son değişiklik: {{ fmt(s.updatedAtUtc) }}</small>
                        }
                        <small class="text-muted-color">Kapatmak geçicidir: hesaplar ve bağlantılar silinmez, yalnız erişim durur. Tekrar açınca her şey olduğu gibi geri gelir. Hatırlatma e-postaları etkilenmez.</small>
                    </div>
                }
            </section>

            <section class="card col-span-12 lg:col-span-7 mb-0" aria-labelledby="portalChannelsTitle">
                <h5 id="portalChannelsTitle" class="mt-0">Bildirim kanalları</h5>
                <p class="mt-0 mb-3 text-sm text-muted-color">
                    Hasta sahibine hangi iletinin hangi kanaldan gittiği. İşlem iletileri tercihle kapanmaz; hatırlatma ve kampanya hasta sahibinin tercihine bağlıdır. WhatsApp iletisini sistem göndermez: personel müşteri kartından kendi WhatsApp'ında açar.
                </p>
                @if (rulesError(); as err) {
                    <app-error-state [detail]="err" (retry)="loadRules()" />
                } @else if (rules(); as list) {
                    <div class="overflow-x-auto">
                        <p-table [value]="list" [tableStyle]="{ 'min-width': '36rem' }" data-testid="portal-rules">
                            <ng-template #header>
                                <tr>
                                    <th>Bildirim</th>
                                    @for (c of channels; track c.channel) {
                                        <th>{{ c.label }}</th>
                                    }
                                </tr>
                            </ng-template>
                            <ng-template #body let-r>
                                <tr data-testid="portal-rule-row">
                                    <td>
                                        <div>{{ typeLabel(r.type) }}</div>
                                        <small class="text-muted-color">{{ categoryLabel(r.category) }}</small>
                                    </td>
                                    @for (c of channels; track c.channel) {
                                        <td><app-status-tag [label]="modeLabel(r, c.channel)" [severity]="modeSeverity(r, c.channel)" /></td>
                                    }
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                    <small class="block mt-2 text-muted-color">Mobil bildirim, uygulama anahtarları tanımlanana dek "Yapılandırılmadı" görünür; hasta sahibinin tercihi şimdiden saklanır.</small>
                } @else {
                    <app-loading-state message="Bildirim kanalları yükleniyor…" />
                }
            </section>
        </div>

        <p-confirmdialog [style]="{ width: 'min(480px, 95vw)' }" />
    `
})
export class ClinicPortalSettingsPageComponent implements OnInit {
    readonly settingsRoute = SETTINGS_ROUTE;
    readonly channels = NOTIFICATION_CHANNELS;

    private readonly service = inject(ClinicPortalSettingsService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly confirmation = inject(ConfirmationService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());
    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly settings = signal<ClinicPortalSettingsVm | null>(null);
    /** Anahtarın görünen değeri; onay reddedilirse sunucudaki değere döner. */
    readonly toggle = signal(true);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly message = signal<{ text: string; severity: 'success' | 'error' } | null>(null);
    readonly rules = signal<OwnerNotificationRuleVm[] | null>(null);
    readonly rulesError = signal<string | null>(null);

    typeLabel = notificationTypeLabel;
    categoryLabel = notificationCategoryLabel;
    fmt = (utc: string) => formatDateTimeDisplay(utc);

    private loadSeq = 0;

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.reload();
        this.loadRules();
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
                    this.error.set(e instanceof Error ? e.message : 'Portal ayarı yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }

    loadRules(): void {
        this.rulesError.set(null);
        this.service.notificationRules().subscribe({
            next: (rows) => this.rules.set(rows),
            error: (e: unknown) => this.rulesError.set(e instanceof Error ? e.message : 'Bildirim kanalları yüklenemedi.')
        });
    }

    onToggle(enabled: boolean): void {
        const s = this.settings();

        this.toggle.set(enabled);

        if (!s || !this.canWrite() || enabled === s.isEnabled) {
            return;
        }

        this.confirmation.confirm({
            header: enabled ? 'Portalı aç' : 'Portalı kapat',
            message: enabled
                ? 'Bu klinikteki hasta sahipleri portala yeniden girebilir; bekleyen davetler yeniden kabul edilebilir ve yeni davet gönderilebilir.'
                : `Bu klinikte ${s.activeLinkCount} hasta sahibinin portal erişimi durur ve ${s.pendingInviteCount} bekleyen davet kabul edilemez; yeni davet gönderilemez. Hesaplar ve bağlantılar silinmez, tekrar açınca geri gelir. Hatırlatma e-postaları gitmeye devam eder.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: enabled ? 'Portalı aç' : 'Portalı kapat',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: enabled ? 'p-button-primary' : 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.save(enabled),
            reject: () => this.toggle.set(s.isEnabled)
        });
    }

    modeLabel(rule: OwnerNotificationRuleVm, channel: OwnerNotificationChannel): string {
        return channelModeLabel(rule.channels.find((c) => c.channel === channel)?.mode);
    }

    modeSeverity(rule: OwnerNotificationRuleVm, channel: OwnerNotificationChannel) {
        return channelModeSeverity(rule.channels.find((c) => c.channel === channel)?.mode);
    }

    private save(enabled: boolean): void {
        this.saving.set(true);
        this.message.set(null);
        this.service.save(this.clinicId(), enabled).subscribe({
            next: (s) => {
                this.saving.set(false);
                this.apply(s);
                this.message.set({ text: s.isEnabled ? 'Kaydedildi. Portal bu klinikte açık.' : 'Kaydedildi. Portal bu klinikte kapalı.', severity: 'success' });
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.toggle.set(this.settings()?.isEnabled ?? true);
                this.message.set({ text: e instanceof Error ? e.message : 'Portal ayarı kaydedilemedi.', severity: 'error' });
            }
        });
    }

    private apply(s: ClinicPortalSettingsVm): void {
        this.settings.set(s);
        this.toggle.set(s.isEnabled);
    }
}
