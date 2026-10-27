import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { clinicWorkingHoursFormToPutBody, normalizeTimeForInput } from '@/app/entities/clinic/data/clinic-working-hours.mapper';
import type { ClinicWorkingHourFormValue, ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { clinicWorkingDayErrorMessage, clinicWorkingDayGroupValidator } from '@/app/features/clinics/utils/clinic-working-hours-day.validator';
import { clinicWorkingHoursMutationMessage } from '@/app/features/clinics/utils/clinic-working-hours-mutation.utils';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Klinik ayarlarındaki "Çalışma Saatleri" kartı: haftalık gün/saat/mola formu ve kaydı. Yalnız `Clinics.Update` olan
 * kullanıcıya gösterilir (sayfa koşulu). `reloadKey` değişince (pasife alma/aktifleştirme sonrası) yeniden yüklenir.
 */
@Component({
    selector: 'app-clinic-working-hours-section',
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent, ButtonModule, CheckboxModule, AppLoadingStateComponent, AppErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card mb-4" [formGroup]="whForm">
            <h5 class="mt-0 mb-2">Çalışma Saatleri</h5>
            <p class="text-sm text-muted-color mt-0 mb-4">Kliniğin haftalık çalışma günleri ve saatlerini yönetin.</p>
            @if (whLoading()) {
                <app-loading-state message="Çalışma saatleri yükleniyor…" />
            } @else if (whError(); as whErr) {
                <app-error-state [detail]="whErr" (retry)="retryWorkingHoursLoad()" />
            } @else {
                @if (whFormError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ whFormError() }}</p>
                }
                <div formArrayName="days" class="flex flex-col gap-4">
                    @for (row of whDays.controls; track trackWhRow($index, row); let idx = $index) {
                        <div [formGroupName]="idx" class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 md:p-4 grid grid-cols-12 gap-3 gap-y-2">
                            <div class="col-span-12 md:col-span-2 flex flex-col justify-center">
                                <span class="font-medium text-surface-900 dark:text-surface-0">{{ row.get('dayLabel')?.value }}</span>
                            </div>
                            <div class="col-span-12 md:col-span-2 flex items-center gap-2">
                                <p-checkbox formControlName="isClosed" [binary]="true" [inputId]="'whClosed' + idx" />
                                <label class="text-sm m-0 cursor-pointer" [for]="'whClosed' + idx">Kapalı</label>
                            </div>
                            <div class="col-span-6 md:col-span-2">
                                <label class="block text-xs text-muted-color mb-1">Açılış</label>
                                <app-date-input type="time" formControlName="opensAt" />
                            </div>
                            <div class="col-span-6 md:col-span-2">
                                <label class="block text-xs text-muted-color mb-1">Kapanış</label>
                                <app-date-input type="time" formControlName="closesAt" />
                            </div>
                            <div class="col-span-6 md:col-span-2">
                                <label class="block text-xs text-muted-color mb-1">Mola başlangıç</label>
                                <app-date-input type="time" formControlName="breakStartsAt" />
                            </div>
                            <div class="col-span-6 md:col-span-2">
                                <label class="block text-xs text-muted-color mb-1">Mola bitiş</label>
                                <app-date-input type="time" formControlName="breakEndsAt" />
                            </div>
                        </div>
                    }
                </div>
                <div class="mt-4 flex justify-end">
                    <button pButton type="button" severity="secondary" [disabled]="!canSaveWorkingHours() || whSaving()" (click)="onSaveWorkingHours()"><i class="p-button-icon" [class]="whSaving() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>Çalışma saatlerini kaydet</button>
                </div>
            }
        </div>
    `
})
export class ClinicWorkingHoursSectionComponent {
    readonly clinicId = input.required<string>();
    readonly reloadKey = input(0);

    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly clinicsApi = inject(ClinicsService);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly whLoading = signal(false);
    readonly whError = signal<string | null>(null);
    readonly whSaving = signal(false);
    readonly whFormError = signal<string | null>(null);

    readonly whForm = this.fb.group({
        days: this.fb.array<FormGroup>([])
    });

    get whDays(): FormArray<FormGroup> {
        return this.whForm.get('days') as FormArray<FormGroup>;
    }

    private readonly whFormLockEffect = effect(() => {
        this.ro.mutationBlocked();
        this.whSaving();
        this.applyWhFormGlobalLock();
    });

    constructor() {
        effect(() => {
            const clinicId = this.clinicId();

            this.reloadKey();
            untracked(() => this.loadWorkingHours(clinicId));
        });
    }

    trackWhRow(_i: number, row: AbstractControl): number {
        return (row as FormGroup).get('dayOfWeek')?.value ?? _i;
    }

    canSaveWorkingHours(): boolean {
        return this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) && !this.ro.mutationBlocked() && !this.whSaving() && this.whForm.valid && this.whDays.length > 0 && !this.whLoading() && this.whError() === null;
    }

    retryWorkingHoursLoad(): void {
        this.loadWorkingHours(this.clinicId());
    }

    onSaveWorkingHours(): void {
        if (!this.canSaveWorkingHours()) {
            return;
        }

        const id = this.clinicId();

        if (!id) {
            return;
        }

        this.whFormError.set(null);
        this.whDays.controls.forEach((c) => (c as FormGroup).markAllAsTouched());
        this.whDays.updateValueAndValidity({ emitEvent: false });

        if (this.whForm.invalid) {
            for (const c of this.whDays.controls) {
                const msg = clinicWorkingDayErrorMessage((c as FormGroup).errors);

                if (msg) {
                    this.whFormError.set(msg);

                    return;
                }
            }

            this.whFormError.set('Lütfen çalışma saatlerini kontrol edin.');

            return;
        }

        const days = this.whDays.getRawValue() as ClinicWorkingHourFormValue[];
        const body = clinicWorkingHoursFormToPutBody(days);

        this.whSaving.set(true);
        this.clinicsApi.updateWorkingHours(id, body).subscribe({
            next: (items) => {
                this.whSaving.set(false);
                this.patchWorkingHoursForm(items);
                this.whFormError.set(null);
                addTracedToast(this.messages, 'ClinicDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Çalışma saatleri güncellendi.'
                });
            },
            error: (e: unknown) => {
                this.whSaving.set(false);

                if (e instanceof HttpErrorResponse) {
                    this.whFormError.set(clinicWorkingHoursMutationMessage(e, 'Çalışma saatleri güncellenemedi.'));
                } else {
                    this.whFormError.set('Çalışma saatleri güncellenemedi.');
                }
            }
        });
    }

    private applyWhRowTimeLocks(g: FormGroup): void {
        const closed = g.get('isClosed')?.value === true;

        for (const k of ['opensAt', 'closesAt', 'breakStartsAt', 'breakEndsAt'] as const) {
            const c = g.get(k);

            if (!c) {
                continue;
            }

            if (closed) {
                c.disable({ emitEvent: false });
            } else {
                c.enable({ emitEvent: false });
            }
        }
    }

    private applyWhFormGlobalLock(): void {
        const lock = this.ro.mutationBlocked() || !this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) || this.whSaving();
        const arr = this.whDays;

        for (const ctrl of arr.controls) {
            const g = ctrl as FormGroup;
            const closedCtrl = g.get('isClosed');

            if (closedCtrl) {
                if (lock) {
                    closedCtrl.disable({ emitEvent: false });
                } else {
                    closedCtrl.enable({ emitEvent: false });
                }
            }

            if (lock) {
                for (const k of ['opensAt', 'closesAt', 'breakStartsAt', 'breakEndsAt'] as const) {
                    g.get(k)?.disable({ emitEvent: false });
                }
            } else {
                this.applyWhRowTimeLocks(g);
            }
        }
    }

    private loadWorkingHours(clinicId: string): void {
        this.whLoading.set(true);
        this.whError.set(null);
        this.whFormError.set(null);
        this.clinicsApi.getWorkingHours(clinicId).subscribe({
            next: (items) => {
                this.patchWorkingHoursForm(items);
                this.whLoading.set(false);
            },
            error: (e: Error) => {
                this.whError.set(e.message ?? 'Çalışma saatleri yüklenemedi.');
                this.whLoading.set(false);
            }
        });
    }

    private patchWorkingHoursForm(items: ClinicWorkingHourVm[]): void {
        const arr = this.whDays;

        arr.clear();

        for (const vm of [...items].sort((a, b) => a.dayOfWeek - b.dayOfWeek)) {
            const g = this.fb.group(
                {
                    dayOfWeek: [vm.dayOfWeek],
                    dayLabel: [{ value: vm.dayLabel, disabled: true }],
                    isClosed: [vm.isClosed],
                    opensAt: [normalizeTimeForInput(vm.opensAt)],
                    closesAt: [normalizeTimeForInput(vm.closesAt)],
                    breakStartsAt: [normalizeTimeForInput(vm.breakStartsAt)],
                    breakEndsAt: [normalizeTimeForInput(vm.breakEndsAt)]
                },
                { validators: [clinicWorkingDayGroupValidator] }
            );

            arr.push(g);
            g.get('isClosed')!
                .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    if (!this.ro.mutationBlocked() && this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) && !this.whSaving()) {
                        this.applyWhRowTimeLocks(g);
                    }
                });
        }

        this.applyWhFormGlobalLock();
    }
}
