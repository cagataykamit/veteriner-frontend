import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CareInstructionsSectionComponent } from '@/app/entities/care-instruction/components/care-instructions-section.component';
import type { HospitalizationDetailVm } from '@/app/entities/hospitalization/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/entities/hospitalization/services/hospitalizations.service';
import { type HospitalizationDischargeFieldErrors, parseHospitalizationDischargeHttpError } from '@/app/entities/hospitalization/utils/hospitalization-upsert-validation-parse.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { DATETIME_LOCAL_INPUT_MIN, dateTimeYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { HOSPITALIZATIONS_DISCHARGE_CLAIM, HOSPITALIZATIONS_UPDATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';

/** Düzenleme/oluşturma sonrası dönülen sayfada gösterilen kısa onay (query `saved`). */
const SAVED_MESSAGES: Record<string, string> = { '1': 'Kayıt güncellendi.', created: 'Kayıt oluşturuldu.' };

@Component({
    selector: 'app-hospitalization-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        ButtonModule,
        DialogModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailActionBarComponent,
        AppDetailSubjectLineComponent,
        AppStatusTagComponent,
        RecordHistoryButtonComponent,
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        DateInputComponent,
        CareInstructionsSectionComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (savedMessage(); as message) {
            <p class="mb-4 m-0 text-sm font-medium">{{ message }}</p>
        }
        @if (showDischargedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Taburcu işlemi kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Kayıt yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (row(); as r) {
            <app-page-header categoryLink="/panel/hospitalizations" categoryLinkLabel="Listeye dön" />

            <!-- Kimlik kartı: yatış nedeni + durum rozeti, yatış tarihi, kayıt satırı, hasta/sahip ve konum; sağda Düzenle ve geçmiş; gösterge şeridi. -->
            <app-detail-identity-card icon="pi pi-building" [title]="r.reason" [subtitle]="r.admittedAtUtc | trDateTime" [meta]="'Oluşturulma: ' + (r.createdAtUtc | trDateTime) + ' · Güncellenme: ' + (r.updatedAtUtc | trDateTime)" ariaLabel="Yatış kimliği" testId="hospitalization-identity-card">
                <app-status-tag badges [label]="r.isActive ? 'Aktif yatış' : 'Taburcu'" [severity]="r.isActive ? 'warn' : 'secondary'" />
                <app-detail-subject-line [petId]="r.petId" [petName]="r.petName" [clientId]="r.clientId" [clientName]="r.clientName">
                    @if (r.locationLabel) {
                        <span class="min-w-0"><span class="text-muted-color">Konum:</span> <span class="font-medium" data-testid="hospitalization-location">{{ r.locationLabel }}</span></span>
                    }
                </app-detail-subject-line>
                <ng-container actions>
                    @if (r.isActive && canUpdateHospitalization) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/hospitalizations', r.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                        }
                    }
                    <app-record-history-button resource="hospitalizations" [recordId]="r.id" />
                </ng-container>
                <div stat>
                    <dt>Yatış</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.admittedAtUtc | trDateTime }}</dd>
                </div>
                <div stat>
                    <dt>Planlı taburcu</dt>
                    <dd>
                        @if (r.plannedDischargeAtUtc) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.plannedDischargeAtUtc | trDateTime }}</span>
                        } @else {
                            <span class="field-empty">Belirsiz</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Taburcu</dt>
                    <dd>
                        @if (r.dischargedAtUtc) {
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ r.dischargedAtUtc | trDateTime }}</span>
                        } @else {
                            <span class="field-empty">Henüz taburcu değil</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Muayene</dt>
                    <dd>
                        @if (r.examinationId) {
                            <a [routerLink]="['/panel/examinations', r.examinationId]" class="text-primary font-semibold no-underline">Muayene kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı muayene yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>
            <app-pet-alert-banner [petId]="r.petId" />

            <!-- Eylem şeridi: taburcu ve ödeme; salt okunurda kilitli. -->
            @if ((r.isActive && canUpdateHospitalization && canDischargeHospitalization) || (canCreatePayment && r.examinationId?.trim() && r.clientId?.trim() && r.petId?.trim())) {
                <app-detail-action-bar ariaLabel="Yatış eylemleri">
                    @if (r.isActive && canUpdateHospitalization && canDischargeHospitalization) {
                        @if (!ro.mutationBlocked()) {
                            <button pButton type="button" severity="warn" (click)="openDischargeDialog()"><i class="p-button-icon pi pi-sign-out"></i>Taburcu et</button>
                        } @else {
                            <button pButton type="button" severity="secondary" [disabled]="true"><i class="p-button-icon pi pi-lock"></i>Taburcu et (salt okunur)</button>
                        }
                    }
                    @if (canCreatePayment && r.examinationId?.trim() && r.clientId?.trim() && r.petId?.trim()) {
                        @if (!ro.mutationBlocked()) {
                            <a [routerLink]="['/panel/payments/new']" [queryParams]="{ clientId: r.clientId, petId: r.petId, examinationId: r.examinationId }" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                        } @else {
                            <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
                        }
                    }
                </app-detail-action-bar>
            }

            <!-- Satır ızgarası: yatış notları | taburcu notu (8/4, eşit yükseklik); bakım talimatları tam genişlik. -->
            <div class="@container flex flex-col gap-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="card mb-0 h-full min-w-0 col-span-12" [class.@4xl:col-span-8]="!!r.dischargeNote">
                        <h5 class="mt-0 mb-3">Yatış notları</h5>
                        @if (r.notes === emptyMark) {
                            <p class="m-0 field-empty">Not yok</p>
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ r.notes }}</p>
                        }
                    </div>
                    @if (r.dischargeNote) {
                        <div class="card mb-0 h-full min-w-0 col-span-12 @4xl:col-span-4">
                            <h5 class="mt-0 mb-3">Taburcu notu</h5>
                            <p class="m-0 whitespace-pre-wrap" data-testid="discharge-note">{{ r.dischargeNote }}</p>
                        </div>
                    }
                </div>
                @if (r.petId) {
                    <app-care-instructions-section [hospitalizationId]="r.id" [petId]="r.petId!" />
                }
            </div>
        }

        <p-dialog header="Taburcu işlemi" [modal]="true" [(visible)]="dischargeDialogVisible" [style]="{ width: 'min(32rem, 95vw)' }" [draggable]="false" [focusOnShow]="false" (onHide)="onDischargeDialogHide()">
            <p class="text-sm text-muted-color mt-0 mb-4">Taburcu tarihi ve saati zorunludur. İşlem sonrası kayıt kapatılır.</p>
            <form [formGroup]="dischargeForm" (ngSubmit)="onDischargeSubmit()">
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="dischargedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Taburcu tarihi / saati *</label>
                        <app-date-input inputId="dischargedAtLocal" type="datetime-local" formControlName="dischargedAtLocal" [min]="dischargeMin()" limit="past" />
                        @if (dischargeForm.controls.dischargedAtLocal.hasError('dateYearInvalid') && dischargeForm.controls.dischargedAtLocal.touched) {
                            <small class="text-danger block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (dischargeForm.controls.dischargedAtLocal.hasError('required') && dischargeForm.controls.dischargedAtLocal.touched) {
                            <small class="text-danger">Zorunlu.</small>
                        } @else if (dischargeFieldErrors().dischargedAtLocal) {
                            <small class="text-danger">{{ dischargeFieldErrors().dischargedAtLocal }}</small>
                        }
                    </div>
                    <div>
                        <label for="dischargeNote" class="block text-sm font-medium text-muted-color mb-2">Taburcu notu</label>
                        <textarea id="dischargeNote" rows="3" class="w-full p-inputtext p-component" formControlName="dischargeNote"></textarea>
                        <small class="text-muted-color">Giriş notunu değiştirmez; hasta sahibine verilecek talimat için “Bakım talimatları” bölümünü kullanın.</small>
                        @if (dischargeFieldErrors().dischargeNote) {
                            <small class="text-danger block">{{ dischargeFieldErrors().dischargeNote }}</small>
                        }
                    </div>
                </div>
                @if (dischargeConflict()) {
                    <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mt-4" role="alert">
                        <p class="text-amber-800 dark:text-amber-200 m-0 font-medium">{{ dischargeSubmitError() }}</p>
                        <div class="mt-3">
                            <button pButton type="button" severity="secondary" size="small" (click)="discardDischargeAndReload()"><i class="p-button-icon pi pi-refresh"></i>Yazdıklarımı atıp güncel kaydı yükle</button>
                        </div>
                    </div>
                } @else if (dischargeSubmitError()) {
                    <p class="text-danger mt-4 mb-0" role="alert">{{ dischargeSubmitError() }}</p>
                }
                <div class="flex flex-wrap justify-end gap-2 mt-4">
                    <button pButton type="button" severity="secondary" (click)="dischargeDialogVisible.set(false)" [disabled]="dischargeSubmitting()">Vazgeç</button>
                    <button pButton type="submit" [disabled]="ro.mutationBlocked() || dischargeSubmitting()"><i class="p-button-icon" [class]="dischargeSubmitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Taburcu et</button>
                </div>
            </form>
        </p-dialog>
    `
})
export class HospitalizationDetailPageComponent implements OnInit {
    /** Taburcu yatıştan önce olamaz; yatış bilinmiyorsa yalnız genel alt sınır. */
    protected readonly dischargeMin = computed(() => {
        const admittedUtc = this.row()?.admittedAtUtc;

        return (admittedUtc ? toIstanbulDateTimeLocalInputValue(admittedUtc) : '') || DATETIME_LOCAL_INPUT_MIN;
    });
    private readonly route = inject(ActivatedRoute);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly loader = new RouteEntityLoader<HospitalizationDetailVm>({
        fetch: (id) => this.hospitalizationsService.getHospitalizationById(id),
        invalidIdMessage: 'Geçersiz kayıt.',
        errorMessage: (e) => (e instanceof Error ? e.message : 'Kayıt yüklenemedi.'),
        onRouteChange: (id) => this.resetForRoute(id)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly row = this.loader.value;
    readonly savedMessage = signal<string | null>(null);
    readonly showDischargedBanner = signal(false);

    readonly dischargeDialogVisible = signal(false);
    readonly dischargeSubmitting = signal(false);
    readonly dischargeSubmitError = signal<string | null>(null);
    readonly dischargeFieldErrors = signal<HospitalizationDischargeFieldErrors>({});
    readonly dischargeConflict = signal(false);

    readonly dischargeForm = this.fb.nonNullable.group({
        dischargedAtLocal: ['', [Validators.required, dateTimeYearRangeValidator()]],
        dischargeNote: ['']
    });

    readonly canUpdateHospitalization = this.auth.hasOperationClaim(HOSPITALIZATIONS_UPDATE_CLAIM);
    readonly canDischargeHospitalization = this.auth.hasOperationClaim(HOSPITALIZATIONS_DISCHARGE_CLAIM);
    readonly canCreatePayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

    ngOnInit(): void {
        this.loader.init();
    }

    openDischargeDialog(): void {
        if (this.ro.mutationBlocked() || !this.canDischargeHospitalization) {
            return;
        }

        this.dischargeForm.reset({ dischargedAtLocal: '', dischargeNote: '' });
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeConflict.set(false);
        this.dischargeDialogVisible.set(true);
    }

    onDischargeDialogHide(): void {
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeConflict.set(false);
    }

    /** Çakışmada yazılanlar atılır; kayıt (yeni `rowVersion` ile) yeniden yüklenir. */
    discardDischargeAndReload(): void {
        this.dischargeDialogVisible.set(false);
        this.reload();
    }

    onDischargeSubmit(): void {
        const id = this.loader.id;

        if (!id || this.ro.mutationBlocked() || !this.canDischargeHospitalization) {
            return;
        }

        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeConflict.set(false);

        if (this.dischargeForm.invalid) {
            this.dischargeForm.markAllAsTouched();

            return;
        }

        const v = this.dischargeForm.getRawValue();
        const dischargedAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(v.dischargedAtLocal);

        if (!dischargedAtUtc) {
            this.dischargeSubmitError.set('Geçerli bir taburcu tarihi ve saati seçin.');

            return;
        }

        this.dischargeSubmitting.set(true);
        this.hospitalizationsService
            .dischargeHospitalization(id, {
                dischargedAtUtc,
                dischargeNote: v.dischargeNote,
                rowVersion: this.row()?.rowVersion
            })
            .subscribe({
                next: () => {
                    this.dischargeSubmitting.set(false);

                    // Bu arada başka yatışa geçildiyse önceki kaydın sonucu yeni kayıtta gösterilmez.
                    if (id !== this.loader.id) {
                        return;
                    }

                    this.dischargeDialogVisible.set(false);
                    this.showDischargedBanner.set(true);
                    this.reload();
                },
                error: (e: unknown) => {
                    this.dischargeSubmitting.set(false);

                    if (e instanceof HttpErrorResponse) {
                        const parsed = parseHospitalizationDischargeHttpError(e);

                        this.dischargeFieldErrors.set(parsed.fieldErrors);
                        this.dischargeConflict.set(parsed.isConcurrencyConflict);
                        this.dischargeSubmitError.set(parsed.summaryMessage);

                        return;
                    }

                    this.dischargeSubmitError.set(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
                }
            });
    }

    reload(): void {
        this.loader.reload();
    }

    /** Aynı bileşende başka yatışa geçişte önceki kaydın mesajları ve taburcu diyaloğu kalmaz. */
    private resetForRoute(id: string | null): void {
        this.savedMessage.set(id ? (SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null) : null);
        this.showDischargedBanner.set(false);
        this.dischargeDialogVisible.set(false);
        this.onDischargeDialogHide();
    }
}
