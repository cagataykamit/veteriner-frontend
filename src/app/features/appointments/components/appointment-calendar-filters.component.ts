import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { CalendarItemState } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CALENDAR_STATES, calendarStateLabel, type CalendarFilters, NO_VET, VACCINE_TYPE } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';
import { stateTone, toneBarClass } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-tone.utils';

interface Option {
    label: string;
    value: string;
    dot?: string;
}

/**
 * Takvim filtre şeridi (kullanıcı isteği 2026-11-16, sözleşme §6): hekim, tür (randevu türleri ve ayrı seçenek olarak planlı aşılar),
 * durum (renk açıklamasıyla aynı dil) ve çok klinikte şube. Seçim anında uygulanır; ayrı "Filtrele" düğmesi yok. Durum çipleri renk
 * açıklaması da olur. Değer sayfanın adres çubuğundan gelir, değişiklik `filtersChange` ile sayfaya döner.
 */
@Component({
    selector: 'app-appointment-calendar-filters',
    standalone: true,
    imports: [FormsModule, SelectModule, MultiSelectModule, FilterFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-wrap items-end gap-3" role="group" aria-label="Takvim filtreleri" data-testid="calendar-filters">
            @if (showVet() && vetOptions().length > 2) {
                <app-filter-field label="Hekim" labelId="calFltVet" [active]="!!filters().vet" width="select">
                    <p-select
                        ariaLabelledBy="calFltVet"
                        inputId="calFltVetInput"
                        [options]="vetOptions()"
                        [ngModel]="filters().vet ?? ''"
                        optionLabel="label"
                        optionValue="value"
                        class="w-full"
                        (ngModelChange)="emit({ vet: $event || null })"
                    >
                        <ng-template #item let-o>
                            <span class="inline-flex items-center gap-2">
                                @if (o.dot) {
                                    <span class="w-2.5 h-2.5 rounded-full" [class]="o.dot" aria-hidden="true"></span>
                                }
                                {{ o.label }}
                            </span>
                        </ng-template>
                    </p-select>
                </app-filter-field>
            }
            <app-filter-field label="Tür" labelId="calFltType" [active]="filters().types.length > 0" width="select">
                <p-multiselect
                    ariaLabelledBy="calFltType"
                    inputId="calFltTypeInput"
                    [options]="typeOptions()"
                    [ngModel]="filters().types"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tümü"
                    [showToggleAll]="false"
                    [filter]="false"
                    [maxSelectedLabels]="2"
                    selectedItemsLabel="{0} tür"
                    class="w-full"
                    (ngModelChange)="emit({ types: $event ?? [] })"
                />
            </app-filter-field>
            <app-filter-field label="Durum" labelId="calFltState" [active]="filters().states.length > 0" width="grow">
                <div class="flex flex-wrap gap-1.5 min-h-10 items-center" role="group" aria-labelledby="calFltState">
                    @for (s of states; track s) {
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm cursor-pointer"
                            [class]="isState(s) ? 'border-surface-900 dark:border-surface-0 font-medium bg-surface-100 dark:bg-surface-800' : 'border-surface'"
                            [attr.aria-pressed]="isState(s)"
                            (click)="toggleState(s)"
                            [attr.data-testid]="'calendar-filter-state-' + s"
                        >
                            <span class="w-[3px] h-3 rounded-sm" [class]="dot(s)" aria-hidden="true"></span>{{ stateLabel(s) }}
                        </button>
                    }
                </div>
            </app-filter-field>
            @if (clinics().length > 1) {
                <app-filter-field label="Klinik" labelId="calFltClinic" width="select">
                    <p-select
                        ariaLabelledBy="calFltClinic"
                        inputId="calFltClinicInput"
                        [options]="clinics()"
                        [ngModel]="activeClinicId()"
                        optionLabel="name"
                        optionValue="id"
                        class="w-full"
                        (ngModelChange)="pickClinic($event)"
                    />
                </app-filter-field>
            }
            @if (hasAny()) {
                <button type="button" class="mb-2 text-sm text-primary font-medium cursor-pointer hover:underline" (click)="clear()" data-testid="calendar-filters-clear">
                    <i class="pi pi-times !text-xs mr-1" aria-hidden="true"></i>Filtreleri temizle
                </button>
            }
        </div>
    `
})
export class AppointmentCalendarFiltersComponent {
    readonly filters = input.required<CalendarFilters>();
    /** Gün görünümünde hekim çipleri varken hekim listesi gizlenir. */
    readonly showVet = input(true);
    readonly vets = input<VeterinarianVm[]>([]);
    /** Hekim renk sırası (ızgarayla aynı). */
    readonly vetOrder = input<readonly string[]>([]);
    /** Aşı okuma yetkisi yoksa "Planlı aşılar" seçeneği yok. */
    readonly canSeeVaccines = input(false);
    readonly clinics = input<ClinicSummary[]>([]);
    readonly activeClinicId = input<string | null>(null);

    readonly filtersChange = output<CalendarFilters>();
    readonly clinicChange = output<ClinicSummary>();

    protected readonly states = CALENDAR_STATES;

    protected readonly vetOptions = computed<Option[]>(() => [
        { label: 'Tüm hekimler', value: '' },
        ...this.vets().map((v) => ({ label: v.name, value: v.userId, dot: 'bg-primary' })),
        { label: 'Hekim atanmamış', value: NO_VET, dot: 'bg-surface-400' }
    ]);

    protected readonly typeOptions = computed<Option[]>(() => [
        ...(this.canSeeVaccines() ? [{ label: 'Planlı aşılar', value: VACCINE_TYPE }] : []),
        ...APPOINTMENT_TYPE_WRITE_OPTIONS.map((o) => ({ label: o.label, value: String(o.value) }))
    ]);

    protected readonly hasAny = computed(() => {
        const f = this.filters();

        return !!f.vet || f.types.length > 0 || f.states.length > 0;
    });

    protected isState(s: CalendarItemState): boolean {
        return this.filters().states.includes(s);
    }

    protected dot(s: CalendarItemState): string {
        return toneBarClass(stateTone(s));
    }

    protected stateLabel(s: CalendarItemState): string {
        return calendarStateLabel(s);
    }

    protected toggleState(s: CalendarItemState): void {
        const cur = this.filters().states;

        this.emit({ states: cur.includes(s) ? cur.filter((x) => x !== s) : CALENDAR_STATES.filter((x) => x === s || cur.includes(x)) });
    }

    protected emit(patch: Partial<CalendarFilters>): void {
        this.filtersChange.emit({ ...this.filters(), ...patch });
    }

    protected clear(): void {
        this.filtersChange.emit({ vet: null, types: [], states: [] });
    }

    protected pickClinic(id: string): void {
        const clinic = this.clinics().find((c) => c.id === id);

        if (clinic && id !== this.activeClinicId()) {
            this.clinicChange.emit(clinic);
        }
    }
}
