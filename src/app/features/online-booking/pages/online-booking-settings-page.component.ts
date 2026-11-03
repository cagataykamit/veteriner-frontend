import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { Observable } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import {
    APPOINTMENT_REQUEST_EMAIL_KIND_LABELS,
    AppointmentRequestEmailKind,
    EMAIL_BODY_MAX,
    EMAIL_SUBJECT_MAX,
    type AppointmentRequestEmailTemplateVm,
    type EmailMessageVm,
    type OnlineBookingSettingsVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** En erken talep süresi seçenekleri (dakika). */
export const MIN_LEAD_OPTIONS: { label: string; value: number }[] = [
    { label: 'Sınır yok', value: 0 },
    { label: '1 saat sonrası', value: 60 },
    { label: '2 saat sonrası', value: 120 },
    { label: '4 saat sonrası', value: 240 },
    { label: 'Ertesi gün (24 saat)', value: 1440 },
    { label: '2 gün sonrası', value: 2880 }
];

/**
 * Online randevu (ADR-042 K1/K3/K5/K6), Ayarlar altında: talebi açma/kapatma (varsayılan kapalı), en erken/en geç sınır,
 * kliniğe özel bağlantı (kopyala, yenile) ve sahibe giden e-posta şablonları (önizleme, varsayılana dönme). Randevu nedenleri
 * Tanımlar'dadır. Yazma `Clinics.Update` ve salt okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-online-booking-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        SelectButtonModule,
        TextareaModule,
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
            title="Online randevu"
            description="Hasta sahipleri portaldan ya da kliniğe özel bağlantıdan randevu talebi gönderir; talep klinik onaylayınca randevuya dönüşür. Nedenler ve süreleri Tanımlar > Randevu nedenleri'ndedir."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle ayarlar salt okunur; bağlantı talep kabul etmez.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Ayarları yalnız klinik yönetim yetkisi olan kullanıcı değiştirir.</p>
        }

        @if (clinicOptions().length > 1) {
            <div class="flex flex-col gap-1 w-full md:max-w-sm mb-4">
                <label for="onlineClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                <p-select inputId="onlineClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="onClinicChange($event)" optionLabel="label" optionValue="value" class="w-full" />
            </div>
        }

        @if (loading()) {
            <app-loading-state message="Online randevu ayarları yükleniyor…" />
        } @else if (error()) {
            <app-error-state [detail]="error()!" (retry)="reload()" />
        } @else {
            <div class="grid grid-cols-12 gap-4">
                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="onlineSettingsTitle">
                    <h5 id="onlineSettingsTitle" class="mt-0">Talep alma</h5>
                    <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()" class="flex flex-col gap-4">
                        @if (settingsMessage()) {
                            <p-message [severity]="settingsMessageSeverity()" class="w-full" role="status">{{ settingsMessage() }}</p-message>
                        }
                        <div class="flex items-center gap-3">
                            <p-toggleswitch inputId="onlineEnabled" formControlName="isEnabled" data-testid="online-enabled" />
                            <label for="onlineEnabled">Online randevu talebi açık</label>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="onlineMinLead" class="text-sm font-medium text-muted-color">En erken talep</label>
                            <p-select inputId="onlineMinLead" [options]="minLeadOptions()" optionLabel="label" optionValue="value" formControlName="minLeadMinutes" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="onlineMaxDays" class="text-sm font-medium text-muted-color">En geç talep (gün sonrası)</label>
                            <input id="onlineMaxDays" pInputText type="number" min="1" max="180" step="1" formControlName="maxAdvanceDays" class="w-full" />
                            @if (settingsForm.controls.maxAdvanceDays.invalid && settingsForm.controls.maxAdvanceDays.touched) {
                                <small class="text-red-500">1–180 gün arasında olmalıdır.</small>
                            }
                        </div>
                        <small class="text-muted-color">Sahibe yalnız müsait saatler gösterilir; bekleyen talepler saati doldurmaz, çakışma onayda denetlenir.</small>
                        @if (canWrite()) {
                            <div class="flex justify-end">
                                <button pButton type="submit" [disabled]="settingsForm.invalid || settingsUnchanged() || saving()"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                            </div>
                        }
                    </form>
                </section>

                <section class="card col-span-12 lg:col-span-6 mb-0" aria-labelledby="onlineLinkTitle">
                    <h5 id="onlineLinkTitle" class="mt-0">Kliniğe özel bağlantı</h5>
                    @if (settings()?.bookingUrl; as url) {
                        <div class="flex flex-col gap-3">
                            <div class="flex flex-wrap items-center gap-2">
                                <input pInputText readonly class="flex-1 min-w-0" [value]="url" aria-label="Randevu bağlantısı" data-testid="booking-url" />
                                <button pButton type="button" severity="secondary" (click)="copyLink(url)"><i class="pi pi-copy"></i>{{ copied() ? 'Kopyalandı' : 'Kopyala' }}</button>
                            </div>
                            <app-status-tag [label]="settings()!.isEnabled ? 'Talep alıyor' : 'Kapalı: bağlantı açılmaz'" [severity]="settings()!.isEnabled ? 'success' : 'warn'" />
                            <small class="text-muted-color">Web sitenizde, sosyal medyada ya da mesajla paylaşın. Bağlantıdan gelen kişi e-postasını kodla doğrular; müşteri kaydı onayda sizin seçiminizle oluşur.</small>
                            @if (canWrite()) {
                                <div>
                                    <button pButton type="button" severity="danger" [outlined]="true" [disabled]="saving()" (click)="confirmRegenerate()"><i class="pi pi-refresh"></i>Bağlantıyı yenile</button>
                                </div>
                            }
                        </div>
                    } @else {
                        <p class="text-sm text-muted-color m-0">Bağlantı ayarlar ilk kez kaydedilince oluşur.</p>
                    }
                </section>

                <section class="card col-span-12 mb-0" aria-labelledby="onlineTemplatesTitle">
                    <h5 id="onlineTemplatesTitle" class="mt-0">Sahibe giden e-postalar</h5>
                    <p-selectbutton [options]="kindOptions" optionLabel="label" optionValue="value" [ngModel]="selectedKind()" (ngModelChange)="selectKind($event)" [allowEmpty]="false" class="mb-4" />
                    @if (templateMessage()) {
                        <p-message [severity]="templateMessageSeverity()" class="w-full mb-3" role="status">{{ templateMessage() }}</p-message>
                    }
                    <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()" class="flex flex-col gap-4">
                        <div class="flex items-center gap-2">
                            <app-status-tag [label]="currentTemplate()?.isDefault ? 'Vetinity varsayılanı' : 'Kliniğe özel'" [severity]="currentTemplate()?.isDefault ? 'secondary' : 'info'" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="templateSubject" class="text-sm font-medium text-muted-color">Konu</label>
                            <input id="templateSubject" pInputText formControlName="subject" [maxlength]="subjectMax" class="w-full" />
                        </div>
                        <div class="flex flex-col gap-1">
                            <label for="templateBody" class="text-sm font-medium text-muted-color">Metin</label>
                            <textarea id="templateBody" pTextarea formControlName="body" rows="9" [maxlength]="bodyMax" class="w-full font-mono text-sm"></textarea>
                            <small class="text-muted-color">Yer tutucular: {{ placeholders().join(' ') }}</small>
                        </div>
                        @if (preview(); as p) {
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3" data-testid="template-preview">
                                <p class="font-medium mt-0 mb-2">{{ p.subject }}</p>
                                <pre class="whitespace-pre-wrap text-sm m-0 font-sans">{{ p.body }}</pre>
                            </div>
                        }
                        <div class="flex flex-wrap justify-end gap-2">
                            <button pButton type="button" severity="secondary" [disabled]="templateForm.invalid || templateBusy()" (click)="previewTemplate()"><i class="pi pi-eye"></i>Önizle</button>
                            @if (canWrite()) {
                                <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="templateBusy() || currentTemplate()?.isDefault" (click)="resetTemplate()">Varsayılana dön</button>
                                <button pButton type="submit" [disabled]="templateForm.invalid || templateForm.pristine || templateBusy()"><i class="pi pi-check"></i>{{ copy.buttonSave }}</button>
                            }
                        </div>
                    </form>
                </section>
            </div>
        }

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class OnlineBookingSettingsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly settingsRoute = SETTINGS_ROUTE;
    /** Hazır seçenekler; sunucudaki değer listede yoksa (ör. API ile ayarlanmış) o da eklenir. */
    readonly minLeadOptions = computed(() => {
        const current = this.settings()?.minLeadMinutes;

        return current === undefined || MIN_LEAD_OPTIONS.some((o) => o.value === current)
            ? MIN_LEAD_OPTIONS
            : [...MIN_LEAD_OPTIONS, { label: `${current} dakika sonrası`, value: current }].sort((a, b) => a.value - b.value);
    });
    readonly subjectMax = EMAIL_SUBJECT_MAX;
    readonly bodyMax = EMAIL_BODY_MAX;
    readonly kindOptions = Object.values(AppointmentRequestEmailKind)
        .filter((v): v is AppointmentRequestEmailKind => typeof v === 'number')
        .map((value) => ({ label: APPOINTMENT_REQUEST_EMAIL_KIND_LABELS[value], value }));

    private readonly service = inject(OnlineBookingService);
    private readonly clinics = inject(ClinicsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);
    readonly copied = signal(false);
    readonly settings = signal<OnlineBookingSettingsVm | null>(null);
    readonly settingsMessage = signal<string | null>(null);
    readonly settingsMessageSeverity = signal<'success' | 'error'>('success');

    readonly templates = signal<AppointmentRequestEmailTemplateVm[]>([]);
    readonly placeholders = signal<string[]>([]);
    readonly selectedKind = signal(AppointmentRequestEmailKind.Received);
    readonly currentTemplate = computed(() => this.templates().find((t) => t.kind === this.selectedKind()) ?? null);
    readonly preview = signal<EmailMessageVm | null>(null);
    readonly templateBusy = signal(false);
    readonly templateMessage = signal<string | null>(null);
    readonly templateMessageSeverity = signal<'success' | 'error'>('success');

    readonly settingsForm = this.fb.nonNullable.group({
        isEnabled: false,
        minLeadMinutes: 120,
        maxAdvanceDays: this.fb.nonNullable.control(30, [Validators.required, Validators.min(1), Validators.max(180)])
    });

    readonly templateForm = this.fb.nonNullable.group({
        subject: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(EMAIL_SUBJECT_MAX)]),
        body: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(EMAIL_BODY_MAX)])
    });

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

        if (!clinicId) {
            this.loading.set(false);
            this.error.set('Aktif klinik bulunamadı.');

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.settingsMessage.set(null);
        this.templateMessage.set(null);
        this.service.getSettings(clinicId).subscribe({
            next: (s) => {
                if (seq !== this.loadSeq) {
                    return;
                }

                this.applySettings(s);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Online randevu ayarları yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
        this.service.getEmailTemplates(clinicId).subscribe({
            next: (t) => {
                if (seq !== this.loadSeq) {
                    return;
                }

                this.templates.set(t.templates);
                this.placeholders.set(t.placeholders);
                this.selectKind(this.selectedKind());
            },
            error: () => undefined
        });
    }

    /** Kayıtlı ayarla aynı form yeniden kaydedilmez; bağlantı ilk kayıtta oluştuğundan bağlantı yokken değişiklik olmadan da kaydedilebilir. */
    settingsUnchanged(): boolean {
        return this.settingsForm.pristine && !!this.settings()?.bookingUrl;
    }

    saveSettings(): void {
        if (!this.canWrite() || this.settingsForm.invalid || this.saving()) {
            return;
        }

        this.saving.set(true);
        this.service.saveSettings(this.clinicId(), this.settingsForm.getRawValue()).subscribe({
            next: (s) => {
                this.saving.set(false);
                this.applySettings(s);
                this.showSettingsMessage(s.isEnabled ? 'Kaydedildi. Online talep açık.' : 'Kaydedildi. Online talep kapalı.', 'success');
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.showSettingsMessage(e instanceof Error ? e.message : 'Ayarlar kaydedilemedi.', 'error');
            }
        });
    }

    confirmRegenerate(): void {
        this.confirmation.confirm({
            header: 'Bağlantıyı yenile',
            message: 'Yeni bağlantı oluşur; paylaştığınız eski bağlantı hemen çalışmaz hale gelir.',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yenile',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.regenerate()
        });
    }

    copyLink(url: string): void {
        void navigator.clipboard?.writeText(url).then(() => {
            this.copied.set(true);
            setTimeout(() => this.copied.set(false), 2000);
        });
    }

    selectKind(kind: AppointmentRequestEmailKind): void {
        this.selectedKind.set(kind);
        this.preview.set(null);
        this.templateMessage.set(null);

        const t = this.templates().find((x) => x.kind === kind);

        this.templateForm.reset({ subject: t?.subject ?? '', body: t?.body ?? '' });

        if (!this.canWrite()) {
            this.templateForm.disable();
        }
    }

    previewTemplate(): void {
        this.runTemplate(this.service.previewEmailTemplate(this.clinicId(), this.selectedKind(), this.templateForm.getRawValue()), (p) => this.preview.set(p));
    }

    saveTemplate(): void {
        if (!this.canWrite()) {
            return;
        }

        this.runTemplate(this.service.saveEmailTemplate(this.clinicId(), this.selectedKind(), this.templateForm.getRawValue()), (t) => {
            this.replaceTemplate(t);
            this.templateForm.markAsPristine();
            this.templateMessageSeverity.set('success');
            this.templateMessage.set('Şablon kaydedildi.');
        });
    }

    resetTemplate(): void {
        if (!this.canWrite()) {
            return;
        }

        this.runTemplate(this.service.resetEmailTemplate(this.clinicId(), this.selectedKind()), (t) => {
            this.replaceTemplate(t);
            this.selectKind(t.kind);
            this.templateMessageSeverity.set('success');
            this.templateMessage.set('Vetinity varsayılanına dönüldü.');
        });
    }

    private regenerate(): void {
        if (!this.canWrite() || this.saving()) {
            return;
        }

        this.saving.set(true);
        this.service.regenerateCode(this.clinicId()).subscribe({
            next: (s) => {
                this.saving.set(false);
                this.applySettings(s);
                this.showSettingsMessage('Yeni bağlantı oluşturuldu; eski bağlantı kapandı.', 'success');
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.showSettingsMessage(e instanceof Error ? e.message : 'Bağlantı yenilenemedi.', 'error');
            }
        });
    }

    private runTemplate<T>(request: Observable<T>, done: (value: T) => void): void {
        if (this.templateForm.invalid || this.templateBusy()) {
            return;
        }

        this.templateBusy.set(true);
        this.templateMessage.set(null);
        request.subscribe({
            next: (value) => {
                this.templateBusy.set(false);
                done(value);
            },
            error: (e: unknown) => {
                this.templateBusy.set(false);
                this.templateMessageSeverity.set('error');
                this.templateMessage.set(e instanceof Error ? e.message : 'İşlem başarısız.');
            }
        });
    }

    private replaceTemplate(t: AppointmentRequestEmailTemplateVm): void {
        this.templates.update((list) => list.map((x) => (x.kind === t.kind ? t : x)));
    }

    private applySettings(s: OnlineBookingSettingsVm): void {
        this.settings.set(s);
        this.settingsForm.reset({ isEnabled: s.isEnabled, minLeadMinutes: s.minLeadMinutes, maxAdvanceDays: s.maxAdvanceDays });

        if (!this.canWrite()) {
            this.settingsForm.disable();
        }
    }

    private showSettingsMessage(message: string, severity: 'success' | 'error'): void {
        this.settingsMessageSeverity.set(severity);
        this.settingsMessage.set(message);
    }
}
