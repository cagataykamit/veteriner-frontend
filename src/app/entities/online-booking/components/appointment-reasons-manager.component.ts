import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import {
    APPOINTMENT_DURATION_MAX,
    APPOINTMENT_DURATION_MIN,
    APPOINTMENT_REASON_NAME_MAX,
    type AppointmentReasonVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService } from '@/app/entities/online-booking/services/online-booking.service';
import { isUrgentOnlineReason, ONLINE_OTHER_REASON, URGENT_ONLINE_REASON_WARNING } from '@/app/entities/online-booking/utils/appointment-reason-online.utils';
import { OnlineBookingError } from '@/app/entities/online-booking/utils/online-booking-error.utils';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Bir kliniğin randevu nedenleri (APPT-005/006/007; ADR-042 K2 ve eki): liste, ekleme/düzenleme, pasife alma ve sonda sistemin
 * "Diğer / emin değilim" satırı. Tanımlar > Randevu nedenleri ve Ayarlar > Online randevu aynı parçayı kullanır; biri değişince
 * öbürü de aynı kaydı görür. Liste her yüklendiğinde `reasonsChange` yayınlanır (online kurulum kontrolü ve önizleme için).
 */
@Component({
    selector: 'app-appointment-reasons-manager',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        CheckboxModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        TableModule,
        ToggleSwitchModule,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        @if (canWrite()) {
            <div class="flex justify-end mb-3">
                <button pButton type="button" data-testid="reason-new" (click)="openCreate()"><i class="pi pi-plus"></i>Yeni neden</button>
            </div>
        }

        @if (listActionError()) {
            <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
        }

        @if (loading()) {
            <app-loading-state message="Randevu nedenleri yükleniyor…" />
        } @else if (error()) {
            <app-error-state [detail]="error()!" (retry)="reload()" />
        } @else {
            @if (reasons().length === 0) {
                <app-empty-state message="Bu klinikte tanımlı randevu nedeni yok." [hint]="canWrite() ? 'Aşı, kontrol, muayene gibi nedenleri süreleriyle ekleyin; online talepte yalnız sistemin Diğer seçeneği görünür.' : ''" />
            }
            <div class="overflow-x-auto">
                <p-table [value]="reasons()" [tableStyle]="{ 'min-width': '44rem' }">
                    <ng-template #header>
                        <tr>
                            <th>Neden</th>
                            <th style="width: 7rem">Süre</th>
                            <th style="width: 8rem">Online</th>
                            <th>Uygun hekimler</th>
                            <th style="width: 7rem">Durum</th>
                            @if (canWrite()) {
                                <th style="min-width: 10rem">İşlem</th>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #body let-reason>
                        <tr data-testid="reason-row">
                            <td class="font-medium" [class.text-muted-color]="!reason.isActive">{{ reason.name }}</td>
                            <td>{{ reason.defaultDurationMinutes }} dk</td>
                            <td>
                                {{ reason.isOnlineBookable ? 'Görünür' : 'Gizli' }}
                                @if (reason.isActive && isUrgentOnline(reason.name, reason.isOnlineBookable)) {
                                    <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 ml-1" [title]="urgentWarning" data-testid="reason-urgent-online"></i>
                                }
                            </td>
                            <td class="text-sm">{{ vetNames(reason) }}</td>
                            <td><app-status-tag [label]="reason.isActive ? 'Aktif' : 'Pasif'" [severity]="reason.isActive ? 'success' : 'warn'" /></td>
                            @if (canWrite()) {
                                <td>
                                    <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                        <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="openEdit(reason)">Düzenle</button>
                                        @if (reason.isActive) {
                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-red-600 dark:text-red-400" [disabled]="mutating()" (click)="confirmDeactivate(reason)">Pasife al</button>
                                        } @else {
                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="setActive(reason, true)">Etkinleştir</button>
                                        }
                                    </div>
                                </td>
                            }
                        </tr>
                    </ng-template>
                    <ng-template #footer>
                        <!-- Sistem seçeneği: klinik tanımlamaz ve kapatamaz; yalnız bilgi için gösterilir (ADR-042 eki). -->
                        <tr data-testid="reason-other-row">
                            <td class="font-medium">{{ other.name }}</td>
                            <td>{{ other.durationMinutes }} dk</td>
                            <td>Her zaman</td>
                            <td class="text-sm">Tüm hekimler</td>
                            <td><app-status-tag label="Sistem" severity="secondary" /></td>
                            @if (canWrite()) {
                                <td class="text-sm text-muted-color">Sahip ne için geldiğini yazar</td>
                            }
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        }

        <p-dialog [header]="editing() ? 'Nedeni düzenle' : 'Yeni neden'" [modal]="true" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [style]="{ width: 'min(32rem, 95vw)' }" [draggable]="false">
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (dialogError()) {
                    <p-message severity="error" class="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="reasonName" class="block text-sm font-medium text-muted-color">Ad *</label>
                    <input id="reasonName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" [maxlength]="nameMax" />
                    @if (form.controls.name.invalid && form.controls.name.touched) {
                        <small class="text-red-500">Ad zorunludur.</small>
                    }
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="reasonDuration" class="block text-sm font-medium text-muted-color">Varsayılan süre (dk) *</label>
                        <input id="reasonDuration" pInputText class="w-full" type="number" step="5" [min]="durationMin" [max]="durationMax" formControlName="defaultDurationMinutes" />
                        @if (form.controls.defaultDurationMinutes.invalid && form.controls.defaultDurationMinutes.touched) {
                            <small class="text-red-500">Süre {{ durationMin }}–{{ durationMax }} dakika olmalıdır.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="reasonSortOrder" class="block text-sm font-medium text-muted-color">Sıra</label>
                        <input id="reasonSortOrder" pInputText class="w-full" type="number" step="1" formControlName="sortOrder" />
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <p-toggleswitch inputId="reasonOnline" formControlName="isOnlineBookable" />
                    <label for="reasonOnline" class="text-sm">Online talepte görünsün</label>
                </div>
                @if (isUrgentOnline(form.controls.name.value, form.controls.isOnlineBookable.value)) {
                    <p-message severity="warn" class="w-full" data-testid="reason-urgent-warning">{{ urgentWarning }}</p-message>
                }
                <fieldset class="flex flex-col gap-2 border-0 p-0 m-0">
                    <legend class="text-sm font-medium text-muted-color mb-1">Uygun hekimler</legend>
                    @if (veterinarians().length === 0) {
                        <small class="text-muted-color">Bu klinikte hekim bulunamadı; neden tüm hekimlere açık kalır.</small>
                    } @else {
                        @for (vet of veterinarians(); track vet.userId) {
                            <div class="flex items-center gap-2">
                                <p-checkbox [inputId]="'vet-' + vet.userId" [binary]="true" [ngModel]="isVetSelected(vet.userId)" [ngModelOptions]="{ standalone: true }" (ngModelChange)="toggleVet(vet.userId, $event)" />
                                <label [for]="'vet-' + vet.userId" class="text-sm">{{ vet.name }}</label>
                            </div>
                        }
                        <small class="text-muted-color">Hiçbiri seçilmezse klinikteki tüm hekimler uygundur.</small>
                    }
                </fieldset>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="form.invalid || submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class AppointmentReasonsManagerComponent {
    readonly clinicId = input.required<string>();
    /** `Clinics.Update` ve salt okunur olmayan kiracı; üst sayfa hesaplar. */
    readonly canWrite = input(false);

    readonly reasonsChange = output<AppointmentReasonVm[]>();

    readonly copy = PANEL_COPY;
    readonly nameMax = APPOINTMENT_REASON_NAME_MAX;
    readonly durationMin = APPOINTMENT_DURATION_MIN;
    readonly durationMax = APPOINTMENT_DURATION_MAX;
    readonly urgentWarning = URGENT_ONLINE_REASON_WARNING;
    readonly isUrgentOnline = isUrgentOnlineReason;
    readonly other = ONLINE_OTHER_REASON;

    private readonly reasonsService = inject(AppointmentReasonsService);
    private readonly visits = inject(VisitsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly fb = inject(FormBuilder);

    readonly reasons = signal<AppointmentReasonVm[]>([]);
    readonly veterinarians = signal<VeterinarianVm[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutating = signal(false);

    readonly dialogVisible = signal(false);
    readonly editing = signal<AppointmentReasonVm | null>(null);
    readonly selectedVets = signal<string[]>([]);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly form = this.fb.group({
        name: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(APPOINTMENT_REASON_NAME_MAX)]),
        defaultDurationMinutes: this.fb.nonNullable.control(30, [Validators.required, Validators.min(APPOINTMENT_DURATION_MIN), Validators.max(APPOINTMENT_DURATION_MAX)]),
        sortOrder: this.fb.control<number | null>(0),
        isOnlineBookable: this.fb.nonNullable.control(true)
    });

    private loadSeq = 0;

    constructor() {
        effect(() => {
            this.clinicId();
            untracked(() => {
                this.listActionError.set(null);
                this.reload();
            });
        });
    }

    reload(): void {
        const clinicId = this.clinicId();
        const seq = ++this.loadSeq;

        if (!clinicId) {
            this.setReasons([]);
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.reasonsService.list(clinicId).subscribe({
            next: (reasons) => {
                if (seq === this.loadSeq) {
                    this.setReasons(reasons);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Randevu nedenleri yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
        // Hekim listesi yalnız görünen adlar ve seçim içindir; okunamazsa (yetki) kimlik gösterilmez, seçim boş kalır.
        this.visits.getVeterinarians(clinicId).subscribe({
            next: (vets) => seq === this.loadSeq && this.veterinarians.set(vets),
            error: () => seq === this.loadSeq && this.veterinarians.set([])
        });
    }

    vetNames(reason: AppointmentReasonVm): string {
        if (reason.veterinarianUserIds.length === 0) {
            return 'Tüm hekimler';
        }

        const names = new Map(this.veterinarians().map((v) => [v.userId, v.name]));

        return reason.veterinarianUserIds.map((id) => names.get(id) ?? 'Hekim').join(', ');
    }

    isVetSelected(userId: string): boolean {
        return this.selectedVets().includes(userId);
    }

    toggleVet(userId: string, selected: boolean): void {
        this.selectedVets.update((list) => (selected ? [...new Set([...list, userId])] : list.filter((id) => id !== userId)));
    }

    openCreate(): void {
        this.open(null);
    }

    openEdit(reason: AppointmentReasonVm): void {
        this.open(reason);
    }

    submit(): void {
        const clinicId = this.clinicId();
        const editing = this.editing();

        if (!clinicId || this.submitting()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const value = { ...this.form.getRawValue(), veterinarianUserIds: this.selectedVets() };
        const request = editing ? this.reasonsService.update(clinicId, editing.id, value) : this.reasonsService.create(clinicId, value);

        this.submitting.set(true);
        this.dialogError.set(null);
        request.subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof OnlineBookingError && e.isStale) {
                    this.dialogVisible.set(false);
                    this.listActionError.set(e.message);
                    this.reload();

                    return;
                }

                this.dialogError.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }

    confirmDeactivate(reason: AppointmentReasonVm): void {
        this.confirmation.confirm({
            header: 'Nedeni pasife al',
            message: `"${reason.name}" yeni randevu ve online talepte seçilemez; mevcut randevular etkilenmez.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasife al',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setActive(reason, false)
        });
    }

    setActive(reason: AppointmentReasonVm, active: boolean): void {
        if (!this.canWrite() || this.mutating()) {
            return;
        }

        this.mutating.set(true);
        this.listActionError.set(null);
        this.reasonsService.setActive(this.clinicId(), reason.id, active).subscribe({
            next: () => {
                this.mutating.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.mutating.set(false);
                this.listActionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');
            }
        });
    }

    private setReasons(reasons: AppointmentReasonVm[]): void {
        this.reasons.set(reasons);
        this.reasonsChange.emit(reasons);
    }

    private open(reason: AppointmentReasonVm | null): void {
        if (!this.canWrite()) {
            return;
        }

        this.editing.set(reason);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.selectedVets.set(reason ? [...reason.veterinarianUserIds] : []);
        this.form.reset({
            name: reason?.name ?? '',
            defaultDurationMinutes: reason?.defaultDurationMinutes ?? 30,
            sortOrder: reason?.sortOrder ?? this.reasons().reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1,
            isOnlineBookable: reason?.isOnlineBookable ?? true
        });
        this.dialogVisible.set(true);
    }
}
