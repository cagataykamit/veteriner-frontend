import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { VACCINATIONS_CREATE_CLAIM, VACCINE_DEFINITIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { VACCINATION_SCHEDULE_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import {
    VACCINATION_PLAN_SKIP_TEXT,
    vaccinationDoseLabel,
    type VaccinationPlanApplyItem,
    type VaccinationPlanDto,
    type VaccinationPlanSuggestionDto
} from '@/app/entities/vaccination-schedule/models/vaccination-schedule.model';
import { VaccinationScheduleService } from '@/app/entities/vaccination-schedule/services/vaccination-schedule.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { addGregorianDaysToYmd, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** Öneri satırı: hekim seçer ve tarihini değiştirebilir. */
export interface VaccinationPlanRow {
    readonly key: string;
    readonly suggestion: VaccinationPlanSuggestionDto;
    readonly selected: boolean;
    readonly dueDate: string;
}

/**
 * Hayvanın aşı planı (TIER-005, `VACCINATION_SCHEDULE_API_CONTRACT.md` §3–4): klinik takviminden kalan dozlar önerilir, hekim seçip
 * tarihini değiştirerek onaylar; onaylanan dozlar aktif klinikte planlı aşı kaydı olur (tümü ya da hiçbiri). Öneri tıbbi karar
 * değildir. Pakette yoksa "üst pakete geç" kutusu çıkar.
 */
@Component({
    selector: 'app-pet-vaccination-plan-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        TableModule,
        DateInputComponent,
        TrDatePipe,
        AppPageHeaderComponent,
        AppPlanUpgradeNoticeComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppLoadingStateComponent
    ],
    template: `
        <app-page-header [categoryLink]="['/panel/pets', petId]" categoryLinkLabel="Hasta kartına dön" [title]="title()" description="Kliniğinizin aşı takviminden hesaplanan kalan dozlar. Hekim kontrol edip onaylar; onaylanan dozlar planlı aşı olarak kaydedilir ve hatırlatılır." />

        <div class="card">
            @if (planLocked()) {
                <app-plan-upgrade-notice feature="VaccinationWizard" detail="Kliniğinizin aşı takviminden bu hayvanın kalan dozları önerilir, hekim onaylayınca planlı aşı olarak kaydedilir. Aşıyı elle planlamak her pakette açıktır." />
            } @else if (loading()) {
                <app-loading-state message="Aşı planı hesaplanıyor…" />
            } @else if (error(); as err) {
                <app-error-state [detail]="err" (retry)="reload()" />
            } @else if (plan(); as p) {
                @if (applied(); as count) {
                    <p class="mt-0 mb-4 font-medium" role="status" data-testid="plan-applied">
                        {{ count }} planlı aşı kaydedildi.
                        <a [routerLink]="['/panel/pets', petId]" class="text-primary ml-1">Hasta kartına dön</a>
                    </p>
                }

                @if (p.scheduleItemCount === 0) {
                    <app-empty-state [message]="(p.speciesName ?? 'Bu tür') + ' için aşı takvimi tanımlı değil.'" [hint]="canManageSchedule ? 'Tanımlar > Aşı takvimi sayfasından satır ekleyin ya da başlangıç şablonunu yükleyin.' : 'Takvimi kurum yöneticiniz tanımlar.'" />
                    @if (canManageSchedule) {
                        <a pButton [routerLink]="scheduleRoute" class="p-button-outlined p-button-secondary mt-3" data-testid="plan-schedule-link"><i class="pi pi-calendar"></i>Aşı takvimine git</a>
                    }
                } @else {
                    <p class="text-sm text-muted-color mt-0 mb-4">
                        {{ p.speciesName }} ·
                        @if (p.birthDate) {
                            Doğum tarihi {{ p.birthDate | trDate }}
                        } @else {
                            <span class="text-amber-700 dark:text-amber-300" data-testid="plan-no-birth-date">Doğum tarihi yok; ilk dozlar en erken güne önerildi.</span>
                        }
                    </p>

                    @if (rows().length === 0) {
                        <app-empty-state message="Önerilecek doz yok." hint="Takvimdeki aşılar planlı, tamamlanmış ya da aşağıda nedeni yazılı." />
                    } @else {
                        <div class="overflow-x-auto">
                            <p-table [value]="rows()" [tableStyle]="{ 'min-width': '40rem' }" dataKey="key">
                                <ng-template #header>
                                    <tr>
                                        <th style="width: 3rem"><span class="sr-only">Seç</span></th>
                                        <th>Aşı</th>
                                        <th style="width: 9rem">Doz</th>
                                        <th style="width: 13rem">Tarih</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr data-testid="plan-row">
                                        <td>
                                            <p-checkbox [inputId]="'pick-' + row.key" [binary]="true" [ngModel]="row.selected" (ngModelChange)="patch(row.key, { selected: $event })" [disabled]="!canApply() || saving()" [ariaLabel]="row.suggestion.vaccineName + ' seç'" />
                                        </td>
                                        <td>
                                            <label [for]="'pick-' + row.key" class="font-medium">{{ row.suggestion.vaccineName }}</label>
                                            @if (row.suggestion.isLate) {
                                                <div class="text-sm text-amber-700 dark:text-amber-300" data-testid="plan-row-late">Gecikmiş: takvime göre daha önce yapılmalıydı</div>
                                            }
                                        </td>
                                        <td class="text-sm">{{ doseLabel(row.suggestion.doseNumber, row.suggestion.doseCount) }}</td>
                                        <td>
                                            <app-date-input [inputId]="'due-' + row.key" [ngModel]="row.dueDate" (ngModelChange)="patch(row.key, { dueDate: $event })" [min]="minDate" limit="planned" />
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }

                    @if (p.skipped.length > 0) {
                        <h6 class="mt-5 mb-2 text-sm text-muted-color font-medium">Önerilmeyenler</h6>
                        <ul class="m-0 pl-4 text-sm flex flex-col gap-1" data-testid="plan-skipped">
                            @for (s of p.skipped; track s.scheduleItemId) {
                                <li>
                                    <span class="font-medium">{{ s.vaccineName }}</span> — {{ skipText[s.reason] }}
                                    @if (s.dueDate) {
                                        <span class="text-muted-color"> ({{ s.dueDate | trDate }})</span>
                                    }
                                </li>
                            }
                        </ul>
                    }

                    @if (saveError(); as err) {
                        <p class="text-red-500 text-sm mt-4 mb-0" role="alert">{{ err }}</p>
                    }
                    @if (rows().length > 0) {
                        @if (canApply()) {
                            <div class="mt-4 flex flex-wrap items-center gap-3">
                                <button pButton type="button" data-testid="plan-apply" [disabled]="saving() || selectedItems().length === 0 || hasInvalidDate()" (click)="apply()">
                                    <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Seçilenleri planla ({{ selectedItems().length }})
                                </button>
                                @if (hasInvalidDate()) {
                                    <small class="text-red-500">Seçilen dozların tarihi yarından sonra olmalıdır.</small>
                                }
                            </div>
                        } @else {
                            <p class="text-sm text-muted-color mt-4 mb-0" role="status">{{ applyBlockedText() }}</p>
                        }
                    }
                }
            }
        </div>
    `
})
export class PetVaccinationPlanPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly service = inject(VaccinationScheduleService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly scheduleRoute = VACCINATION_SCHEDULE_ROUTE;
    readonly skipText = VACCINATION_PLAN_SKIP_TEXT;
    readonly doseLabel = vaccinationDoseLabel;
    readonly petId = this.route.snapshot.paramMap.get('id') ?? '';
    /** Planlı aşı yarından itibaren; sunucu da aynı kuralı uygular. */
    readonly minDate = addGregorianDaysToYmd(toIstanbulDateInputValue(new Date().toISOString()), 1) ?? '';
    readonly canManageSchedule = this.auth.hasOperationClaim(VACCINE_DEFINITIONS_UPDATE_CLAIM);
    private readonly clinicId = this.auth.getClinicId()?.trim() ?? '';

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('VaccinationWizard') !== null);
    readonly canApply = computed(() => this.auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM) && !this.ro.mutationBlocked() && !!this.clinicId);

    readonly plan = signal<VaccinationPlanDto | null>(null);
    readonly rows = signal<VaccinationPlanRow[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly applied = signal<number | null>(null);

    readonly title = computed(() => (this.plan()?.petName ? `${this.plan()!.petName} — aşı planı` : 'Aşı planı'));
    readonly selectedItems = computed<VaccinationPlanApplyItem[]>(() =>
        this.rows()
            .filter((r) => r.selected)
            .map((r) => ({
                vaccineDefinitionId: r.suggestion.vaccineDefinitionId,
                dueDate: r.dueDate,
                notes: `Aşı takviminden: ${vaccinationDoseLabel(r.suggestion.doseNumber, r.suggestion.doseCount)}`
            }))
    );
    readonly hasInvalidDate = computed(() => this.selectedItems().some((i) => !i.dueDate || i.dueDate < this.minDate));
    readonly applyBlockedText = computed(() => {
        if (this.ro.mutationBlocked()) {
            return 'Abonelik durumu nedeniyle plan kaydedilemez.';
        }

        return this.clinicId ? 'Planı kaydetmek için aşı kaydı oluşturma yetkisi gerekir.' : 'Planı kaydetmek için aktif klinik seçin.';
    });

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        if (this.planLocked()) {
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.service.getPetPlan(this.petId).subscribe({
            next: (p) => {
                this.plan.set(p);
                this.rows.set(
                    p.suggestions.map((s) => ({ key: `${s.scheduleItemId}:${s.doseNumber ?? 'r'}`, suggestion: s, selected: true, dueDate: s.dueDate }))
                );
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.loading.set(false);
            }
        });
    }

    patch(key: string, change: Partial<Pick<VaccinationPlanRow, 'selected' | 'dueDate'>>): void {
        this.rows.update((rows) => rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
        this.saveError.set(null);
    }

    apply(): void {
        const items = this.selectedItems();

        if (!this.canApply() || this.saving() || items.length === 0 || this.hasInvalidDate()) {
            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.service.applyPetPlan(this.petId, this.clinicId, items).subscribe({
            next: (result) => {
                this.saving.set(false);
                this.applied.set(result.created.length);
                this.reload();
            },
            error: (e: Error) => {
                this.saving.set(false);
                this.saveError.set(e.message);
            }
        });
    }
}
