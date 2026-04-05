import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { HospitalizationDetailVm } from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import {
    type HospitalizationDischargeFieldErrors,
    parseHospitalizationDischargeHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { dateTimeLocalInputToIsoUtc, formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

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
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Kayıt güncellendi.</p>
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
            <app-page-header title="Yatış" subtitle="Klinik" [description]="row()!.reason">
                @if (
                    row()!.isActive ||
                    (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim())
                ) {
                    <div actions class="flex flex-wrap gap-2">
                        @if (row()!.isActive) {
                            <a
                                [routerLink]="['/panel/hospitalizations', row()!.id, 'edit']"
                                pButton
                                type="button"
                                label="Düzenle"
                                icon="pi pi-pencil"
                                class="p-button-secondary"
                            ></a>
                            <p-button
                                type="button"
                                label="Taburcu et"
                                icon="pi pi-sign-out"
                                severity="warn"
                                (onClick)="openDischargeDialog()"
                            />
                        }
                        @if (row()!.examinationId?.trim() && row()!.clientId?.trim() && row()!.petId?.trim()) {
                            <a
                                [routerLink]="['/panel/payments/new']"
                                [queryParams]="{
                                    clientId: row()!.clientId,
                                    petId: row()!.petId,
                                    examinationId: row()!.examinationId
                                }"
                                pButton
                                type="button"
                                label="Ödeme Oluştur"
                                icon="pi pi-wallet"
                                class="p-button-secondary"
                            ></a>
                        }
                    </div>
                }
            </app-page-header>

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
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Yatış</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.admittedAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Planlı taburcu</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.plannedDischargeAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Taburcu</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(row()!.dischargedAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(row()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(row()!.updatedAtUtc) }}</dd>
                            @if (row()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a
                                        [routerLink]="['/panel/examinations', row()!.examinationId]"
                                        class="text-primary font-medium no-underline"
                                        >Muayene kaydına git →</a
                                    >
                                </dd>
                            }
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (row()!.clientId) {
                                    <a [routerLink]="['/panel/clients', row()!.clientId]" class="text-primary font-medium no-underline">{{ row()!.clientName }}</a>
                                } @else {
                                    {{ row()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
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
                    </div>
                </div>
            </div>
        }

        <p-dialog
            header="Taburcu işlemi"
            [modal]="true"
            [(visible)]="dischargeDialogVisible"
            [style]="{ width: 'min(32rem, 95vw)' }"
            [draggable]="false"
            (onHide)="onDischargeDialogHide()"
        >
            <p class="text-sm text-muted-color mt-0 mb-4">Taburcu tarihi ve saati zorunlucudur. İşlem sonrası kayıt kapatılır.</p>
            <form [formGroup]="dischargeForm" (ngSubmit)="onDischargeSubmit()">
                <div class="flex flex-col gap-4">
                    <div>
                        <label for="dischargedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Taburcu tarihi / saati *</label>
                        <input
                            id="dischargedAtLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="dischargedAtLocal"
                        />
                        @if (dischargeForm.controls.dischargedAtLocal.invalid && dischargeForm.controls.dischargedAtLocal.touched) {
                            <small class="text-red-500">Zorunlu.</small>
                        } @else if (dischargeFieldErrors().dischargedAtLocal) {
                            <small class="text-red-500">{{ dischargeFieldErrors().dischargedAtLocal }}</small>
                        }
                    </div>
                    <div>
                        <label for="dischargeNotes" class="block text-sm font-medium text-muted-color mb-2">Taburcu notu</label>
                        <textarea id="dischargeNotes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (dischargeFieldErrors().notes) {
                            <small class="text-red-500">{{ dischargeFieldErrors().notes }}</small>
                        }
                    </div>
                </div>
                @if (dischargeSubmitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ dischargeSubmitError() }}</p>
                }
                <div class="flex flex-wrap justify-end gap-2 mt-4">
                    <p-button type="button" label="Vazgeç" severity="secondary" (onClick)="dischargeDialogVisible = false" [disabled]="dischargeSubmitting()" />
                    <p-button type="submit" label="Taburcu et" icon="pi pi-check" [loading]="dischargeSubmitting()" />
                </div>
            </form>
        </p-dialog>
    `
})
export class HospitalizationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly fb = inject(FormBuilder);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly row = signal<HospitalizationDetailVm | null>(null);
    readonly showSavedBanner = signal(false);
    readonly showDischargedBanner = signal(false);

    dischargeDialogVisible = false;
    readonly dischargeSubmitting = signal(false);
    readonly dischargeSubmitError = signal<string | null>(null);
    readonly dischargeFieldErrors = signal<HospitalizationDischargeFieldErrors>({});

    readonly dischargeForm = this.fb.nonNullable.group({
        dischargedAtLocal: ['', Validators.required],
        notes: ['']
    });

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);

    private hospitalizationId = '';

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.error.set('Geçersiz kayıt.');
            this.loading.set(false);
            return;
        }
        this.hospitalizationId = id;
        this.showSavedBanner.set(this.route.snapshot.queryParamMap.get('saved') === '1');
        this.reload();
    }

    openDischargeDialog(): void {
        this.dischargeForm.reset({ dischargedAtLocal: '', notes: '' });
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        this.dischargeDialogVisible = true;
    }

    onDischargeDialogHide(): void {
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
    }

    onDischargeSubmit(): void {
        this.dischargeSubmitError.set(null);
        this.dischargeFieldErrors.set({});
        if (this.dischargeForm.invalid) {
            this.dischargeForm.markAllAsTouched();
            return;
        }
        const v = this.dischargeForm.getRawValue();
        const dischargedAtUtc = dateTimeLocalInputToIsoUtc(v.dischargedAtLocal);
        if (!dischargedAtUtc) {
            this.dischargeSubmitError.set('Geçerli bir taburcu tarihi ve saati seçin.');
            return;
        }

        this.dischargeSubmitting.set(true);
        this.hospitalizationsService
            .dischargeHospitalization(this.hospitalizationId, {
                dischargedAtUtc,
                notes: v.notes?.trim() ? v.notes.trim() : null
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
