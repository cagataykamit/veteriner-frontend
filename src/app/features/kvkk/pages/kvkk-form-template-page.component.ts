import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/auth.service';
import { KvkkFormDocumentComponent } from '@/app/features/kvkk/components/kvkk-form-document.component';
import type { KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/features/kvkk/services/kvkk-form-template.service';
import { KVKK_FORM_DEFAULT_TEXT_WARNING, KVKK_TEMPLATE_KINDS, kvkkFormDate, kvkkFormPlaceholderHint, parseKvkkTemplateKind, type KvkkTemplateKind } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

const PREVIEW_CLIENT_NAME = 'Örnek Müşteri';

/**
 * Ayarlar > KVKK metinleri (ADR-021 karar 2, ADR-024): aktif kliniğin açık rıza formu ve aydınlatma metni şablonları, aynı düzenleyiciyle.
 * Tür `?kind=disclosure` ile seçilir (yoksa açık rıza). Varsayılan metinler hukuki onay bekleyen taslaklardır; klinik onaylanan metni kaydeder.
 * Yer tutucular yazdırırken doldurulur; önizleme müşteri kartından basılan belgenin aynısıdır (örnek müşteriyle).
 * İzin `Clinics.Update` (rota koruması); 409 → güncel metin yeniden yüklenir.
 */
@Component({
    selector: 'app-kvkk-form-template-page',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, ConfirmDialogModule, TextareaModule, ToastModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, KvkkFormDocumentComponent, TrDateTimePipe],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast position="bottom-right" />
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
        <app-page-header title="KVKK metinleri" [description]="'Müşteri kartından yazdırılan açık rıza formu ve aydınlatma metni' + (clinicName ? ' · ' + clinicName : '') + '.'" />

        <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Metin türü" data-testid="kvkk-kind">
            @for (k of kindOptions; track k.value) {
                <button
                    pButton
                    type="button"
                    [label]="k.label"
                    [class.p-button-outlined]="kind() !== k.value"
                    [class.p-button-secondary]="kind() !== k.value"
                    [disabled]="saving()"
                    [attr.aria-pressed]="kind() === k.value"
                    [attr.data-kind]="k.value"
                    (click)="selectKind(k.value)"
                ></button>
            }
        </div>

        @if (loading()) {
            <app-loading-state [message]="info().label + ' yükleniyor…'" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="load()" />
            </div>
        } @else if (template(); as t) {
            <div class="card mb-4">
                @if (t.isDefault) {
                    <p class="m-0 mb-4 flex items-center gap-2 rounded-border border border-amber-300 dark:border-amber-700 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300" role="note" data-testid="kvkk-default-warning">
                        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ defaultWarning }} Onaylanan metni buraya kaydedin.
                    </p>
                } @else if (t.updatedAtUtc) {
                    <p class="m-0 mb-4 text-sm text-muted-color">Son kayıt: {{ t.updatedAtUtc | trDateTime }}</p>
                }
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">Bu işletme salt okunur moddadır; metin güncellenemez.</p>
                }

                <label for="kvkkFormText" class="block text-sm font-medium text-muted-color mb-2">{{ info().label }} *</label>
                <textarea id="kvkkFormText" pTextarea class="w-full font-mono text-sm" rows="16" [formControl]="text" data-testid="kvkk-template-text"></textarea>
                <div class="flex flex-wrap justify-between gap-2 mt-1 text-sm">
                    <span class="text-red-500">
                        @if (text.hasError('required') && text.touched) {
                            Metin boş olamaz.
                        } @else if (text.hasError('maxlength')) {
                            En fazla {{ t.maxLength }} karakter.
                        }
                    </span>
                    <span class="text-muted-color tabular-nums" data-testid="kvkk-template-counter">{{ length() }} / {{ t.maxLength }}</span>
                </div>

                <div class="mt-4" data-testid="kvkk-placeholders">
                    <p class="m-0 mb-2 text-sm font-medium">Yer tutucular</p>
                    <p class="m-0 mb-2 text-sm text-muted-color">
                        Metinde aynen yazıldığında yazdırırken doldurulur (büyük/küçük harf önemlidir).
                        @if (info().printsConsentBlock) {
                            Onay kutuları ve imza bloğu formda her zaman bulunur.
                        } @else {
                            Aydınlatma metninde onay kutusu ve imza bloğu basılmaz.
                        }
                    </p>
                    <ul class="list-none m-0 p-0 text-sm space-y-1">
                        @for (p of t.placeholders; track p) {
                            <li>
                                <code class="font-mono">{{ p }}</code> <span class="text-muted-color">— {{ placeholderHint(p) }}</span>
                            </li>
                        }
                    </ul>
                </div>

                @if (saveError()) {
                    <p class="text-red-500 text-sm mt-4 mb-0" role="alert">{{ saveError() }}</p>
                }
                <div class="mt-4 flex flex-wrap justify-end gap-2">
                    @if (stale()) {
                        <p-button type="button" label="Güncel metni yükle" icon="pi pi-refresh" severity="secondary" (onClick)="load()" data-testid="kvkk-template-reload" />
                    }
                    <p-button type="button" label="Kaydet" icon="pi pi-save" [loading]="saving()" [disabled]="!canSave()" (onClick)="save()" data-testid="kvkk-template-save" />
                </div>
            </div>

            <div class="card">
                <h5 class="mt-0 mb-2">Yazdırma önizlemesi</h5>
                <p class="mt-0 mb-4 text-sm text-muted-color">Kaydedilmemiş değişiklikler dahil; müşteri adı örnektir.</p>
                <app-kvkk-form-document [template]="textValue()" [kind]="kind()" [clinicName]="clinicName" [clientName]="previewClientName" [date]="previewDate" />
            </div>
        }
    `
})
export class KvkkFormTemplatePageComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly templates = inject(KvkkFormTemplateService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly defaultWarning = KVKK_FORM_DEFAULT_TEXT_WARNING;
    readonly placeholderHint = kvkkFormPlaceholderHint;
    readonly clinicName = this.auth.getClinicName()?.trim() ?? '';
    readonly previewClientName = PREVIEW_CLIENT_NAME;
    readonly previewDate = kvkkFormDate();
    readonly kindOptions = (Object.keys(KVKK_TEMPLATE_KINDS) as KvkkTemplateKind[]).map((value) => ({ value, label: KVKK_TEMPLATE_KINDS[value].label }));

    readonly kind = signal<KvkkTemplateKind>(parseKvkkTemplateKind(this.route.snapshot.queryParamMap.get('kind')));
    readonly info = computed(() => KVKK_TEMPLATE_KINDS[this.kind()]);
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly template = signal<KvkkFormTemplateVm | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    /** 409 sonrası: kayıt başka biri tarafından değişti; kaydetmeden önce güncel metin yüklenmeli. */
    readonly stale = signal(false);

    readonly text = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    readonly textValue = toSignal(this.text.valueChanges, { initialValue: '' });
    readonly length = computed(() => this.textValue().length);

    /** Doğrulama sunucuyla aynı: kırpılmış metin boş olamaz, uzunluk sınırı aşılamaz. */
    readonly canSave = computed(() => {
        const t = this.template();
        const v = this.textValue();

        return !!t && !this.ro.mutationBlocked() && !this.saving() && !this.stale() && !!v.trim() && v.length <= t.maxLength;
    });

    private readonly lockEffect = effect(() => {
        if (this.ro.mutationBlocked() || this.saving()) {
            this.text.disable({ emitEvent: false });
        } else {
            this.text.enable({ emitEvent: false });
        }
    });

    ngOnInit(): void {
        this.load();
    }

    /** Kaydedilmemiş değişiklik varsa tür değişmeden önce onay istenir; seçim adres çubuğuna yazılır (geri dönüşte aynı tür açılır). */
    selectKind(kind: KvkkTemplateKind): void {
        if (kind === this.kind() || this.saving()) {
            return;
        }

        const t = this.template();

        if (t && this.text.value !== t.text) {
            this.confirmation.confirm({
                header: 'Kaydedilmemiş değişiklik',
                message: `${this.info().label} için yaptığınız değişiklikler kaydedilmedi. Yine de ${KVKK_TEMPLATE_KINDS[kind].label.toLocaleLowerCase('tr-TR')} düzenlemesine geçilsin mi?`,
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Değişiklikleri bırak',
                rejectLabel: 'Vazgeç',
                rejectButtonStyleClass: 'p-button-secondary',
                accept: () => this.switchTo(kind)
            });

            return;
        }

        this.switchTo(kind);
    }

    load(): void {
        const clinicId = this.auth.getClinicId()?.trim();

        this.saveError.set(null);
        this.stale.set(false);

        if (!clinicId) {
            this.loadError.set('KVKK metni için önce bir klinik seçmelisiniz.');
            this.loading.set(false);

            return;
        }

        const kind = this.kind();

        this.loading.set(true);
        this.loadError.set(null);
        this.templates.getTemplate(clinicId, kind).subscribe({
            next: (vm) => {
                if (kind !== this.kind()) {
                    return;
                }

                this.apply(vm);
                this.loading.set(false);
            },
            error: (e: Error) => {
                if (kind !== this.kind()) {
                    return;
                }

                this.loadError.set(e.message || `${KVKK_TEMPLATE_KINDS[kind].label} yüklenemedi.`);
                this.loading.set(false);
            }
        });
    }

    save(): void {
        const t = this.template();
        const clinicId = this.auth.getClinicId()?.trim();
        const kind = this.kind();
        const label = KVKK_TEMPLATE_KINDS[kind].label;

        this.text.markAsTouched();

        if (!t || !clinicId || !this.canSave()) {
            return;
        }

        this.saveError.set(null);
        this.saving.set(true);
        this.templates.updateTemplate(clinicId, kind, this.text.value, t).subscribe({
            next: (vm) => {
                this.saving.set(false);
                this.apply(vm);
                addTracedToast(this.messages, 'KvkkFormTemplatePage', this.router.url, { severity: 'success', summary: 'Tamam', detail: `${label} kaydedildi.` });
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.saveError.set(panelHttpFailureMessage(e, `${label} kaydedilemedi.`));

                if (e instanceof HttpErrorResponse && problemCodeFromHttpError(e) === 'Clinics.KvkkFormTemplate.ConcurrencyConflict') {
                    this.stale.set(true);
                }
            }
        });
    }

    private switchTo(kind: KvkkTemplateKind): void {
        this.kind.set(kind);
        this.template.set(null);
        void this.router.navigate([], { relativeTo: this.route, queryParams: { kind: kind === 'consent' ? null : kind }, queryParamsHandling: 'merge', replaceUrl: true });
        this.load();
    }

    private apply(vm: KvkkFormTemplateVm): void {
        this.template.set(vm);
        this.text.setValidators([Validators.required, Validators.maxLength(vm.maxLength)]);
        this.text.setValue(vm.text);
        this.text.markAsUntouched();
    }
}
