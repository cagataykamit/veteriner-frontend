import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import {
    APPOINTMENT_RESOURCE_CAPACITY_MAX,
    APPOINTMENT_RESOURCE_CAPACITY_MIN,
    APPOINTMENT_RESOURCE_NAME_MAX,
    APPOINTMENT_RESOURCE_TYPE_LABELS,
    type AppointmentResourceType,
    type AppointmentResourceVm
} from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { AppointmentResourceError, AppointmentResourcesService } from '@/app/entities/appointment-resource/services/appointment-resources.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { FormErrorSummaryComponent } from '@/app/shared/forms/form-field/form-error-summary.component';
import { FormSubmitDirective } from '@/app/shared/forms/form-field/form-submit.directive';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { DialogUnsavedChangesDirective } from '@/app/shared/ui/unsaved-changes/dialog-unsaved-changes.directive';

/**
 * Oda ve cihazlar (APPT-025; ADR-053 K5), Tanımlar altında: randevu formunda seçilir, takvimde "Oda ve cihaz" görünümünün sütunlarıdır.
 * Aynı kaynağa kapasiteden fazla eşzamanlı randevu verilemez. Klinik bazlıdır; silinmez, pasife alınır. Tür sonradan değişmez.
 * Yazma `Clinics.Update` ve salt okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-appointment-resources-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        DialogUnsavedChangesDirective,
        DialogFocusReturnDirective,
        InputTextModule,
        MessageModule,
        SelectModule,
        SelectButtonModule,
        TableModule,
        AppPageHeaderComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppLoadingStateComponent,
        AppStatusTagComponent,
        FormSubmitDirective,
        FormErrorSummaryComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Oda ve cihazlar"
            description="Randevuya atanan muayene odası, ameliyathane, röntgen, ultrason gibi kaynaklar. Takvimde ayrı sütun olurlar; aynı kaynağa kapasitesinden fazla randevu verilemez."
        />

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle oda ve cihaz yönetimi salt okunur.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status">Oda ve cihazları yalnız klinik yönetim yetkisi olan kullanıcı düzenler; liste salt okunurdur.</p>
        }

        <div class="card">
            <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
                @if (clinicOptions().length > 1) {
                    <div class="flex flex-col gap-1 w-full md:max-w-sm">
                        <label for="resourcesClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                        <p-select inputId="resourcesClinic" [options]="clinicOptions()" [ngModel]="clinicId()" (ngModelChange)="clinicId.set($event)" optionLabel="label" optionValue="value" class="w-full" />
                    </div>
                }
                @if (canWrite()) {
                    <button pButton type="button" class="ml-auto" data-testid="resource-new" (click)="open(null)"><i class="pi pi-plus"></i>Yeni oda ya da cihaz</button>
                }
            </div>

            @if (listActionError()) {
                <p class="text-danger text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
            }

            @if (!clinicId()) {
                <app-empty-state message="Aktif klinik bulunamadı." hint="Klinik seçimi yapıp yeniden deneyin." />
            } @else if (loading()) {
                <app-loading-state message="Oda ve cihazlar yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (resources().length === 0) {
                <app-empty-state
                    message="Bu klinikte tanımlı oda ya da cihaz yok."
                    [hint]="canWrite() ? 'Ameliyathane, röntgen gibi aynı anda tek randevuda kullanılabilen kaynakları ekleyin. Eklemezseniz takvim yalnız hekim sütunlarıyla kalır.' : ''"
                />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="resources()" [tableStyle]="{ 'min-width': '36rem' }">
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th style="width: 7rem">Tür</th>
                                <th style="width: 9rem">Aynı anda</th>
                                <th style="width: 7rem">Durum</th>
                                @if (canWrite()) {
                                    <th style="min-width: 10rem">İşlem</th>
                                }
                            </tr>
                        </ng-template>
                        <ng-template #body let-r>
                            <tr data-testid="resource-row">
                                <td class="font-medium" [class.text-muted-color]="!r.isActive">
                                    <i class="pi mr-2 text-muted-color" [class]="typeIcon(r.type)" aria-hidden="true"></i>{{ r.name }}
                                </td>
                                <td>{{ typeLabel(r.type) }}</td>
                                <td>{{ r.capacity === 1 ? '1 randevu' : r.capacity + ' randevu' }}</td>
                                <td><app-status-tag [label]="r.isActive ? 'Aktif' : 'Pasif'" [severity]="r.isActive ? 'success' : 'warn'" /></td>
                                @if (canWrite()) {
                                    <td>
                                        <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="open(r)">Düzenle</button>
                                            @if (r.isActive) {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-red-600 dark:text-red-400" [disabled]="mutating()" (click)="confirmDeactivate(r)">Pasife al</button>
                                            } @else {
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="setActive(r, true)">Etkinleştir</button>
                                            }
                                        </div>
                                    </td>
                                }
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <p-dialog
            [appUnsavedChanges]="form.dirty"
            [header]="editing() ? 'Oda ya da cihazı düzenle' : 'Yeni oda ya da cihaz'"
            [modal]="true"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [style]="{ width: 'min(30rem, 95vw)' }"
            [draggable]="false"
        >
            <form appFormSubmit [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                <app-form-error-summary />
                @if (dialogError()) {
                    <p-message severity="error" class="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <span id="resourceTypeLabel" class="block text-sm font-medium text-muted-color">Tür *</span>
                    <p-selectbutton formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="resourceTypeLabel" />
                    @if (editing()) {
                        <small class="text-muted-color">Tür sonradan değiştirilemez.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="resourceName" class="block text-sm font-medium text-muted-color">Ad *</label>
                    <input id="resourceName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" [maxlength]="nameMax" [placeholder]="form.controls.type.value === 'Room' ? 'Ör. Ameliyathane' : 'Ör. Ultrason'" />
                    @if (form.controls.name.invalid && form.controls.name.touched) {
                        <small class="text-danger">Ad zorunludur.</small>
                    }
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="resourceCapacity" class="block text-sm font-medium text-muted-color">Aynı anda en çok *</label>
                        <input id="resourceCapacity" pInputText class="w-full" type="number" step="1" [min]="capacityMin" [max]="capacityMax" formControlName="capacity" />
                        @if (form.controls.capacity.invalid && form.controls.capacity.touched) {
                            <small class="text-danger">{{ capacityMin }}–{{ capacityMax }} arasında olmalıdır.</small>
                        } @else {
                            <small class="text-muted-color">Çoğu oda ve cihaz için 1.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="resourceSortOrder" class="block text-sm font-medium text-muted-color">Sıra</label>
                        <input id="resourceSortOrder" pInputText class="w-full" type="number" step="1" formControlName="sortOrder" />
                    </div>
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class AppointmentResourcesPageComponent implements OnInit {
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly nameMax = APPOINTMENT_RESOURCE_NAME_MAX;
    readonly capacityMin = APPOINTMENT_RESOURCE_CAPACITY_MIN;
    readonly capacityMax = APPOINTMENT_RESOURCE_CAPACITY_MAX;
    readonly typeOptions = (Object.keys(APPOINTMENT_RESOURCE_TYPE_LABELS) as AppointmentResourceType[]).map((value) => ({ value, label: APPOINTMENT_RESOURCE_TYPE_LABELS[value] }));

    private readonly service = inject(AppointmentResourcesService);
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly resources = signal<AppointmentResourceVm[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutating = signal(false);

    readonly dialogVisible = signal(false);
    readonly editing = signal<AppointmentResourceVm | null>(null);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly form = this.fb.group({
        type: this.fb.nonNullable.control<AppointmentResourceType>('Room'),
        name: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(APPOINTMENT_RESOURCE_NAME_MAX)]),
        capacity: this.fb.nonNullable.control(1, [Validators.required, Validators.min(APPOINTMENT_RESOURCE_CAPACITY_MIN), Validators.max(APPOINTMENT_RESOURCE_CAPACITY_MAX)]),
        sortOrder: this.fb.control<number | null>(0)
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

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((c) => c.isActive !== false || c.id === active).map((c) => ({ value: c.id, label: c.name }));

                if (active && !options.some((o) => o.value === active)) {
                    options.unshift({ value: active, label: this.auth.getClinicName() ?? active });
                }

                this.clinicOptions.set(options);

                if (!this.clinicId() && options.length > 0) {
                    this.clinicId.set(options[0].value);
                }
            },
            error: () => undefined
        });
    }

    typeLabel(type: AppointmentResourceType): string {
        return APPOINTMENT_RESOURCE_TYPE_LABELS[type];
    }

    typeIcon(type: AppointmentResourceType): string {
        return type === 'Room' ? 'pi-building' : 'pi-wrench';
    }

    reload(): void {
        const clinicId = this.clinicId();
        const seq = ++this.loadSeq;

        if (!clinicId) {
            this.resources.set([]);
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.service.list(clinicId).subscribe({
            next: (list) => {
                if (seq === this.loadSeq) {
                    this.resources.set(list);
                    this.loading.set(false);
                }
            },
            error: (e: unknown) => {
                if (seq === this.loadSeq) {
                    this.error.set(e instanceof Error ? e.message : 'Oda ve cihazlar yüklenemedi.');
                    this.loading.set(false);
                }
            }
        });
    }

    open(resource: AppointmentResourceVm | null): void {
        if (!this.canWrite()) {
            return;
        }

        this.editing.set(resource);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.form.reset({
            type: resource?.type ?? 'Room',
            name: resource?.name ?? '',
            capacity: resource?.capacity ?? 1,
            sortOrder: resource?.sortOrder ?? this.resources().reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1
        });

        if (resource) {
            this.form.controls.type.disable();
        } else {
            this.form.controls.type.enable();
        }

        this.dialogVisible.set(true);
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

        const value = this.form.getRawValue();
        const request = editing ? this.service.update(clinicId, editing.id, value) : this.service.create(clinicId, value);

        this.submitting.set(true);
        this.dialogError.set(null);
        request.subscribe({
            next: () => {
                this.submitting.set(false);
                this.form.markAsPristine();
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof AppointmentResourceError && e.isNotFound) {
                    this.form.markAsPristine();
                    this.dialogVisible.set(false);
                    this.listActionError.set(e.message);
                    this.reload();

                    return;
                }

                this.dialogError.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }

    confirmDeactivate(resource: AppointmentResourceVm): void {
        this.confirmation.confirm({
            header: 'Pasife al',
            message: `"${resource.name}" yeni randevuda seçilemez; mevcut randevular etkilenmez.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasife al',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setActive(resource, false)
        });
    }

    setActive(resource: AppointmentResourceVm, active: boolean): void {
        if (!this.canWrite() || this.mutating()) {
            return;
        }

        this.mutating.set(true);
        this.listActionError.set(null);
        this.service.setActive(this.clinicId(), resource.id, active).subscribe({
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
}
