import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { type Popover, PopoverModule } from 'primeng/popover';
import { VaccinationsService } from '@/app/entities/vaccination/services/vaccinations.service';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { CalendarBubbleComponent, CalendarBubbleService } from '@/app/features/appointments/components/calendar-bubble';
import type { VaccinePick } from '@/app/features/appointments/components/calendar-vaccine-strip.component';
import { AppointmentDetailPageComponent } from '@/app/features/appointments/pages/appointment-detail-page/appointment-detail-page.component';
import { AppointmentEditPageComponent } from '@/app/features/appointments/pages/appointment-edit-page/appointment-edit-page.component';
import { DialogUnsavedChangesDirective } from '@/app/shared/ui/unsaved-changes/dialog-unsaved-changes.directive';
import { readVaccineLayerPreference, vaccineDotClass, vaccineStateLabel, vaccinesOn, writeVaccineLayerPreference } from './calendar-layer.utils';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { groupCalendarItemsByDay } from '@/app/entities/appointment/data/appointment-calendar.mapper';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import type { VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { addGregorianDaysToYmd, dateOnlyInputToIstanbulStartUtcIso, formatDateDisplay, formatWeekdayDateDisplay, toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENT_REQUESTS_MANAGE_CLAIM,
    APPOINTMENTS_CREATE_CLAIM,
    APPOINTMENTS_RESCHEDULE_CLAIM,
    VACCINATIONS_CREATE_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VACCINATIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppointmentRequestsCalendarLayerComponent } from '@/app/entities/online-booking/components/appointment-requests-calendar-layer.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { istanbulTodayYmd } from '@/app/features/appointments/utils/appointment-schedule-validation.utils';
import { type CalendarAllDayCell, AppointmentCalendarGridComponent, type CalendarGridColumn, type CalendarSlotPick, vetDotClass } from '@/app/features/appointments/components/appointment-calendar-grid.component';
import { AppointmentFreeSlotFinderComponent, type FreeSlotPick } from '@/app/features/appointments/components/appointment-free-slot-finder.component';
import { type AgendaDay, AppointmentDayAgendaComponent } from '@/app/features/appointments/components/appointment-day-agenda.component';
import { clockLabel, conflictIds, durationText, firstFreeVeterinarian, freeGaps, gridBounds, intersectGaps, isCancelled, layoutBlocks, minutesOf, rowStepMinutes, toBlockTimes, weekDateKeys, workingDayFor } from './calendar-grid.utils';

type CalendarViewMode = 'day' | 'week';
type CalendarPreset = 'overdue-appointments' | 'upcoming-24h' | 'today-cancelled';

const UNASSIGNED = 'yok';
/** Randevu türü "Aşılama" (backend `AppointmentType.Vaccination`). */
const VACCINATION_APPOINTMENT_TYPE = 1;
/** Çalışma saatleri alınamazsa ızgara bu haftayla çizilir (pazartesi–cumartesi 08–20). */
const FALLBACK_WEEK: ClinicWorkingHourVm[] = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    dayLabel: '',
    isClosed: false,
    opensAt: '08:00',
    closesAt: '20:00',
    breakStartsAt: null,
    breakEndsAt: null
}));
const WEEKDAY_SHORT = new Intl.DateTimeFormat('tr-TR', { weekday: 'short', timeZone: 'UTC' });
const WEEKDAY_LONG = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' });

/**
 * Randevu takvimi (kullanıcı dostu denetim B1, seçilen kurgu A + "Boş saat bul"): gün görünümünde saat ızgarası ve hekim başına sütun,
 * hafta görünümünde gün sütunları (bloklar hekim renginde), boş hücreye tıklayınca tarih-saat-hekim dolu Yeni randevu, çakışan randevu
 * kırmızı. Telefonda günün ajandası. Görünüm ve gün adreste (`?view=week&date=yyyy-MM-dd`); `preset` listeleri değişmedi.
 * Aşı katmanı (2026-11-16): planlı/sonraki/uygulanan aşılar günün üst şeridinde; randevu sayılmaz (çakışma, boş saat ve sayaçlara girmez).
 * Kartın üzerine gelince ayrıntı balonu; randevuya tıklayınca ayrıntı sayfadan çıkmadan pencerede.
 */
