import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import type { ClinicDetailVm } from '@/app/features/clinics/models/clinic-vm.model';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import {
    clinicSettingsMutationMessage,
    isClinicActivateAlreadyActive,
    isClinicDeactivateAlreadyInactive
} from '@/app/features/clinics/utils/clinic-settings-mutation.utils';
import {
    parseClinicUpsertHttpError,
    type ClinicUpsertFieldErrors
} from '@/app/features/clinics/utils/clinic-upsert-validation-parse.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-clinic-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <a routerLink="/panel/settings/clinics" class="text-primary font-medium no-underline inline-block mb-4">← Klinik listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Klinik bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else if (detail(); as d) {
            <app-page-header
                title="Klinik ayarları"
                subtitle="Hesap"
                description="Klinik adı ve şehir bilgisini güncelleyebilir; kliniği pasife alabilir veya yeniden aktifleştirebilirsiniz."
            />

            <div class="card mb-4">
                <h5 class="mt-0 mb-3">Özet</h5>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 text-sm">
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Durum</dt>
                        <dd class="m-0">
                            @if (d.isActive === true) {
                                <span class="text-green-700 dark:text-green-400">Aktif</span>
                            } @else if (d.isActive === false) {
                                <span class="text-muted-color">Pasif</span>
                            } @else {
                                <span class="text-muted-color">—</span>
                            }
                        </dd>
                    </div>
                </dl>
            </div>

            <div class="card mb-4">
                <h5 class="mt-0 mb-4">Düzenle</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        Bu işletme salt okunur moddadır; klinik bilgileri güncellenemez.
                    </p>
                }
                @if (formError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ formError() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSave()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicName" class="block text-sm font-medium text-muted-color mb-2">Klinik adı *</label>
                            <input id="clinicName" pInputText class="w-full" formControlName="name" autocomplete="organization" />
                            @if (apiFieldErrors().name) {
                                <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                            } @else if (form.controls.name.invalid && form.controls.name.touched) {
                                <small class="text-red-500">Klinik adı zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="clinicCity" class="block text-sm font-medium text-muted-color mb-2">Şehir *</label>
                            <input id="clinicCity" pInputText class="w-full" formControlName="city" autocomplete="address-level2" />
                            @if (apiFieldErrors().city) {
                                <small class="text-red-500">{{ apiFieldErrors().city }}</small>
                            } @else if (form.controls.city.invalid && form.controls.city.touched) {
                                <small class="text-red-500">Şehir zorunludur.</small>
                            }
                        </div>
                    </div>
                    <div class="mt-4 mb-0">
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-save"
                            [loading]="saving()"
                            [disabled]="form.invalid || saving() || ro.mutationBlocked() || busyDeactivate() || busyActivate()"
                        />
                    </div>
                </form>
            </div>

            <div class="card">
                <h5 class="mt-0 mb-3">Durum</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-sm text-muted-color m-0">Salt okunur modda pasif/aktif işlemi yapılamaz.</p>
                } @else {
                    <div class="flex flex-wrap gap-2">
                        @if (d.isActive === true) {
                            <p-button
                                type="button"
                                label="Pasife al"
                                icon="pi pi-ban"
                                severity="danger"
                                [loading]="busyDeactivate()"
                                [disabled]="busyActivate() || saving()"
                                (onClick)="onDeactivate()"
                            />
                        } @else {
                            <p-button
                                type="button"
                                label="Aktifleştir"
                                icon="pi pi-check-circle"
                                [loading]="busyActivate()"
                                [disabled]="busyDeactivate() || saving()"
                                (onClick)="onActivate()"
                            />
                        }
                    </div>
                }
            </div>
        }
    `
})
export class ClinicDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly detail = signal<ClinicDetailVm | null>(null);

    readonly saving = signal(false);
    readonly busyDeactivate = signal(false);
    readonly busyActivate = signal(false);
    readonly formError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ClinicUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(256)]],
        city: ['', [Validators.required, Validators.maxLength(128)]]
    });

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
            const id = pm.get('clinicId')?.trim() ?? '';
            if (!id) {
                this.loading.set(false);
                this.loadError.set('Geçersiz klinik.');
                return;
            }
            this.load(id);
        });
    }

    reload(): void {
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim();
        if (id) {
            this.load(id);
        }
    }

    private load(id: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.detail.set(null);
        this.formError.set(null);
        this.apiFieldErrors.set({});
        this.clinicsApi.getClinicById(id).subscribe({
            next: (vm) => {
                this.detail.set(vm);
                this.form.patchValue({ name: vm.name, city: vm.city });
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.loadError.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    onSave(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.formError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const id = this.detail()?.id ?? this.route.snapshot.paramMap.get('clinicId')?.trim() ?? '';
        if (!id) {
            return;
        }
        const v = this.form.getRawValue();
        this.saving.set(true);
        this.clinicsApi.updateClinicFromForm(id, v.name, v.city).subscribe({
            next: (vm) => {
                this.saving.set(false);
                this.detail.set(vm);
                this.form.patchValue({ name: vm.name, city: vm.city });
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Klinik bilgileri güncellendi.' });
            },
            error: (e: unknown) => {
                this.saving.set(false);
                this.handlePutError(e);
            }
        });
    }

    private handlePutError(e: unknown): void {
        if (!(e instanceof HttpErrorResponse)) {
            this.formError.set('Klinik güncellenemedi.');
            return;
        }
        const parsed = parseClinicUpsertHttpError(e);
        if (Object.keys(parsed.fieldErrors).length > 0) {
            this.apiFieldErrors.set(parsed.fieldErrors);
            if (parsed.summaryMessage) {
                this.formError.set(parsed.summaryMessage);
            }
            return;
        }
        this.formError.set(clinicSettingsMutationMessage(e, 'Klinik güncellenemedi.'));
    }

    onDeactivate(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const id = this.detail()?.id ?? '';
        if (!id) {
            return;
        }
        this.formError.set(null);
        this.busyDeactivate.set(true);
        this.clinicsApi.deactivateClinic(id).subscribe({
            next: () => {
                this.busyDeactivate.set(false);
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Klinik pasife alındı.' });
                this.refreshAfterMutation(id);
            },
            error: (e: unknown) => {
                this.busyDeactivate.set(false);
                this.handleDeactivateError(e, id);
            }
        });
    }

    private handleDeactivateError(e: unknown, clinicId: string): void {
        if (e instanceof HttpErrorResponse && isClinicDeactivateAlreadyInactive(e)) {
            this.refreshAfterMutation(clinicId);
            this.messages.add({
                severity: 'info',
                summary: 'Bilgi',
                detail: 'Bu klinik zaten pasif; bilgiler güncellendi.'
            });
            return;
        }
        this.formError.set(
            e instanceof HttpErrorResponse
                ? clinicSettingsMutationMessage(e, 'Klinik pasife alınamadı.')
                : 'Klinik pasife alınamadı.'
        );
    }

    onActivate(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const id = this.detail()?.id ?? '';
        if (!id) {
            return;
        }
        this.formError.set(null);
        this.busyActivate.set(true);
        this.clinicsApi.activateClinic(id).subscribe({
            next: () => {
                this.busyActivate.set(false);
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Klinik aktifleştirildi.' });
                this.refreshAfterMutation(id);
            },
            error: (e: unknown) => {
                this.busyActivate.set(false);
                this.handleActivateError(e, id);
            }
        });
    }

    private handleActivateError(e: unknown, clinicId: string): void {
        if (e instanceof HttpErrorResponse && isClinicActivateAlreadyActive(e)) {
            this.refreshAfterMutation(clinicId);
            this.messages.add({
                severity: 'info',
                summary: 'Bilgi',
                detail: 'Bu klinik zaten aktif; bilgiler güncellendi.'
            });
            return;
        }
        this.formError.set(
            e instanceof HttpErrorResponse
                ? clinicSettingsMutationMessage(e, 'Klinik aktifleştirilemedi.')
                : 'Klinik aktifleştirilemedi.'
        );
    }

    private refreshAfterMutation(clinicId: string): void {
        this.clinicsApi.getClinicById(clinicId).subscribe({
            next: (vm) => {
                this.detail.set(vm);
                this.form.patchValue({ name: vm.name, city: vm.city });
            },
            error: (err: Error) => {
                this.formError.set(err.message ?? 'Liste yenilenemedi.');
            }
        });
    }
}
