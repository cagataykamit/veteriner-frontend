import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CLINIC_DETAIL_ROUTE, SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicPortalSettingsVm, OwnerNotificationCategory, OwnerNotificationChannel, OwnerNotificationRuleVm } from '@/app/entities/owner-portal/models/owner-portal.model';
import { ClinicPortalSettingsService } from '@/app/entities/owner-portal/services/owner-portal.service';
import {
    channelModeIcon,
    channelModeLabel,
    channelModeSeverity,
    NOTIFICATION_CATEGORIES,
    NOTIFICATION_CHANNELS,
    notificationChannelHint,
    notificationTypeLabel
} from '@/app/entities/owner-portal/utils/owner-portal-labels.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Hasta sahibi portalı (PORTAL-009/010; `PORTAL_API_CONTRACT.md` §12, §13), Ayarlar altında: portalı klinik için açma/kapatma
 * (kayıt yoksa açık; kapatınca hesaplar ve bağlar silinmez, erişim durur, yeni davet gitmez) ve hasta sahibine giden bildirimlerin
 * tür × kanal kuralı (salt okunur; kural sunucuda tek yerde). Yazma `Clinics.Update` ve salt okunur kiracı durumuna bağlıdır.
 * Paket portalı içermiyorsa (TIER-001) "üst pakete geç" çıkar; paket düşmüş kiracının mevcut erişimleri için anahtar kalır.
 */
