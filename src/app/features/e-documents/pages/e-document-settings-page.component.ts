import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicEDocumentSettingsDto, EDocumentAutoIssueMode } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { EDocumentConnectionCardComponent } from '@/app/features/e-documents/components/e-document-connection-card.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const DOCUMENT_LABEL: Record<'ESmm' | 'Invoice', string> = {
    ESmm: 'e-SMM (serbest meslek makbuzu)',
    Invoice: 'Fatura: alıcı e-Fatura mükellefiyse e-Fatura, değilse e-Arşiv'
};

/**
 * Ayarlar › e-Belge (ADR-036; kullanıcı kararları 2026-11-11): entegratör seçimi ve bağlantısı, mükellef türünden çıkan belge
 * türleri ve otomatik e-belge (kapalı / ödeme alınınca / gün sonunda) ile ödeme ekranı varsayılanı. Sağlayıcıdan bağımsızdır; tek
 * sağlayıcıya özgü yer bağlantı kartının bağlanma yöntemidir. Klinik: `?clinicId=` (OAuth dönüşü) yoksa aktif klinik.
 */
@Component({
    selector: 'app-e-document-settings-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        InputTextModule,
        RadioButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        EDocumentConnectionCardComponent
    ],
    providers: [MessageService],
    template: `
        <app-page-header title="e-Belge" description="Kliniğin e-SMM, e-Arşiv ve e-Fatura ayarları." />

        @if (!clinicId) {
            <div class="card"><p class="m-0">Aktif klinik yok; bir kliniğe geçip tekrar deneyin.</p></div>
        } @else {
            <app-e-document-connection-card [clinicId]="clinicId" />

            @if (loading()) {
                <div class="card"><app-loading-state message="e-Belge ayarları yükleniyor…" /></div>
            } @else if (loadError(); as err) {
                <div class="card"><app-error-state [detail]="err" (retry)="load()" /></div>
            } @else if (settings(); as s) {
                <div class="card mb-4" data-testid="e-document-kinds">
                    <h5 class="mt-0 mb-2">Belge türleri</h5>
                    @if (s.taxpayerType) {
                        <dl class="grid grid-cols-12 gap-x-4 gap-y-2 m-0 text-sm">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hizmet (muayene, aşı, işlem)</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ kindLabel(s.serviceDocument) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ürün (mama, ilaç satışı)</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ kindLabel(s.productDocument) }}</dd>
                        </dl>
                        <p class="text-sm text-muted-color mt-3 mb-0">Belge türü kliniğin mükellef türünden çıkar; değiştirmek için <a [routerLink]="['/panel/settings/clinics', clinicId]">klinik mükellef bilgilerini</a> güncelleyin.</p>
                    } @else {
                        <p class="text-sm m-0" role="alert">Mükellef türü seçilmemiş; belge kesmeden önce <a [routerLink]="['/panel/settings/clinics', clinicId]">klinik mükellef bilgilerini</a> doldurun.</p>
                    }
                </div>

                <div class="card mb-4" data-testid="e-document-automation">
                    <h5 class="mt-0 mb-2">Otomatik e-belge</h5>
                    <p class="text-sm text-muted-color mt-0 mb-4">Tamamen ödenmiş ücretlerin belgesi kendiliğinden kesilir. Her belge entegratör sözleşmenizdeki kontörden düşer. Yalnız bu ayar açıldıktan sonra yazılan ücretler kesilir; eski ücretler toplu kesilmez.</p>

                    <div class="flex flex-col gap-3" role="radiogroup" aria-label="Otomatik e-belge">
                        @for (option of modeOptions; track option.value) {
                            <div class="flex items-start gap-2">
                                <p-radiobutton [inputId]="'edocMode' + option.value" name="edocMode" [value]="option.value" [(ngModel)]="mode" />
                                <label [for]="'edocMode' + option.value" class="text-sm">
                                    <span class="font-medium">{{ option.label }}</span>
                                    <span class="block text-muted-color">{{ option.hint }}</span>
                                </label>
                            </div>
                        }
                    </div>

                    <div class="mt-4 max-w-xs">
                        <label for="edocEndOfDay" class="block text-sm font-medium text-muted-color mb-2">Gün sonu saati</label>
                        <input id="edocEndOfDay" type="time" pInputText class="w-full" [(ngModel)]="endOfDayTime" />
                        <small class="text-muted-color">Gün sonu kesimi ve belgesiz ücret hatırlatması bu saatte yapılır.</small>
                    </div>

                    <div class="mt-4 flex items-center gap-2">
                        <p-checkbox inputId="edocPaymentDefault" [binary]="true" [(ngModel)]="issueOnPaymentByDefault" />
                        <label for="edocPaymentDefault" class="text-sm">Ödeme alma ekranında "e-Belge kes" seçeneği işaretli gelsin</label>
                    </div>

                    @if (saveError()) {
                        <p class="text-danger text-sm mt-3 mb-0" role="alert">{{ saveError() }}</p>
                    }
                    <div class="mt-4 flex justify-end">
                        <button pButton type="button" [disabled]="!dirty() || saving() || ro.mutationBlocked()" (click)="save()" data-testid="edoc-settings-save">
                            <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Kaydet
                        </button>
                    </div>
                </div>
            }
        }
    `
})
export class EDocumentSettingsPageComponent implements OnInit {
    private readonly service = inject(EDocumentsService);
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly messages = inject(MessageService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    protected readonly modeOptions: { value: EDocumentAutoIssueMode; label: string; hint: string }[] = [
        { value: 'Off', label: 'Kapalı', hint: 'Belge elle kesilir; ödeme ekranında ve ziyaret kapanışında öneri gelir.' },
        { value: 'OnPayment', label: 'Ödeme alınınca', hint: 'Ücret tamamen ödendiğinde belge bir dakika içinde kesilir.' },
        { value: 'EndOfDay', label: 'Gün sonunda', hint: 'O gün tamamen ödenen ücretlerin belgeleri gün sonu saatinde kesilir.' }
    ];

    readonly clinicId = this.route.snapshot.queryParamMap.get('clinicId')?.trim() || this.auth.getClinicId()?.trim() || null;
    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly settings = signal<ClinicEDocumentSettingsDto | null>(null);

    mode: EDocumentAutoIssueMode = 'Off';
    endOfDayTime = '23:00';
    issueOnPaymentByDefault = false;

    /** Kaydedilmiş ayardan farklı mı (Kaydet yalnız değişiklikte açık). */
    dirty(): boolean {
        const s = this.settings();

        return !!s && (s.autoIssueMode !== this.mode || s.endOfDayTime !== this.endOfDayTime || s.issueOnPaymentByDefault !== this.issueOnPaymentByDefault);
    }

    ngOnInit(): void {
        this.load();
    }

    kindLabel(kind: 'ESmm' | 'Invoice' | null): string {
        return kind ? DOCUMENT_LABEL[kind] : '—';
    }

    load(): void {
        if (!this.clinicId) {
            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.service
            .getSettings(this.clinicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (s) => this.apply(s),
                error: (e: unknown) => {
                    this.loadError.set(panelHttpFailureMessage(e, 'e-Belge ayarları yüklenemedi.'));
                    this.loading.set(false);
                }
            });
    }

    save(): void {
        if (!this.clinicId || this.ro.mutationBlocked()) {
            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.service
            .updateSettings(this.clinicId, { autoIssueMode: this.mode, endOfDayTime: this.endOfDayTime, issueOnPaymentByDefault: this.issueOnPaymentByDefault })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (s) => {
                    this.saving.set(false);
                    this.apply(s);
                    this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'e-Belge ayarları kaydedildi.', life: 3000 });
                },
                error: (e: unknown) => {
                    this.saving.set(false);
                    this.saveError.set(panelHttpFailureMessage(e, 'e-Belge ayarları kaydedilemedi.'));
                }
            });
    }

    private apply(s: ClinicEDocumentSettingsDto): void {
        this.settings.set(s);
        this.mode = s.autoIssueMode;
        this.endOfDayTime = s.endOfDayTime;
        this.issueOnPaymentByDefault = s.issueOnPaymentByDefault;
        this.loading.set(false);
    }
}
