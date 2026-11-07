import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { VACCINE_DEFINITIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import type { VaccineDefinitionListItemVm } from '@/app/entities/vaccine-definition/models/vaccine-definition-vm.model';
import { VaccineDefinitionsService } from '@/app/entities/vaccine-definition/services/vaccine-definitions.service';
import {
    VACCINATION_SCHEDULE_LIMITS as LIMITS,
    vaccinationScheduleSummary,
    type VaccinationScheduleItemBody,
    type VaccinationScheduleItemDto
} from '@/app/entities/vaccination-schedule/models/vaccination-schedule.model';
import { VaccinationScheduleService } from '@/app/entities/vaccination-schedule/services/vaccination-schedule.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/**
 * Aşı takvimi (TIER-005, `VACCINATION_SCHEDULE_API_CONTRACT.md` §2), Tanımlar altında: tür + aşı satırları; hasta kartındaki
 * aşı planı önerisi buradan hesaplanır. Başlangıç şablonu yalnız istenince yüklenir ve düzenlenir; tıbbi tavsiye değildir.
 * Pakette yoksa "üst pakete geç" kutusu çıkar. Yazma `VaccineDefinitions.Update` ve salt okunur kiracı durumuna bağlıdır.
 */
@Component({
    selector: 'app-vaccination-schedule-page',
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
        AppPlanUpgradeNoticeComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppLoadingStateComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Aşı takvimi"
            description="Türe göre hangi aşının kaçıncı haftada başlayıp kaç doz yapılacağı ve ne sıklıkla tekrarlanacağı. Hasta kartındaki aşı planı önerisi bu takvimden hesaplanır; hekim onaylamadan kayıt oluşmaz."
        />

        <div class="card">
            @if (planLocked()) {
                <app-plan-upgrade-notice feature="VaccinationWizard" detail="Kliniğinizin aşı takvimini tanımlayın; yavru ya da yeni gelen hasta için kalan dozlar tek tıkla önerilsin, hekim onaylasın. Aşı kaydı ve planlı aşı her pakette açıktır." />
            } @else {
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">Abonelik durumu nedeniyle aşı takvimi salt okunur.</p>
                } @else if (!canManage) {
                    <p class="text-sm text-muted-color mt-0 mb-4" role="status">Takvimi yalnız aşı tanımı yönetim yetkisi olan kullanıcı düzenler; liste salt okunurdur.</p>
                }

                <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div class="flex flex-col gap-1 w-full md:max-w-xs">
                        <label for="scheduleSpecies" class="text-sm font-medium text-muted-color">Tür</label>
                        <p-select inputId="scheduleSpecies" [options]="speciesFilterOptions()" [ngModel]="speciesFilter()" (ngModelChange)="speciesFilter.set($event)" optionLabel="label" optionValue="value" class="w-full" />
                    </div>
                    @if (canWrite()) {
                        <div class="flex flex-wrap gap-2">
                            <button pButton type="button" class="p-button-outlined p-button-secondary" data-testid="schedule-template" [disabled]="mutating()" (click)="confirmTemplate()"><i class="pi pi-download"></i>Başlangıç şablonunu yükle</button>
                            <button pButton type="button" data-testid="schedule-new" [disabled]="mutating()" (click)="openCreate()"><i class="pi pi-plus"></i>Yeni satır</button>
                        </div>
                    }
                </div>

                @if (notice(); as n) {
                    <p class="text-sm mt-0 mb-3" role="status" data-testid="schedule-notice">{{ n }}</p>
                }
                @if (listActionError(); as err) {
                    <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ err }}</p>
                }

                @if (loading()) {
                    <app-loading-state message="Aşı takvimi yükleniyor…" />
                } @else if (error(); as err) {
                    <app-error-state [detail]="err" (retry)="reload()" />
                } @else if (visibleItems().length === 0) {
                    <app-empty-state
                        message="Takvimde satır yok."
                        [hint]="canWrite() ? 'Satırları tek tek ekleyin ya da başlangıç şablonunu yükleyip kliniğinize göre düzenleyin.' : ''"
                    />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="visibleItems()" [tableStyle]="{ 'min-width': '44rem' }">
                            <ng-template #header>
                                <tr>
                                    <th style="width: 8rem">Tür</th>
                                    <th>Aşı</th>
                                    <th>Takvim</th>
                                    <th>Not</th>
                                    @if (canWrite()) {
                                        <th style="min-width: 8rem">İşlem</th>
                                    }
                                </tr>
                            </ng-template>
                            <ng-template #body let-item>
                                <tr data-testid="schedule-row">
                                    <td>{{ item.speciesName }}</td>
                                    <td class="font-medium">
                                        {{ item.vaccineName }}
                                        @if (!item.vaccineIsActive) {
                                            <span class="text-sm text-amber-700 dark:text-amber-300 font-normal"> · pasif, önerilmez</span>
                                        }
                                    </td>
                                    <td class="text-sm">{{ summary(item) }}</td>
                                    <td class="text-sm text-muted-color">{{ item.notes ?? '' }}</td>
                                    @if (canWrite()) {
                                        <td>
                                            <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-primary" [disabled]="mutating()" (click)="openEdit(item)">Düzenle</button>
                                                <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium disabled:opacity-50 text-red-600 dark:text-red-400" [disabled]="mutating()" (click)="confirmDelete(item)">Sil</button>
                                            </div>
                                        </td>
                                    }
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            }
        </div>

        <p-dialog [header]="editing() ? 'Takvim satırını düzenle' : 'Yeni takvim satırı'" [modal]="true" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [style]="{ width: 'min(34rem, 95vw)' }" [draggable]="false">
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (dialogError(); as err) {
                    <p-message severity="error" class="w-full" role="alert">{{ err }}</p-message>
                }
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="itemSpecies" class="block text-sm font-medium text-muted-color">Tür *</label>
                        <p-select inputId="itemSpecies" [options]="speciesOptions()" formControlName="speciesId" optionLabel="label" optionValue="value" placeholder="Seçin" class="w-full" (onChange)="form.controls.vaccineDefinitionId.setValue('')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="itemVaccine" class="block text-sm font-medium text-muted-color">Aşı *</label>
                        <p-select inputId="itemVaccine" [options]="vaccineOptions()" formControlName="vaccineDefinitionId" optionLabel="label" optionValue="value" placeholder="Seçin" [filter]="true" class="w-full" />
                    </div>
                </div>
                @if (editing()) {
                    <small class="text-muted-color -mt-2">Tür ve aşı değişmez; değiştirmek için satırı silip yenisini ekleyin.</small>
                }
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="itemStart" class="block text-sm font-medium text-muted-color">İlk doz yaşı (hafta) *</label>
                        <input id="itemStart" pInputText class="w-full" type="number" min="0" [max]="limits.maxStartAgeWeeks" formControlName="startAgeWeeks" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="itemDoses" class="block text-sm font-medium text-muted-color">Temel seri doz sayısı *</label>
                        <input id="itemDoses" pInputText class="w-full" type="number" min="1" [max]="limits.maxDoseCount" formControlName="doseCount" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="itemInterval" class="block text-sm font-medium text-muted-color">Doz aralığı (hafta){{ multiDose() ? ' *' : '' }}</label>
                        <input id="itemInterval" pInputText class="w-full" type="number" min="1" [max]="limits.maxDoseIntervalWeeks" formControlName="doseIntervalWeeks" [placeholder]="multiDose() ? '' : 'Tek dozda gerekmez'" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="itemRepeat" class="block text-sm font-medium text-muted-color">Tekrar aralığı (ay)</label>
                        <input id="itemRepeat" pInputText class="w-full" type="number" min="1" [max]="limits.maxRepeatIntervalMonths" formControlName="repeatIntervalMonths" placeholder="Tekrar yok" />
                    </div>
                </div>
                <small class="text-muted-color -mt-2">{{ formSummary() }}</small>
                @if (form.invalid && form.touched) {
                    <small class="text-red-500">Başlangıç 0–{{ limits.maxStartAgeWeeks }} hafta, doz 1–{{ limits.maxDoseCount }}, aralık 1–{{ limits.maxDoseIntervalWeeks }} hafta (birden fazla dozda zorunlu), tekrar 1–{{ limits.maxRepeatIntervalMonths }} ay olmalıdır.</small>
                }
                <div class="flex flex-col gap-1">
                    <label for="itemNotes" class="block text-sm font-medium text-muted-color">Not</label>
                    <input id="itemNotes" pInputText class="w-full" type="text" formControlName="notes" autocomplete="off" [maxlength]="limits.notesMaxLength" />
                </div>
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <button pButton type="button" severity="secondary" (click)="dialogVisible.set(false)" [disabled]="submitting()">{{ copy.buttonCancel }}</button>
                    <button pButton type="submit" data-testid="schedule-save" [disabled]="form.invalid || submitting()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                </div>
            </form>
        </p-dialog>

        <p-confirmdialog [style]="{ width: 'min(480px, 95vw)' }" />
    `
})
export class VaccinationSchedulePageComponent implements OnInit {
    readonly definitionsRoute = DEFINITIONS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly limits = LIMITS;
    readonly summary = vaccinationScheduleSummary;

    private readonly schedule = inject(VaccinationScheduleService);
    private readonly speciesService = inject(SpeciesService);
    private readonly vaccines = inject(VaccineDefinitionsService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManage = this.auth.hasOperationClaim(VACCINE_DEFINITIONS_UPDATE_CLAIM);
    readonly canWrite = computed(() => this.canManage && !this.ro.mutationBlocked());
    readonly planLocked = computed(() => this.ro.lockedPlanFeature('VaccinationWizard') !== null);

    readonly items = signal<VaccinationScheduleItemDto[]>([]);
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly vaccineList = signal<readonly VaccineDefinitionListItemVm[]>([]);
    readonly speciesFilter = signal('');
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);
    readonly notice = signal<string | null>(null);
    readonly mutating = signal(false);

    readonly dialogVisible = signal(false);
    readonly editing = signal<VaccinationScheduleItemDto | null>(null);
    readonly submitting = signal(false);
    readonly dialogError = signal<string | null>(null);

    readonly form = this.fb.group({
        speciesId: this.fb.nonNullable.control('', Validators.required),
        vaccineDefinitionId: this.fb.nonNullable.control('', Validators.required),
        startAgeWeeks: this.fb.nonNullable.control(8, [Validators.required, Validators.min(0), Validators.max(LIMITS.maxStartAgeWeeks)]),
        doseCount: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1), Validators.max(LIMITS.maxDoseCount)]),
        doseIntervalWeeks: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(LIMITS.maxDoseIntervalWeeks)]),
        repeatIntervalMonths: this.fb.control<number | null>(12, [Validators.min(1), Validators.max(LIMITS.maxRepeatIntervalMonths)]),
        notes: this.fb.control<string | null>(null, Validators.maxLength(LIMITS.notesMaxLength))
    });

    /** Ham değer (devre dışı tür/aşı dahil); sıfırlama ve devre dışı bırakma da yayın yapar. */
    private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), { initialValue: this.form.getRawValue() });

    readonly multiDose = computed(() => Number(this.formValue().doseCount) > 1);
    readonly formSummary = computed(() => {
        const v = this.formValue();

        return vaccinationScheduleSummary({
            startAgeWeeks: Number(v.startAgeWeeks) || 0,
            doseCount: Number(v.doseCount) || 1,
            doseIntervalWeeks: v.doseIntervalWeeks,
            repeatIntervalMonths: v.repeatIntervalMonths
        });
    });

    readonly speciesFilterOptions = computed<SelectOption[]>(() => [{ value: '', label: 'Tüm türler' }, ...this.speciesOptions()]);
    readonly visibleItems = computed(() => {
        const species = this.speciesFilter();

        return species ? this.items().filter((i) => i.speciesId === species) : this.items();
    });
    /** Türe uyan aktif aşılar (türsüz tanım her türe uyar); düzenlemede mevcut aşı listede kalır. */
    readonly vaccineOptions = computed<SelectOption[]>(() => {
        const species = this.formValue().speciesId;
        const editing = this.editing();
        const options = this.vaccineList()
            .filter((v) => v.isActive && (!v.speciesId || v.speciesId === species))
            .map((v) => ({ value: v.id, label: v.name }));

        return editing && !options.some((o) => o.value === editing.vaccineDefinitionId)
            ? [{ value: editing.vaccineDefinitionId, label: editing.vaccineName }, ...options]
            : options;
    });

    ngOnInit(): void {
        this.reload();
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (list) => this.speciesOptions.set(list.map((s) => ({ value: s.id, label: s.name }))),
            error: () => this.speciesOptions.set([])
        });
        this.vaccines.getVaccineDefinitions().subscribe({
            next: (page) => this.vaccineList.set(page.items),
            error: () => this.vaccineList.set([])
        });
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.schedule.getSchedule().subscribe({
            next: (dto) => {
                this.items.set([...dto.items]);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.loading.set(false);
            }
        });
    }

    openCreate(): void {
        this.open(null);
    }

    openEdit(item: VaccinationScheduleItemDto): void {
        this.open(item);
    }

    submit(): void {
        const editing = this.editing();

        if (this.submitting()) {
            return;
        }

        if (this.form.invalid || (this.multiDose() && !this.form.controls.doseIntervalWeeks.value)) {
            this.form.markAllAsTouched();
            this.dialogError.set(this.multiDose() && !this.form.controls.doseIntervalWeeks.value ? 'Birden fazla dozda doz aralığı zorunludur.' : null);

            return;
        }

        const v = this.form.getRawValue();
        const body: VaccinationScheduleItemBody = {
            speciesId: v.speciesId,
            vaccineDefinitionId: v.vaccineDefinitionId,
            startAgeWeeks: Number(v.startAgeWeeks),
            doseCount: Number(v.doseCount),
            doseIntervalWeeks: this.multiDose() ? Number(v.doseIntervalWeeks) : null,
            repeatIntervalMonths: v.repeatIntervalMonths ? Number(v.repeatIntervalMonths) : null,
            notes: v.notes?.trim() || null
        };

        this.submitting.set(true);
        this.dialogError.set(null);
        (editing ? this.schedule.updateItem(editing.id, body) : this.schedule.createItem(body)).subscribe({
            next: () => {
                this.submitting.set(false);
                this.dialogVisible.set(false);
                this.notice.set(null);
                this.reload();
            },
            error: (e: Error) => {
                this.submitting.set(false);
                this.dialogError.set(e.message);
            }
        });
    }

    confirmDelete(item: VaccinationScheduleItemDto): void {
        this.confirmation.confirm({
            header: 'Takvim satırını sil',
            message: `${item.speciesName} için "${item.vaccineName}" takvimden çıkar ve artık önerilmez. Daha önce planlanmış aşılar etkilenmez.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sil',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.delete(item)
        });
    }

    confirmTemplate(): void {
        this.confirmation.confirm({
            header: 'Başlangıç şablonunu yükle',
            message:
                'Kedi ve köpek için yaygın uygulamadan derlenmiş genel bir başlangıç takvimi eklenir. Tıbbi tavsiye değildir; kliniğinizin hekimleri gözden geçirip düzenlemelidir. Takvimde zaten olan tür + aşı satırlarına dokunulmaz.',
            icon: 'pi pi-info-circle',
            acceptLabel: 'Yükle',
            rejectLabel: 'Vazgeç',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.loadTemplate()
        });
    }

    delete(item: VaccinationScheduleItemDto): void {
        if (!this.canWrite() || this.mutating()) {
            return;
        }

        this.mutating.set(true);
        this.listActionError.set(null);
        this.notice.set(null);
        this.schedule.deleteItem(item.id).subscribe({
            next: () => {
                this.mutating.set(false);
                this.items.update((rows) => rows.filter((r) => r.id !== item.id));
            },
            error: (e: Error) => {
                this.mutating.set(false);
                this.listActionError.set(e.message);
            }
        });
    }

    loadTemplate(): void {
        if (!this.canWrite() || this.mutating()) {
            return;
        }

        this.mutating.set(true);
        this.listActionError.set(null);
        this.schedule.loadStarterTemplate().subscribe({
            next: (result) => {
                this.mutating.set(false);
                this.items.set([...result.schedule.items]);
                this.notice.set(
                    result.addedCount > 0
                        ? `${result.addedCount} satır eklendi. Kliniğinizin uygulamasına göre gözden geçirip düzenleyin.`
                        : 'Şablondaki tüm satırlar takvimde zaten var; değişiklik yapılmadı.'
                );
            },
            error: (e: Error) => {
                this.mutating.set(false);
                this.listActionError.set(e.message);
            }
        });
    }

    private open(item: VaccinationScheduleItemDto | null): void {
        if (!this.canWrite()) {
            return;
        }

        this.editing.set(item);
        this.dialogError.set(null);
        this.listActionError.set(null);
        this.form.reset({
            speciesId: item?.speciesId ?? (this.speciesFilter() || ''),
            vaccineDefinitionId: item?.vaccineDefinitionId ?? '',
            startAgeWeeks: item?.startAgeWeeks ?? 8,
            doseCount: item?.doseCount ?? 1,
            doseIntervalWeeks: item?.doseIntervalWeeks ?? null,
            repeatIntervalMonths: item ? item.repeatIntervalMonths : 12,
            notes: item?.notes ?? null
        });

        if (item) {
            this.form.controls.speciesId.disable();
            this.form.controls.vaccineDefinitionId.disable();
        } else {
            this.form.controls.speciesId.enable();
            this.form.controls.vaccineDefinitionId.enable();
        }

        this.dialogVisible.set(true);
    }
}