@Component({
    selector: 'app-clinic-portal-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ConfirmDialogModule,
        MessageModule,
        SelectModule,
        TableModule,
        ToggleSwitchModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppPlanUpgradeNoticeComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    styles: `
        /* A-04 başlık biçimi 2: zemin bandı ve renkli kenar yok; düzey farkı yazı boyu, boşluk ve çizgi kalınlığıyla. */
        .portal-rules th.rule-head {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--text-color-secondary);
            vertical-align: bottom;
            padding-top: 0.375rem;
            padding-bottom: 0.5rem;
            border-bottom: 0;
            background: transparent;
        }
        .portal-rules th.rule-channel {
            width: 11.5rem;
        }
        .portal-rules :is(th, td).rule-name {
            padding-left: 1.125rem;
        }
        .portal-rules tr.rule-group > th {
            padding: 1.875rem 0 0.5625rem;
            border-bottom: 2px solid var(--text-color-secondary);
            background: transparent;
            text-align: left;
            font-weight: 400;
        }
        .portal-rules tr.rule-group:first-child > th {
            padding-top: 0.75rem;
        }
        .rule-group-title {
            font-size: 17px;
            font-weight: 700;
            color: var(--text-color);
        }
    `,
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

        <!-- A-04 A: erişim üstte yatay şerit, bildirim kanalları altta tam genişlik. -->
        <div class="flex flex-col gap-4">
            <section class="card mb-0" aria-labelledby="portalAccessTitle" data-testid="portal-access">
                <h5 id="portalAccessTitle" class="mt-0 mb-3">Portal erişimi</h5>
                @if (loading()) {
                    <app-loading-state message="Portal ayarı yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (planLocked() && !hasPortalUse()) {
                    <app-plan-upgrade-notice feature="OwnerPortal" detail="Hasta sahipleri portalda hayvanlarını, randevularını, aşılarını ve bakiyelerini görür; randevu talebi gönderir." />
                } @else if (settings(); as s) {
                    <div class="flex flex-col gap-3">
                        @if (planLocked()) {
                            <app-plan-upgrade-notice feature="OwnerPortal" detail="Mevcut erişimler açık kalır; yeni davet gönderilemez ve bekleyen davetler kabul edilemez." />
                        }
                        @if (message(); as m) {
                            <p-message [severity]="m.severity" class="w-full" role="status">{{ m.text }}</p-message>
                        }
                        @if (clinicPhone() === null) {
                            <p-message severity="warn" class="w-full" data-testid="portal-phone-missing">
                                Klinik telefonu yok: portalda hasta sahibi kliniği arayamaz, "kliniği arayın" yolları görünmez.
                                <a [routerLink]="clinicDetailLink()" class="font-medium">Telefonu ekle</a>
                            </p-message>
                        }
                        <div class="flex flex-wrap items-center gap-x-7 gap-y-3">
                            <div class="flex items-center gap-3">
                                <p-toggleswitch inputId="portalEnabled" [ngModel]="toggle()" (ngModelChange)="onToggle($event)" [disabled]="!canWrite() || saving()" data-testid="portal-enabled" />
                                <label for="portalEnabled">Hasta sahibi portalı bu klinikte açık</label>
                            </div>
                            <app-status-tag [label]="s.isEnabled ? 'Açık: hasta sahipleri giriş yapabilir' : 'Kapalı: erişim durduruldu'" [severity]="s.isEnabled ? 'success' : 'warn'" />
                            <p class="m-0 text-sm md:ml-auto" data-testid="portal-counts">
                                Aktif portal erişimi: <span class="font-medium">{{ s.activeLinkCount }}</span> · Bekleyen davet: <span class="font-medium">{{ s.pendingInviteCount }}</span>
                            </p>
                        </div>
                        <small class="text-muted-color">
                            Kapatmak geçicidir: hesaplar ve bağlantılar silinmez, yalnız erişim durur. Tekrar açınca her şey olduğu gibi geri gelir. Hatırlatma e-postaları etkilenmez.
                            @if (s.updatedAtUtc) {
                                <span class="whitespace-nowrap">Son değişiklik: {{ fmt(s.updatedAtUtc) }}</span>
                            }
                        </small>
                    </div>
                }
            </section>

            <section class="card mb-0" aria-labelledby="portalChannelsTitle">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                    <h5 id="portalChannelsTitle" class="m-0 mr-auto">Bildirim kanalları</h5>
                    @if (rules(); as list) {
                        <!-- Kategori filtresi; sayılar tablodaki satır sayısı. -->
                        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Kategori" data-testid="portal-rule-filter">
                            @for (f of categoryFilters(); track f.key) {
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-full border text-sm cursor-pointer"
                                    [class]="categoryFilter() === f.key ? 'border-primary bg-primary-50 dark:bg-primary-950 text-primary font-semibold' : 'border-surface text-color hover:border-primary'"
                                    [attr.aria-pressed]="categoryFilter() === f.key"
                                    (click)="categoryFilter.set(f.key)"
                                >
                                    {{ f.label }}<span class="text-xs font-semibold text-muted-color tabular-nums">{{ f.count }}</span>
                                </button>
                            }
                        </div>
                    }
                </div>
                <p class="mt-0 mb-2 text-sm text-muted-color">
                    Hasta sahibine hangi iletinin hangi kanaldan gittiği. İşlem iletileri tercihle kapanmaz; hatırlatma ve kampanya hasta sahibinin tercihine bağlıdır. WhatsApp iletisini sistem göndermez: personel müşteri kartından kendi WhatsApp'ında açar.
                </p>
                @if (rulesError(); as err) {
                    <app-error-state [detail]="err" (retry)="loadRules()" />
                } @else if (rules(); as list) {
                    <div class="overflow-x-auto table-stack-phone portal-rules">
                        <!-- Grup sırası bizim (işlem, hatırlatma, ticari); customSort tablonun grup alanına göre alfabetik sıralamasını kapatır. -->
                        <p-table [value]="shownRules()" rowGroupMode="subheader" groupRowsBy="category" [customSort]="true" [tableStyle]="{ 'min-width': '44rem', 'table-layout': 'fixed' }" data-testid="portal-rules">
                            <ng-template #header>
                                <tr>
                                    <th scope="col" class="rule-head rule-name">Bildirim</th>
                                    @for (c of channels; track c.channel) {
                                        <th scope="col" class="rule-head rule-channel">
                                            <span class="inline-flex items-center gap-1.5"><i [class]="c.icon + ' !text-xs'" aria-hidden="true"></i>{{ c.label }}</span>
                                            <span class="block mt-0.5 normal-case tracking-normal font-normal text-xs">{{ channelHint(c.channel, list) }}</span>
                                        </th>
                                    }
                                </tr>
                            </ng-template>
                            <ng-template #groupheader let-r>
                                <tr class="rule-group" [attr.data-testid]="'portal-rule-group-' + r.category">
                                    <th colspan="4" scope="colgroup">
                                        <span class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                                            <b class="rule-group-title">{{ group(r.category).title }}</b>
                                            <small class="text-muted-color text-[13.5px]">{{ group(r.category).description }}</small>
                                            <span class="ml-auto text-[13px] font-medium text-muted-color pr-2.5 tabular-nums">{{ categoryCount(r.category) }} bildirim</span>
                                        </span>
                                    </th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-r>
                                <tr data-testid="portal-rule-row">
                                    <td class="rule-name">{{ typeLabel(r.type) }}</td>
                                    @for (c of channels; track c.channel) {
                                        <td [attr.data-label]="c.label"><app-status-tag class="whitespace-nowrap" [label]="modeLabel(r, c.channel)" [severity]="modeSeverity(r, c.channel)" [icon]="modeIcon(r, c.channel)" /></td>
                                    }
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                    <small class="block mt-3 text-muted-color">Mobil bildirim, uygulama anahtarları tanımlanana dek "Yapılandırılmadı" görünür; hasta sahibinin tercihi şimdiden saklanır.</small>
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
    readonly planLocked = computed(() => this.ro.lockedPlanFeature('OwnerPortal') !== null);
    /** Paket düşmüş kiracıda portalı kullanan var mı; yoksa yönetilecek bir şey de yoktur. */
    readonly hasPortalUse = computed(() => {
        const s = this.settings();

        return !!s && s.activeLinkCount + s.pendingInviteCount > 0;
    });
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
    /** Kurulum uyarısı (H9): `null` telefon yok; `undefined` okunmadı (uyarı çıkmaz). */
    readonly clinicPhone = signal<string | null | undefined>(undefined);
    readonly clinicDetailLink = computed(() => `${CLINIC_DETAIL_ROUTE}/${this.clinicId()}`);

    /** Kategori filtresi (A-04): "Tümü" ya da tek kategori; satırlar kategori sırasıyla gruplanır. */
    readonly categoryFilter = signal<OwnerNotificationCategory | 'all'>('all');
    readonly shownRules = computed(() => {
        const filter = this.categoryFilter();
        const order = NOTIFICATION_CATEGORIES.map((c) => c.category);

        return (this.rules() ?? []).filter((r) => filter === 'all' || r.category === filter).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
    });
    readonly categoryFilters = computed(() => {
        const rules = this.rules() ?? [];

        return [
            { key: 'all' as OwnerNotificationCategory | 'all', label: 'Tümü', count: rules.length },
            ...NOTIFICATION_CATEGORIES.map((c) => ({ key: c.category as OwnerNotificationCategory | 'all', label: c.title, count: rules.filter((r) => r.category === c.category).length })).filter((f) => f.count > 0)
        ];
    });

    typeLabel = notificationTypeLabel;
    channelHint = notificationChannelHint;
    fmt = (utc: string) => formatDateTimeDisplay(utc);

    private loadSeq = 0;

    group(category: OwnerNotificationCategory): { title: string; description: string } {
        return NOTIFICATION_CATEGORIES.find((c) => c.category === category) ?? { title: category, description: '' };
    }

    categoryCount(category: OwnerNotificationCategory): number {
        return (this.rules() ?? []).filter((r) => r.category === category).length;
    }

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
        this.clinicPhone.set(undefined);
        this.clinics.getClinicById(clinicId).subscribe({
            next: (clinic) => seq === this.loadSeq && this.clinicPhone.set(clinic.phone?.trim() || null),
            error: () => undefined
        });
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

    modeIcon(rule: OwnerNotificationRuleVm, channel: OwnerNotificationChannel): string | undefined {
        return channelModeIcon(rule.channels.find((c) => c.channel === channel)?.mode);
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
