import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import {
    HOSPITALIZATION_LOCATION_NAME_MAX,
    type HospitalizationLocationFormValue,
    type HospitalizationRoomVm,
    type HospitalizationWardVm
} from '@/app/features/hospitalization-wards/models/hospitalization-ward-vm.model';
import { HospitalizationWardsService } from '@/app/features/hospitalization-wards/services/hospitalization-wards.service';
import { HospitalizationWardError } from '@/app/features/hospitalization-wards/utils/hospitalization-ward-error.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Tanım penceresinin hedefi: yeni/düzenlenen bölüm ya da bir bölümün yeni/düzenlenen odası. */
type DialogTarget =
    | { kind: 'ward'; editing: HospitalizationWardVm | null }
    | { kind: 'room'; ward: HospitalizationWardVm; editing: HospitalizationRoomVm | null };

/**
 * Yatış konumları (HOSP-002, sözleşme §10.6), Tanımlar altında: klinik seçilir, bölümler ve altındaki odalar aktif/pasif hepsiyle
 * listelenir. Silme yoktur; pasife alınan tanım yeni yatışa seçilemez, mevcut yatışlar etkilenmez. Yazma `Clinics.Update` ve
 * salt okunur kiracı durumuna bağlıdır; yalnız okuyan kullanıcı listeyi görür.
 */