@Component({
    selector: 'app-appointments-calendar-page',
    standalone: true,
    providers: [CalendarBubbleService],
    imports: [
        ButtonModule,
        DialogModule,
        PopoverModule,
        CalendarBubbleComponent,
        AppointmentDetailPageComponent,
        AppointmentEditPageComponent,
        DialogUnsavedChangesDirective,
        AppointmentRequestsCalendarLayerComponent,
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        AppRowActionButtonComponent,
        AppointmentCalendarGridComponent,
        AppointmentFreeSlotFinderComponent,
        AppointmentDayAgendaComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            <app-list-header class="mb-4" [title]="pageTitle()">
                @if (canCreateAppointment && !ro.mutationBlocked()) {
                    <button actions pButton type="button" class="p-button-primary" (click)="createAppointment()"><i class="pi pi-plus"></i>Yeni randevu</button>
                } @else if (canCreateAppointment && ro.mutationBlocked()) {
                    <button actions pButton type="button" class="p-button-secondary" [disabled]="true"><i class="pi pi-lock"></i>Yeni randevu (salt okunur)</button>
                }
            </app-list-header>

            @if (!isPresetDateGroupedMode()) {
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <div class="hidden lg:inline-flex rounded-border border border-surface overflow-hidden" role="group" aria-label="Görünüm">
                        <button type="button" class="px-3 py-1.5 text-sm cursor-pointer" [class]="viewMode() === 'day' ? 'bg-primary text-primary-contrast' : ''" [attr.aria-pressed]="viewMode() === 'day'" (click)="changeViewMode('day')">Gün</button>
                        <button
                            type="button"
                            class="px-3 py-1.5 text-sm cursor-pointer border-l border-surface"
                            [class]="viewMode() === 'week' ? 'bg-primary text-primary-contrast' : ''"
                            [attr.aria-pressed]="viewMode() === 'week'"
                            (click)="changeViewMode('week')"
                        >
                            Hafta
                        </button>
                    </div>
                    <div class="inline-flex items-center gap-1">
                        <button pButton type="button" size="small" severity="secondary" [text]="true" aria-label="Önceki" (click)="previous()"><i class="p-button-icon pi pi-angle-left"></i></button>
                        <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="goToday()">Bugün</button>
                        <button pButton type="button" size="small" severity="secondary" [text]="true" aria-label="Sonraki" (click)="next()"><i class="p-button-icon pi pi-angle-right"></i></button>
                    </div>
                    <h2 class="m-0 text-lg font-semibold" data-testid="calendar-range-title">{{ rangeTitle() }}</h2>
                    @if (canReadVaccinations) {
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm cursor-pointer"
                            [class]="vaccineLayer() ? 'border-surface-900 dark:border-surface-0 font-medium' : 'border-surface text-muted-color'"
                            [attr.aria-pressed]="vaccineLayer()"
                            (click)="toggleVaccineLayer()"
                            data-testid="calendar-vaccine-layer-toggle"
                        >
                            <i class="pi pi-shield !text-xs" aria-hidden="true"></i>Aşılar
                            @if (vaccineLayer() && vaccinesInView() > 0) {
                                <span class="rounded-full bg-surface-100 dark:bg-surface-800 px-1.5 text-xs tabular-nums">{{ vaccinesInView() }}</span>
                            }
                        </button>
                        @if (vaccineLayer()) {
                            <span class="hidden xl:inline-flex items-center gap-2 text-xs text-muted-color" aria-label="Aşı renkleri">
                                @for (l of vaccineLegend; track l.label) {
                                    <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" [class]="l.dot" aria-hidden="true"></span>{{ l.label }}</span>
                                }
                            </span>
                        }
                        @if (vaccineError(); as ve) {
                            <span class="text-xs text-red-600 dark:text-red-400" role="alert">{{ ve }}</span>
                        }
                    }
                    @if (conflictCount()) {
                        <span class="inline-flex items-center gap-1 rounded-border bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 text-sm"
                            ><i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ conflictCount() }} çakışma</span
                        >
                    }
                    @if (vets().length > 1) {
                        <div class="hidden lg:flex ml-auto flex-wrap items-center gap-1" role="group" aria-label="Hekimler">
                            @for (v of vets(); track v.userId; let i = $index) {
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1 rounded-full border border-surface px-2 py-0.5 text-sm cursor-pointer"
                                    [class.line-through]="hiddenVets().has(v.userId)"
                                    [class.text-muted-color]="hiddenVets().has(v.userId)"
                                    [attr.aria-pressed]="!hiddenVets().has(v.userId)"
                                    (click)="toggleVet(v.userId)"
                                >
                                    <span class="w-2.5 h-2.5 rounded-full" [class]="dot(i)" aria-hidden="true"></span>{{ v.name }}
                                </button>
                            }
                        </div>
                    }
                </div>
                @if (canManageRequests) {
                    <app-appointment-requests-calendar-layer [fromUtc]="requestLayerRange().fromUtc" [toUtc]="requestLayerRange().toUtc" />
                }
            }
            @if (activePreset(); as preset) {
                <div class="flex flex-wrap items-center gap-2 mb-4">
                    <span class="text-sm text-muted-color">{{ presetHelperText(preset) }}</span>
                    <button pButton type="button" size="small" [text]="true" (click)="clearPreset()"><i class="pi pi-times"></i>Filtreyi temizle</button>
                </div>
            }

            @if (loading() && items().length === 0) {
                <app-loading-state message="Takvim verileri yükleniyor…" />
            } @else if (error(); as err) {
                <app-error-state [detail]="err" (retry)="reload()" />
            } @else if (isPresetDateGroupedMode()) {
                @if (items().length === 0) {
                    <app-empty-state message="Bu tarih aralığında randevu bulunmuyor." />
                } @else {
                    <div class="flex flex-col gap-4">
                        @for (day of presetGroupedByDate(); track day.dateKey) {
                            <section class="rounded-border border border-surface p-3">
                                <h3 class="m-0 mb-3 text-sm font-semibold">{{ day.dateLabel }}</h3>
                                <div class="flex flex-col gap-2">
                                    @for (item of day.items; track item.id) {
                                        <article class="flex flex-wrap items-center gap-2 rounded-border border border-surface px-2 py-2">
                                            <span class="rounded-border bg-surface-100 dark:bg-surface-800 px-2 py-1 text-xs font-semibold whitespace-nowrap">{{ item.timeRangeLabel }}</span>
                                            <span class="min-w-0 flex-1 text-sm font-semibold truncate"
                                                >{{ item.petName }} <span class="text-muted-color font-normal">· {{ item.clientName }}</span></span
                                            >
                                            <app-status-tag [label]="item.statusLabel" [severity]="item.statusSeverity" />
                                            <app-status-tag [label]="item.appointmentTypeLabel" severity="secondary" />
                                            <app-row-action-button action="detail" (pressed)="openDetail(item.id)" />
                                            <app-row-action-button action="edit" [disabled]="!canRescheduleAppointment || ro.mutationBlocked()" (pressed)="openEdit(item.id)" />
                                        </article>
                                    }
                                </div>
                            </section>
                        }
                    </div>
                }
            } @else {
                <div class="hidden lg:grid gap-4" [class]="showFinder() ? 'lg:grid-cols-[minmax(0,1fr)_272px]' : ''">
                    <app-appointment-calendar-grid
                        class="min-w-0"
                        [columns]="gridColumns()"
                        [start]="bounds().start"
                        [end]="bounds().end"
                        [rowMinutes]="rowStep()"
                        [conflicts]="conflicts()"
                        [byVet]="viewMode() === 'week'"
                        [vetOrder]="vetOrder()"
                        [canCreate]="canPick()"
                        [nowMinute]="nowMinute()"
                        [minColumnPx]="viewMode() === 'week' ? 120 : 180"
                        [allDay]="allDayCells()"
                        [clinicName]="clinicName"
                        (slotPick)="onSlotPick($event)"
                        (open)="openDetail($event)"
                        (dayOpen)="openDay($event)"
                        (vaccinePick)="openVaccine($event)"
                    />
                    @if (showFinder()) {
                        <app-appointment-free-slot-finder [clinicId]="clinicId!" [vets]="vets()" [canCreate]="canPick()" [refreshKey]="loadCount()" (pick)="onFreeSlotPick($event)" />
                    }
                </div>
                <div class="lg:hidden">
                    <app-appointment-day-agenda
                        [days]="agendaDays()"
                        [selected]="selectedDate()"
                        [items]="selectedDayItems()"
                        [working]="selectedWorking()"
                        [gaps]="agendaGaps()"
                        [gapLabel]="vets().length > 1 ? 'herkes boş' : 'boş'"
                        [conflicts]="conflicts()"
                        [nowMinute]="selectedDate() === today() ? nowMinute() : null"
                        [canCreate]="canPick()"
                        [vaccines]="selectedDayVaccines()"
                        [clinicName]="clinicName"
                        (dayChange)="goToDate($event)"
                        (gapPick)="onAgendaGapPick($event)"
                        (open)="openDetail($event)"
                        (vaccinePick)="openVaccine($event)"
                    />
                </div>
            }
        </div>

        <app-calendar-bubble />

        <!-- Aşıya tıklayınca: aşıyı yap ya da bu aşı için randevu ver (aşı randevu sayılmaz). -->
        <p-popover #vaccineMenu styleClass="w-[20rem] max-w-[calc(100vw-2rem)]">
            @if (selectedVaccine(); as v) {
                <div class="flex flex-col gap-2" data-testid="calendar-vaccine-menu">
                    <div>
                        <p class="m-0 font-semibold">{{ v.vaccineName }}</p>
                        <p class="m-0 text-sm text-muted-color">{{ v.clientName }} – {{ v.petName }} · {{ vaccineStateText(v) }}</p>
                    </div>
                    @if (v.kind !== 'Applied' && canApplyVaccine(v)) {
                        <button pButton type="button" size="small" class="justify-start" (click)="applyVaccine(v)" data-testid="calendar-vaccine-apply"><i class="pi pi-check"></i>Aşıyı yap</button>
                    }
                    @if (v.kind !== 'Applied' && canPick()) {
                        <button pButton type="button" size="small" severity="secondary" [outlined]="true" class="justify-start" (click)="bookForVaccine(v)" data-testid="calendar-vaccine-book"><i class="pi pi-calendar-plus"></i>Bu aşı için randevu ver</button>
                    }
                    <button pButton type="button" size="small" severity="secondary" [text]="true" class="justify-start" (click)="openVaccineRecord(v)"><i class="pi pi-external-link"></i>Aşı kaydını aç</button>
                </div>
            }
        </p-popover>

        <!-- Randevu ayrıntısı sayfadan çıkmadan: ayrıntı bileşeni pencere kipinde; düzenleme aynı pencerede. Kapanınca takvim aynı yerde, değişiklik varsa yenilenir. -->
        <p-dialog
            [visible]="!!dialog()"
            (visibleChange)="$event || closeDialog()"
            [appUnsavedChanges]="editPage()?.hasUnsavedChanges() ?? false"
            [header]="dialog()?.mode === 'edit' ? 'Randevuyu düzenle' : 'Randevu'"
            [modal]="true"
            [dismissableMask]="true"
            [draggable]="false"
            [style]="{ width: 'min(64rem, 96vw)' }"
            [contentStyle]="{ 'max-height': '80vh' }"
        >
            @if (dialog(); as d) {
                @if (d.mode === 'edit') {
                    <app-appointment-edit-page [embeddedId]="d.id" (saved)="onEditSaved(d.id)" (closed)="showDetail(d.id)" />
                } @else {
                    <app-appointment-detail-page [appointmentId]="d.id" (editRequested)="openEdit($event)" (changed)="calendarDirty = true" />
                }
            }
        </p-dialog>
    `
})
export class AppointmentsCalendarPageComponent implements OnInit {
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly appointments = inject(AppointmentsService);
    private readonly clinics = inject(ClinicsService);
    private readonly visits = inject(VisitsService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly canManageRequests = this.auth.hasOperationClaim(APPOINTMENT_REQUESTS_MANAGE_CLAIM);
    readonly canCreateAppointment = this.auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM);
    readonly canRescheduleAppointment = this.auth.hasOperationClaim(APPOINTMENTS_RESCHEDULE_CLAIM);
    readonly canReadVaccinations = this.auth.hasOperationClaim(VACCINATIONS_READ_CLAIM);
    private readonly canCreateVaccination = this.auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM);
    private readonly canUpdateVaccination = this.auth.hasOperationClaim(VACCINATIONS_UPDATE_CLAIM);
    readonly clinicId = this.auth.getClinicId()?.trim() || null;
    readonly clinicName = this.auth.getClinicName()?.trim() || '';
    private readonly vaccinationsService = inject(VaccinationsService);

    /** Aşı katmanı: varsayılan açık, seçim tarayıcıda hatırlanır. */
    readonly vaccineLayer = signal(readVaccineLayerPreference());
    readonly vaccines = signal<VaccinationCalendarItemVm[]>([]);
    readonly vaccineError = signal<string | null>(null);
    readonly selectedVaccine = signal<VaccinationCalendarItemVm | null>(null);
    readonly vaccineLegend = (['DueToday', 'Upcoming', 'Overdue', 'Applied'] as const).map((s) => ({ label: vaccineStateLabel(s), dot: vaccineDotClass(s) }));
    private readonly vaccineMenu = viewChild<Popover>('vaccineMenu');
    private vaccineRequest: Subscription | null = null;

    /** Açık randevu penceresi; kapanınca takvim yalnız değişiklik olduysa yenilenir. */
    readonly dialog = signal<{ id: string; mode: 'detail' | 'edit' } | null>(null);
    readonly editPage = viewChild(AppointmentEditPageComponent);
    calendarDirty = false;

    readonly viewMode = signal<CalendarViewMode>('day');
    readonly selectedDate = signal(istanbulTodayYmd());
    readonly today = signal(istanbulTodayYmd());
    readonly nowMinute = signal<number | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly items = signal<AppointmentCalendarItemVm[]>([]);
    readonly activePreset = signal<CalendarPreset | null>(null);
    readonly requestLayerRange = signal<{ fromUtc: string | null; toUtc: string | null }>({ fromUtc: null, toUtc: null });
    readonly vets = signal<VeterinarianVm[]>([]);
    readonly hours = signal<ClinicWorkingHourVm[]>([]);
    readonly slotInterval = signal(15);
    readonly hiddenVets = signal<ReadonlySet<string>>(new Set());
    /** Her başarılı yüklemede artar; "Boş saat bul" listesini de yeniler. */
    readonly loadCount = signal(0);

    readonly canPick = computed(() => this.canCreateAppointment && !this.ro.mutationBlocked());
    readonly showFinder = computed(() => !!this.clinicId && this.canCreateAppointment);
    readonly rowStep = computed(() => rowStepMinutes(this.slotInterval()));
    readonly gridHours = computed(() => (this.hours().length ? this.hours() : FALLBACK_WEEK));
    readonly weekKeys = computed(() => weekDateKeys(this.selectedDate()));
    readonly conflicts = computed(() => conflictIds(this.items()));
    readonly presetGroupedByDate = computed(() => groupCalendarItemsByDay(this.items()));

    /** Hekim sırası (renk ve sütun sırası): klinik hekimleri, ardından listede olmayan ama randevusu olan hekimler. */
    readonly vetOrder = computed(() => {
        const ids = this.vets().map((v) => v.userId);

        for (const i of this.items()) {
            if (i.veterinarianUserId && !ids.includes(i.veterinarianUserId)) {
                ids.push(i.veterinarianUserId);
            }
        }

        return ids;
    });

    readonly visibleItems = computed(() => this.items().filter((i) => !i.veterinarianUserId || !this.hiddenVets().has(i.veterinarianUserId)));
    readonly selectedDayItems = computed(() => this.itemsOn(this.selectedDate(), this.visibleItems()));
    readonly selectedWorking = computed(() => workingDayFor(this.gridHours(), this.selectedDate()));

    readonly gridColumns = computed<CalendarGridColumn[]>(() => (this.viewMode() === 'week' ? this.weekColumns() : this.dayColumns()));

    readonly shownVaccines = computed(() => (this.vaccineLayer() ? this.vaccines() : []));
    readonly selectedDayVaccines = computed(() => vaccinesOn(this.selectedDate(), this.shownVaccines()));
    readonly vaccinesInView = computed(() => (this.viewMode() === 'week' ? this.shownVaccines().length : this.selectedDayVaccines().length));

    /** Üst şerit: hafta görünümünde gün başına hücre, gün görünümünde tüm sütunlara yayılan tek hücre; görünürde aşı yoksa şerit yok. */
    readonly allDayCells = computed<CalendarAllDayCell[] | null>(() => {
        if (this.vaccinesInView() === 0) {
            return null;
        }

        if (this.viewMode() === 'week') {
            return this.weekKeys().map((dateKey) => ({ key: dateKey, span: 1, items: vaccinesOn(dateKey, this.shownVaccines()), limit: 3, stacked: true }));
        }

        return [{ key: 'day', span: this.gridColumns().length, items: this.selectedDayVaccines(), limit: 12, stacked: false }];
    });

    readonly bounds = computed(() => gridBounds(this.gridHours(), layoutBlocks(this.viewMode() === 'week' ? this.visibleItems() : this.selectedDayItems())));

    readonly conflictCount = computed(() => {
        const ids = this.conflicts();
        const inView = (this.viewMode() === 'week' ? this.visibleItems() : this.selectedDayItems()).filter((i) => ids.has(i.id));

        return Math.ceil(inView.length / 2);
    });

    readonly rangeTitle = computed(() => {
        const date = this.selectedDate();

        if (this.viewMode() === 'week') {
            const keys = this.weekKeys();

            return `${formatDateDisplay(`${keys[0]}T12:00:00Z`)} – ${formatDateDisplay(`${keys[6]}T12:00:00Z`)}`;
        }

        return (date === this.today() ? 'Bugün · ' : '') + formatWeekdayDateDisplay(`${date}T12:00:00Z`);
    });

    readonly agendaDays = computed<AgendaDay[]>(() =>
        this.weekKeys().map((dateKey) => {
            const count = this.itemsOn(dateKey, this.visibleItems()).filter((i) => !isCancelled(i)).length;

            return {
                dateKey,
                weekday: WEEKDAY_SHORT.format(new Date(`${dateKey}T12:00:00Z`)),
                dayNumber: String(Number(dateKey.slice(8))),
                note: !workingDayFor(this.gridHours(), dateKey) ? 'kapalı' : count ? `${count} rnd` : 'boş'
            };
        })
    );

    /** Telefonda boş satırlar: hekimsiz klinikte günün boşlukları; hekim varsa hepsinin aynı anda boş olduğu aralıklar. */
    readonly agendaGaps = computed(() => {
        const working = this.selectedWorking();
        const items = this.selectedDayItems();
        const vetIds = this.vets()
            .map((v) => v.userId)
            .filter((id) => !this.hiddenVets().has(id));

        if (vetIds.length === 0) {
            return freeGaps(working, items, this.rowStep());
        }

        return intersectGaps(
            vetIds.map((id) =>
                freeGaps(
                    working,
                    items.filter((i) => i.veterinarianUserId === id),
                    this.rowStep()
                )
            ),
            this.rowStep()
        );
    });

    private readonly clock = setInterval(() => this.tick(), 60_000);

    constructor() {
        inject(DestroyRef).onDestroy(() => clearInterval(this.clock));
        this.tick();
    }

    ngOnInit(): void {
        this.loadClinicSetup();
        this.route.queryParamMap.subscribe((params) => {
            const preset = this.toPreset(params.get('preset'));
            const date = params.get('date')?.trim() ?? '';

            this.activePreset.set(preset);
            this.viewMode.set(!preset && params.get('view') === 'week' ? 'week' : 'day');
            this.selectedDate.set(!preset && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : istanbulTodayYmd());
            this.reload();
        });
    }

    changeViewMode(mode: CalendarViewMode): void {
        if (this.viewMode() !== mode) {
            this.navigate({ view: mode });
        }
    }

    previous(): void {
        this.move(-1);
    }

    next(): void {
        this.move(1);
    }

    goToday(): void {
        this.navigate({ date: null });
    }

    goToDate(date: string): void {
        this.navigate({ date: date === istanbulTodayYmd() ? null : date });
    }

    openDay(date: string): void {
        this.navigate({ view: 'day', date: date === istanbulTodayYmd() ? null : date });
    }

    toggleVet(id: string): void {
        const next = new Set(this.hiddenVets());

        if (!next.delete(id)) {
            next.add(id);
        }

        this.hiddenVets.set(next);
    }

    reload(): void {
        const preset = this.presetQuery();
        const keys = this.weekKeys();
        const from = preset?.start.toISOString() ?? dateOnlyInputToIstanbulStartUtcIso(keys[0]);
        const to = preset?.endExclusive.toISOString() ?? dateOnlyInputToIstanbulStartUtcIso(addGregorianDaysToYmd(keys[6], 1) ?? keys[6]);

        this.today.set(istanbulTodayYmd());
        this.requestLayerRange.set({ fromUtc: from, toUtc: to });
        this.loading.set(true);
        this.error.set(null);
        this.appointments.getCalendarAppointments({ dateFromUtc: from, dateToUtc: to, status: preset?.status }).subscribe({
            next: (res) => {
                this.items.set(res);
                this.loading.set(false);
                this.loadCount.update((n) => n + 1);
            },
            error: (e: Error) => {
                this.error.set(panelHttpFailureMessage(e, 'Takvim verileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
        this.loadVaccines(preset ? null : { dateFromUtc: from, dateToUtc: to });
    }

    toggleVaccineLayer(): void {
        const on = !this.vaccineLayer();

        const range = this.requestLayerRange();

        this.vaccineLayer.set(on);
        writeVaccineLayerPreference(on);
        this.loadVaccines(this.activePreset() || !range.fromUtc || !range.toUtc ? null : { dateFromUtc: range.fromUtc, dateToUtc: range.toUtc });
    }

    openVaccine(pick: VaccinePick): void {
        this.selectedVaccine.set(pick.item);
        this.vaccineMenu()?.show(pick.event, pick.event.currentTarget ?? pick.event.target);
    }

    vaccineStateText(v: VaccinationCalendarItemVm): string {
        return vaccineStateLabel(v.state).toLocaleLowerCase('tr');
    }

    /** Planlı kayıt düzenlenip "Uygulandı" yapılır; sonraki tarih için aynı aşı yeni kayıt olarak (hasta ve aşı dolu) girilir. */
    canApplyVaccine(v: VaccinationCalendarItemVm): boolean {
        return !this.ro.mutationBlocked() && (v.kind === 'Planned' ? this.canUpdateVaccination : this.canCreateVaccination && !!v.petId && !!v.clientId);
    }

    applyVaccine(v: VaccinationCalendarItemVm): void {
        this.vaccineMenu()?.hide();

        if (v.kind === 'Planned') {
            void this.router.navigate(['/panel/vaccinations', v.vaccinationId, 'edit'], { queryParams: this.returnContextQueryParams() });

            return;
        }

        void this.router.navigate(['/panel/vaccinations/new'], {
            queryParams: {
                clientId: v.clientId,
                petId: v.petId,
                vaccineDefinitionId: v.vaccineDefinitionId ?? undefined,
                status: 1,
                ...this.returnContextQueryParams()
            }
        });
    }

    /** Randevu formu hasta, aşılama türü ve not dolu; gecikmiş aşıda tarih boş kalır (form ilk uygun saati önerir). */
    bookForVaccine(v: VaccinationCalendarItemVm): void {
        this.vaccineMenu()?.hide();
        void this.router.navigate(['/panel/appointments/new'], {
            queryParams: {
                clientId: v.clientId ?? undefined,
                petId: v.petId ?? undefined,
                date: v.dateKey >= istanbulTodayYmd() ? v.dateKey : undefined,
                type: VACCINATION_APPOINTMENT_TYPE,
                notes: `Aşı: ${v.vaccineName}`,
                ...this.returnContextQueryParams()
            }
        });
    }

    openVaccineRecord(v: VaccinationCalendarItemVm): void {
        this.vaccineMenu()?.hide();
        void this.router.navigate(['/panel/vaccinations', v.vaccinationId], { queryParams: this.returnContextQueryParams() });
    }

    closeDialog(): void {
        this.dialog.set(null);

        if (this.calendarDirty) {
            this.calendarDirty = false;
            this.reload();
        }
    }

    showDetail(id: string): void {
        this.dialog.set({ id, mode: 'detail' });
    }

    onEditSaved(id: string): void {
        this.calendarDirty = true;
        this.showDetail(id);
    }

    private loadVaccines(range: { dateFromUtc: string; dateToUtc: string } | null): void {
        // Hızlı gezinmede eski aralığın geç gelen yanıtı yenisini ezmesin.
        this.vaccineRequest?.unsubscribe();

        if (!range || !this.canReadVaccinations || !this.vaccineLayer()) {
            this.vaccines.set([]);
            this.vaccineError.set(null);

            return;
        }

        this.vaccineRequest = this.vaccinationsService.getCalendarVaccinations(range).subscribe({
            next: (v) => {
                this.vaccines.set(v);
                this.vaccineError.set(null);
            },
            error: () => {
                this.vaccines.set([]);
                this.vaccineError.set('Aşılar yüklenemedi.');
            }
        });
    }

    onSlotPick(pick: CalendarSlotPick): void {
        const vet = pick.column.veterinarianUserId ?? (this.viewMode() === 'week' ? this.freeVetAt(pick.column.dateKey, pick.minute) : null);

        this.createAppointment({ date: pick.column.dateKey, time: clockLabel(pick.minute), vet });
    }

    onAgendaGapPick(minute: number): void {
        this.createAppointment({ date: this.selectedDate(), time: clockLabel(minute), vet: this.freeVetAt(this.selectedDate(), minute) });
    }

    onFreeSlotPick(pick: FreeSlotPick): void {
        this.createAppointment({ date: pick.date, time: pick.time, vet: pick.veterinarianUserId });
    }

    /** Ayrıntı sayfadan çıkmadan pencerede; doğrudan bağlantıyla açılan ayrıntı sayfası değişmedi. */
    openDetail(id: string): void {
        this.showDetail(id);
    }

    openEdit(id: string): void {
        if (!this.canRescheduleAppointment || this.ro.mutationBlocked()) {
            return;
        }

        this.dialog.set({ id, mode: 'edit' });
    }

    /** Boş hücre / boş saat: tarih, saat ve hekim dolu form; üstteki düğme boş form açar (form ilk uygun saati önerir). */
    createAppointment(prefill?: { date: string; time: string; vet: string | null }): void {
        if (!this.canPick()) {
            return;
        }

        void this.router.navigate(['/panel/appointments/new'], {
            queryParams: prefill ? { date: prefill.date, time: prefill.time, vet: prefill.vet ?? undefined } : undefined
        });
    }

    dot(index: number): string {
        return vetDotClass(index);
    }

    pageTitle(): string {
        switch (this.activePreset()) {
            case 'overdue-appointments':
                return 'Zamanı geçmiş randevular';
            case 'upcoming-24h':
                return 'Önümüzdeki 24 saatteki randevular';
            case 'today-cancelled':
                return 'Bugün iptal edilen randevular';
            default:
                return 'Randevu takvimi';
        }
    }

    clearPreset(): void {
        void this.router.navigate(['/panel/appointments/calendar']);
    }

    presetHelperText(preset: CalendarPreset): string {
        if (preset === 'overdue-appointments') {
            return 'Zamanı geçmiş randevular filtreleniyor.';
        }

        if (preset === 'upcoming-24h') {
            return 'Önümüzdeki 24 saat randevuları filtreleniyor.';
        }

        return 'Bugün iptal edilen randevular filtreleniyor.';
    }

    isPresetDateGroupedMode(): boolean {
        const preset = this.activePreset();

        return preset === 'overdue-appointments' || preset === 'upcoming-24h';
    }

    private dayColumns(): CalendarGridColumn[] {
        const dateKey = this.selectedDate();
        const working = workingDayFor(this.gridHours(), dateKey);
        const items = this.selectedDayItems();
        const ids = this.conflicts();
        const names = new Map(this.vets().map((v) => [v.userId, v.name]));
        const vetIds = this.vetOrder().filter((id) => !this.hiddenVets().has(id));
        const unassigned = items.filter((i) => !i.veterinarianUserId);

        const column = (key: string, vetId: string | null, title: string, own: AppointmentCalendarItemVm[]): CalendarGridColumn => {
            const live = own.filter((i) => !isCancelled(i)).length;
            const free = vetId && working ? freeGaps(working, own, this.rowStep()).reduce((s, g) => s + g.end - g.start, 0) : null;

            return {
                key,
                dateKey,
                veterinarianUserId: vetId,
                title,
                subtitle: `${live} randevu` + (free !== null ? ` · ${durationText(free)} boş` : ''),
                dayNumber: null,
                today: false,
                working,
                blocks: layoutBlocks(own),
                conflictCount: own.filter((i) => ids.has(i.id)).length,
                opensDay: false
            };
        };

        if (vetIds.length === 0) {
            return [column('all', null, 'Randevular', items)];
        }

        const columns = vetIds.map((id) => {
            const own = items.filter((i) => i.veterinarianUserId === id);

            return column(id, id, names.get(id) || own[0]?.veterinarianName || 'Hekim', own);
        });

        return unassigned.length ? [...columns, column(UNASSIGNED, null, 'Hekim seçilmedi', unassigned)] : columns;
    }

    private weekColumns(): CalendarGridColumn[] {
        const ids = this.conflicts();

        return this.weekKeys().map((dateKey) => {
            const own = this.itemsOn(dateKey, this.visibleItems());
            const working = workingDayFor(this.gridHours(), dateKey);

            return {
                key: dateKey,
                dateKey,
                veterinarianUserId: null,
                title: WEEKDAY_LONG.format(new Date(`${dateKey}T12:00:00Z`)),
                subtitle: working ? `${own.filter((i) => !isCancelled(i)).length} randevu` : 'Kapalı',
                dayNumber: String(Number(dateKey.slice(8))),
                today: dateKey === this.today(),
                working,
                blocks: layoutBlocks(own),
                conflictCount: own.filter((i) => ids.has(i.id)).length,
                opensDay: true
            };
        });
    }

    private itemsOn(dateKey: string, items: readonly AppointmentCalendarItemVm[]): AppointmentCalendarItemVm[] {
        return items.filter((i) => toBlockTimes(i)?.dateKey === dateKey);
    }

    private freeVetAt(dateKey: string, minute: number): string | null {
        const vetIds = this.vets()
            .map((v) => v.userId)
            .filter((id) => !this.hiddenVets().has(id));

        return firstFreeVeterinarian(vetIds, this.items(), dateKey, minute, this.rowStep());
    }

    private move(step: number): void {
        const days = this.viewMode() === 'week' ? 7 : 1;
        const date = addGregorianDaysToYmd(this.selectedDate(), step * days) ?? this.selectedDate();

        this.navigate({ date: date === istanbulTodayYmd() ? null : date });
    }

    /** Görünüm ve gün adreste tutulur (geri dön bağlantısı aynı güne döner); `null` varsayılana (gün, bugün) döner. */
    private navigate(params: { view?: CalendarViewMode; date?: string | null }): void {
        const view = params.view ?? this.viewMode();
        const date = params.date === undefined ? (this.selectedDate() === istanbulTodayYmd() ? null : this.selectedDate()) : params.date;

        void this.router.navigate(['/panel/appointments/calendar'], { queryParams: { view: view === 'week' ? 'week' : undefined, date: date ?? undefined } });
    }

    private loadClinicSetup(): void {
        if (!this.clinicId) {
            return;
        }

        this.visits.getVeterinarians(this.clinicId).subscribe({ next: (v) => this.vets.set(v), error: () => this.vets.set([]) });
        this.clinics.getWorkingHours(this.clinicId).subscribe({ next: (h) => this.hours.set(h), error: () => this.hours.set([]) });
        this.clinics.getAppointmentSettings(this.clinicId).subscribe({ next: (s) => this.slotInterval.set(s.slotIntervalMinutes || 15), error: () => this.slotInterval.set(15) });
    }

    private tick(): void {
        this.nowMinute.set(minutesOf(toIstanbulTimeInputValue(new Date().toISOString())));
    }

    private toPreset(value: string | null): CalendarPreset | null {
        return value === 'overdue-appointments' || value === 'upcoming-24h' || value === 'today-cancelled' ? value : null;
    }

    private presetQuery(): { start: Date; endExclusive: Date; status?: string } | null {
        const now = new Date();
        const preset = this.activePreset();

        if (preset === 'overdue-appointments') {
            const start = new Date(now);

            start.setDate(start.getDate() - 45);

            return { start, endExclusive: now, status: 'Scheduled' };
        }

        if (preset === 'upcoming-24h') {
            const end = new Date(now);

            end.setHours(end.getHours() + 24);

            return { start: now, endExclusive: end, status: 'Scheduled' };
        }

        if (preset === 'today-cancelled') {
            const today = istanbulTodayYmd();

            return {
                start: new Date(dateOnlyInputToIstanbulStartUtcIso(today)),
                endExclusive: new Date(dateOnlyInputToIstanbulStartUtcIso(addGregorianDaysToYmd(today, 1) ?? today)),
                status: 'Cancelled'
            };
        }

        return null;
    }

    private returnContextQueryParams(): Record<string, string> {
        return { returnUrl: this.router.url, returnLabel: this.returnLabelForContext() };
    }

    private returnLabelForContext(): string {
        switch (this.activePreset()) {
            case 'overdue-appointments':
                return 'Zamanı geçmiş randevulara dön';
            case 'upcoming-24h':
                return 'Önümüzdeki 24 saat randevularına dön';
            case 'today-cancelled':
                return 'Bugün iptal edilen randevulara dön';
            default:
                return 'Randevu takvimine dön';
        }
    }
}
