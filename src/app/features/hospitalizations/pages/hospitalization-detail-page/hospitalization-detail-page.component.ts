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
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { DATETIME_LOCAL_INPUT_MIN, dateTimeYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { HOSPITALIZATIONS_DISCHARGE_CLAIM, HOSPITALIZATIONS_UPDATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

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
        PetAlertBannerComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        DateInputComponent,
        CareInstructionsSectionComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
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
        } @else if (row()) {
            <app-page-header categoryLink="/panel/hospitalizations" categoryLinkLabel="Listeye dön" title="Yatış" [description]="row()!.reason">
                @if (row()!.isActive || (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim())) {
                    <div actions class="flex flex-wrap gap-2">
                        @if (row()!.isActive) {
                            @if (canUpdateHospitalization && !ro.mutationBlocked()) {
                                <a [routerLink]="['/panel/hospitalizations', row()!.id, 'edit']" pButton type="button" class="p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                                @if (canDischargeHospitalization) {
                                    <button pButton type="button" severity="warn" (click)="openDischargeDialog()"><i class="p-button-icon pi pi-sign-out"></i>Taburcu et</button>
                                }
                            } @else if (canUpdateHospitalization && ro.mutationBlocked()) {
                                <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                                @if (canDischargeHospitalization) {
                                    <button pButton type="button" severity="secondary" [disabled]="true"><i class="p-button-icon pi pi-lock"></i>Taburcu et (salt okunur)</button>
                                }
                            }
                        }
                        @if (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim()) {
                            @if (canCreatePayment && !ro.mutationBlocked()) {
                                <a
                                    [routerLink]="['/panel/payments/new']"
                                    [queryParams]="{
                                        clientId: row()!.clientId,
                                        petId: row()!.petId,
                                        examinationId: row()!.examinationId
                                    }"
                                    pButton
                                    type="button"
                                   
                                   
                                    class="p-button-secondary"
                                ><i class="pi pi-wallet"></i>Ödeme Oluştur</a>
                            } @else if (canCreatePayment && ro.mutationBlocked()) {
                                <button pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Ödeme Oluştur (salt okunur)</button>
                            }
                        }
                    </div>
                }
            </app-page-header>
            <app-pet-alert-banner [petId]="row()!.petId" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.isActive) {
                                    <span class="font-medium">Aktif yatış</span>
                                } @else {
                                    Taburcu
                                }
                            </dd>
                            @if (row()!.locationLabel) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Konum</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0" data-testid="hospitalization-location">{{ row()!.locationLabel }}</dd>
                            }
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Yatış</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.admittedAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Planlı taburcu</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.plannedDischargeAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Taburcu</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.dischargedAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.createdAtUtc | trDateTime }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ row()!.updatedAtUtc | trDateTime }}</dd>
                            @if (row()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/examinations', row()!.examinationId]" class="text-primary font-medium no-underline">Muayene kaydına git →</a>
                                </dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hasta</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.clientId) {
                                    <a [routerLink]="['/panel/clients', row()!.clientId]" class="text-primary font-medium no-underline">{{ row()!.clientName }}</a>
                                } @else {
                                    {{ row()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hasta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.petId) {
                                    <a [routerLink]="['/panel/pets', row()!.petId]" class="text-primary font-medium no-underline">{{ row()!.petName }}</a>
                                } @else {
                                    {{ row()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        <h6 class="mt-0 mb-2 text-muted-color text-sm">Yatış notları</h6>
                        <p class="mt-0 mb-0 whitespace-pre-wrap">{{ row()!.notes }}</p>
                        @if (row()!.dischargeNote) {
                            <h6 class="mt-4 mb-2 text-muted-color text-sm">Taburcu notu</h6>
                            <p class="mt-0 mb-0 whitespace-pre-wrap" data-testid="discharge-note">{{ row()!.dischargeNote }}</p>
                        }
                    </div>
                </div>
                @if (row()!.petId) {
                    <div class="col-span-12">
                        <app-care-instructions-section [hospitalizationId]="row()!.id" [petId]="row()!.petId!" />
                    </div>
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
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (dischargeForm.controls.dischargedAtLocal.hasError('required') && dischargeForm.controls.dischargedAtLocal.touched) {
                            <small class="text-red-500">Zorunlu.</small>
                        } @else if (dischargeFieldErrors().dischargedAtLocal) {
                            <small class="text-red-500">{{ dischargeFieldErrors().dischargedAtLocal }}</small>
                        }
                    </div>
                    <div>
                        <label for="dischargeNote" class="block text-sm font-medium text-muted-color mb-2">Taburcu notu</label>
                        <textarea id="dischargeNote" rows="3" class="w-full p-inputtext p-component" formControlName="dischargeNote"></textarea>
                        <small class="text-muted-color">Giriş notunu değiştirmez; hasta sahibine verilecek talimat için “Bakım talimatları” bölümünü kullanın.</small>
                        @if (dischargeFieldErrors().dischargeNote) {
                            <small class="text-red-500 block">{{ dischargeFieldErrors().dischargeNote }}</small>
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
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ dischargeSubmitError() }}</p>
                }
                <div class="flex flex-wrap justify-end gap-2 mt-4">
                    <button pButton type="button" severity="secondary" (click)="dischargeDialogVisible = false" [disabled]="dischargeSubmitting()">Vazgeç</button>
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

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<HospitalizationDetailVm | null>(null);
    readonly savedMessage = signal<string | null>(null);
    readonly showDischargedBanner = signal(false);

    dischargeDialogVisible = false;
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

    private hospitalizationId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';

        if (!id) {
            this.error.set('Geçersiz kayıt.');
            this.loading.set(false);

            return;
        }

        this.hospitalizationId = id;
        this.savedMessage.set(SAVED_MESSAGES[this.route.snapshot.queryParamMap.get('saved') ?? ''] ?? null);
        this.reload();
    }

    openDischargeDialog(): void {
        if (this.ro.mutationBlocked() || !this.canDischargeHospitalization) {
            return;
        }

        this.dischargeForm.reset({ dischargedAtLocal: '', dischargeNote: '' });
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeConflict.set(false);
        this.dischargeDialogVisible = true;
    }

    onDischargeDialogHide(): void {
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeConflict.set(false);
    }

    /** Çakışmada yazılanlar atılır; kayıt (yeni `rowVersion` ile) yeniden yüklenir. */
    discardDischargeAndReload(): void {
        this.dischargeDialogVisible = false;
        this.reload();
    }

    onDischargeSubmit(): void {
        if (this.ro.mutationBlocked() || !this.canDischargeHospitalization) {
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
            .dischargeHospitalization(this.hospitalizationId, {
                dischargedAtUtc,
                dischargeNote: v.dischargeNote,
                rowVersion: this.row()?.rowVersion
            })
            .subscribe({
                next: () => {
                    this.dischargeSubmitting.set(false);
                    this.dischargeDialogVisible = false;
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
        this.loading.set(true);
        this.error.set(null);
        this.hospitalizationsService.getHospitalizationById(this.hospitalizationId).subscribe({
            next: (x) => {
                this.row.set(x);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Kayıt yüklenemedi.');
                this.loading.set(false);
            }
        });
    }
}