@Component({
    selector: 'app-hospitalization-wards-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Yatış konumları"
            description="Yatış formunda seçilen bölümler (ör. Yoğun bakım, Kedi servisi) ve altındaki oda/kafesler. Tanımlar kliniğe özeldir; silinmez, pasife alınır."
        >
            @if (canWrite() && clinicId()) {
                <button actions pButton type="button" data-testid="ward-new" (click)="openWardCreate()"><i class="pi pi-plus"></i>Yeni bölüm</button>
            }
        </app-page-header>

        @if (ro.mutationBlocked()) {
            <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle yatış konumu yönetimi salt okunur.</p>
        } @else if (!canManage) {
            <p class="text-sm text-muted-color mb-4 m-0" role="status" data-testid="wards-read-only">
                Tanımları yalnız klinik yönetim yetkisi olan kullanıcı düzenler; liste salt okunurdur.
            </p>
        }

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                @if (clinicOptions().length > 1) {
                    <div class="flex flex-col gap-1 w-full md:max-w-sm">
                        <label for="wardsClinic" class="text-sm font-medium text-muted-color">Klinik</label>
                        <p-select
                            inputId="wardsClinic"
                            [options]="clinicOptions()"
                            [ngModel]="clinicId()"
                            (ngModelChange)="onClinicChange($event)"
                            optionLabel="label"
                            optionValue="value"
                            class="w-full"
                            data-testid="wards-clinic"
                        />
                    </div>
                } @else {
                    <p class="text-sm text-muted-color m-0">Klinik: {{ clinicLabel() }}</p>
                }
            </div>

            @if (listActionError()) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ listActionError() }}</p>
            }

            @if (!clinicId()) {
                <app-empty-state message="Aktif klinik bulunamadı." hint="Klinik seçimi yapıp yeniden deneyin." />
            } @else if (loading()) {
                <app-loading-state message="Yatış konumları yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (wards().length === 0) {
                <app-empty-state message="Bu klinikte tanımlı bölüm yok." [hint]="canWrite() ? 'Önce bir bölüm ekleyin, sonra altına oda/kafes tanımlayın.' : ''" />
            } @else {
                @for (ward of wards(); track ward.id) {
                    <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-4 last:mb-0" data-testid="ward-row">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                            <h5 class="m-0" [class.text-muted-color]="!ward.isActive">{{ ward.name }}</h5>
                            <app-status-tag [label]="ward.isActive ? 'Aktif' : 'Pasif'" [severity]="ward.isActive ? 'success' : 'warn'" />
                            <span class="text-sm text-muted-color">Sıra {{ ward.sortOrder }}</span>
                            @if (canWrite()) {
                                <div class="ml-auto flex flex-wrap gap-x-3 gap-y-1 items-center">
                                    <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="openRoomCreate(ward)">Oda ekle</button>
                                    <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="openWardEdit(ward)">Düzenle</button>
                                    @if (ward.isActive) {
                                        <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-red-600 dark:text-red-400" [disabled]="mutating()" (click)="confirmDeactivateWard(ward)">Pasife al</button>
                                    } @else {
                                        <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="setWardActive(ward, true)">Etkinleştir</button>
                                    }
                                </div>
                            }
                        </div>
                        @if (ward.rooms.length === 0) {
                            <p class="text-sm text-muted-color m-0">Bu bölümde oda/kafes yok.</p>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table [value]="ward.rooms" [tableStyle]="{ 'min-width': '30rem' }">
                                    <ng-template #header>
                                        <tr>
                                            <th>Oda / kafes</th>
                                            <th style="width: 6rem">Sıra</th>
                                            <th style="width: 7rem">Durum</th>
                                            @if (canWrite()) {
                                                <th style="min-width: 10rem">İşlem</th>
                                            }
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-room>
                                        <tr data-testid="room-row">
                                            <td class="font-medium" [class.text-muted-color]="!room.isActive">{{ room.name }}</td>
                                            <td>{{ room.sortOrder }}</td>
                                            <td>
                                                <app-status-tag [label]="room.isActive ? 'Aktif' : 'Pasif'" [severity]="room.isActive ? 'success' : 'warn'" />
                                            </td>
                                            @if (canWrite()) {
                                                <td>
                                                    <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                        <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="openRoomEdit(ward, room)">Düzenle</button>
                                                        @if (room.isActive) {
                                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-red-600 dark:text-red-400" [disabled]="mutating()" (click)="confirmDeactivateRoom(ward, room)">Pasife al</button>
                                                        } @else {
                                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="setRoomActive(ward, room, true)">Etkinleştir</button>
                                                        }
                                                    </div>
                                                </td>
                                            }
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </section>
                }
            }
        </div>

        <p-dialog [header]="dialogTitle()" [modal]="true" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [style]="{ width: 'min(28rem, 95vw)' }" [draggable]="false">
            <form [formGroup]="dialogForm" (ngSubmit)="submitDialog()" class="flex flex-col gap-4">
                @if (dialogError()) {
                    <p-message severity="error" class="w-full" role="alert">{{ dialogError() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="locationName" class="block text-sm font-medium text-muted-color">Ad *</label>
                    <input id="locationName" pInputText class="w-full" type="text" formControlName="name" autocomplete="off" [maxlength]="nameMax" />
                    @if (dialogForm.controls.name.invalid && dialogForm.controls.name.touched) {
                        <small class="text-red-500">Ad zorunludur.</small>
                    }
                    @if (dialogTarget()?.editing) {
                        <small class="text-muted-color">Yeni ad mevcut yatışlarda da görünür; atama anında yazılan konum metni değişmez.</small>
                    }
                </div>
                <div class="flex flex-col gap-1">
                    <label for="locationSortOrder" class="block text-sm font-medium text-muted-color">Sıra</label>
                    <input id="locationSortOrder" pInputText class="w-full" type="number" step="1" formControlName="sortOrder" />
                    <small class="text-muted-color">Listede ve yatış formunda küçükten büyüğe sıralanır.</small>
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" [disabled]="dialogForm.invalid || submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class HospitalizationWardsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly nameMax = HOSPITALIZATION_LOCATION_NAME_MAX;

    private readonly wardsService = inject(HospitalizationWardsService);
    private readonly clinics = inject(ClinicsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());

    readonly clinicId = signal('');
    readonly clinicOptions = signal<SelectOption[]>([]);
    readonly clinicLabel = computed(() => this.clinicOptions().find((o) => o.value === this.clinicId())?.label ?? this.auth.getClinicName() ?? this.clinicId() ?? 'Belirlenmedi');

    readonly wards = signal<HospitalizationWardVm[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly mutating = signal(false);

    readonly dialogVisible = signal(false);
    readonly dialogTarget = signal<DialogTarget | null>(null);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);
    readonly dialogForm = this.fb.group({
        name: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(HOSPITALIZATION_LOCATION_NAME_MAX)]),
        sortOrder: this.fb.control<number | null>(0)
    });

    readonly dialogTitle = computed(() => {
        const target = this.dialogTarget();

        if (!target) {
            return '';
        }

        if (target.kind === 'ward') {
            return target.editing ? 'Bölümü düzenle' : 'Yeni bölüm';
        }

        return target.editing ? `${target.ward.name} — odayı düzenle` : `${target.ward.name} — yeni oda/kafes`;
    });

    /** Yükleme sırası değişince eski yanıt uygulanmaz (klinik hızlı değiştirildiğinde). */
    private loadSeq = 0;

    ngOnInit(): void {
        const active = this.auth.getClinicId()?.trim() ?? '';

        this.clinicId.set(active);
        this.clinicOptions.set(active ? [{ value: active, label: this.auth.getClinicName() ?? active }] : []);
        this.reload();
        this.clinics.listClinics().subscribe({
            next: (list) => {
                const options = list.filter((c) => c.isActive !== false || c.id === active).map((c) => ({ value: c.id, label: c.name }));

                if (active && !options.some((o) => o.value === active)) {
                    options.unshift({ value: active, label: this.auth.getClinicName() ?? active });
                }

                this.clinicOptions.set(options);

                if (!this.clinicId() && options.length > 0) {
                    this.onClinicChange(options[0].value);
                }
            },
            // Klinik rehberi okunamazsa (ör. yalnız Hospitalizations.Read) aktif klinikle devam edilir.
            error: () => undefined
        });
    }

    onClinicChange(clinicId: string): void {
        if (clinicId === this.clinicId()) {
            return;
        }

        this.clinicId.set(clinicId);
        this.listActionError.set(null);
        this.reload();
    }

    reload(): void {
        const clinicId = this.clinicId();
        const seq = ++this.loadSeq;

        if (!clinicId) {
            this.wards.set([]);
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.wardsService.listWards(clinicId).subscribe({
            next: (wards) => {
                if (seq !== this.loadSeq) {
                    return;
                }

                this.wards.set(wards);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                if (seq !== this.loadSeq) {
                    return;
                }

                this.error.set(e instanceof Error ? e.message : 'Yatış konumları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    openWardCreate(): void {
        this.openDialog({ kind: 'ward', editing: null }, nextSortOrder(this.wards()));
    }

    openWardEdit(ward: HospitalizationWardVm): void {
        this.openDialog({ kind: 'ward', editing: ward }, ward.sortOrder, ward.name);
    }

    openRoomCreate(ward: HospitalizationWardVm): void {
        this.openDialog({ kind: 'room', ward, editing: null }, nextSortOrder(ward.rooms));
    }

    openRoomEdit(ward: HospitalizationWardVm, room: HospitalizationRoomVm): void {
        this.openDialog({ kind: 'room', ward, editing: room }, room.sortOrder, room.name);
    }

    submitDialog(): void {
        const target = this.dialogTarget();
        const clinicId = this.clinicId();

        if (!target || !clinicId || this.submitting()) {
            return;
        }

        if (this.dialogForm.invalid) {
            this.dialogForm.markAllAsTouched();

            return;
        }

        const value = this.dialogForm.getRawValue();

        this.submitting.set(true);
        this.dialogError.set(null);
        this.writeRequest(target, clinicId, value).subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HospitalizationWardError && e.isNotFound) {
                    // Tanım bu arada kaldırılmış/değişmiş: pencere kapanır, liste yenilenir.
                    this.dialogVisible.set(false);
                    this.listActionError.set(e.message);
                    this.reload();

                    return;
                }

                this.dialogError.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }

    confirmDeactivateWard(ward: HospitalizationWardVm): void {
        this.confirmation.confirm({
            header: 'Bölümü pasife al',
            message: `"${ward.name}" ve odaları yeni yatışa seçilemez; mevcut yatışlar etkilenmez. Bölümü sonra yeniden etkinleştirebilirsiniz.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasife al',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setWardActive(ward, false)
        });
    }

    confirmDeactivateRoom(ward: HospitalizationWardVm, room: HospitalizationRoomVm): void {
        this.confirmation.confirm({
            header: 'Odayı pasife al',
            message: `"${ward.name} / ${room.name}" yeni yatışa seçilemez; bu odadaki mevcut yatışlar etkilenmez.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasife al',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.setRoomActive(ward, room, false)
        });
    }

    setWardActive(ward: HospitalizationWardVm, active: boolean): void {
        this.mutate(() => this.wardsService.setWardActive(this.clinicId(), ward.id, active));
    }

    setRoomActive(ward: HospitalizationWardVm, room: HospitalizationRoomVm, active: boolean): void {
        this.mutate(() => this.wardsService.setRoomActive(this.clinicId(), ward.id, room.id, active));
    }

    /** Yetki ve tek-işlem kilidi istek kurulmadan önce denetlenir. */
    private mutate(request: () => Observable<unknown>): void {
        if (!this.canWrite() || !this.clinicId() || this.mutating()) {
            return;
        }

        this.mutating.set(true);
        this.listActionError.set(null);
        request().subscribe({
            next: () => {
                this.mutating.set(false);
                this.reload();
            },
            error: (e: unknown) => {
                this.mutating.set(false);
                this.listActionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');

                if (e instanceof HospitalizationWardError && e.isNotFound) {
                    this.reload();
                }
            }
        });
    }

    private writeRequest(target: DialogTarget, clinicId: string, value: HospitalizationLocationFormValue): Observable<unknown> {
        if (target.kind === 'ward') {
            return target.editing ? this.wardsService.updateWard(clinicId, target.editing.id, value) : this.wardsService.createWard(clinicId, value);
        }

        return target.editing
            ? this.wardsService.updateRoom(clinicId, target.ward.id, target.editing.id, value)
            : this.wardsService.createRoom(clinicId, target.ward.id, value);
    }

    private openDialog(target: DialogTarget, sortOrder: number, name = ''): void {
        if (!this.canWrite()) {
            return;
        }

        this.dialogTarget.set(target);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.dialogForm.reset({ name, sortOrder });
        this.dialogVisible.set(true);
    }
}

/** Yeni tanım listenin sonuna gelir: en büyük sıranın bir fazlası (boş listede 1). */
function nextSortOrder(items: readonly { sortOrder: number }[]): number {
    return items.reduce((max, x) => Math.max(max, x.sortOrder), 0) + 1;
}
