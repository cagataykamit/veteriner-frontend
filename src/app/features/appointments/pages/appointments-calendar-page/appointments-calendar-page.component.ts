import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, type Subscription } from 'rxjs';
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
import {
    calendarFiltersToQueryParams,
    calendarRequestFor,
    type CalendarFilters,
    type DayVetPrefs,
    EMPTY_CALENDAR_FILTERS,
    NO_VET,
    parseCalendarFilters,
    readDayVetPrefs,
    readStoredCalendarFilters,
    vaccineStateLabel,
    vaccinesOn,
    writeDayVetPrefs,
    writeStoredCalendarFilters
} from './calendar-layer.utils';
import { appointmentTone, type CalendarTone, type CareMark, initials, LEGEND, toneBarClass } from './calendar-tone.utils';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AppointmentCalendarFiltersComponent } from '@/app/features/appointments/components/appointment-calendar-filters.component';
import { AppointmentCalendarMonthComponent } from '@/app/features/appointments/components/appointment-calendar-month.component';
import type { CalendarDaySummaryVm } from '@/app/entities/appointment/models/calendar-day-summary.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { groupCalendarItemsByDay } from '@/app/entities/appointment/data/appointment-calendar.mapper';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import type { TodayItemVm, VeterinarianVm } from '@/app/entities/visit/models/visit-vm.model';
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
    VACCINATIONS_UPDATE_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppointmentRequestsCalendarLayerComponent } from '@/app/entities/online-booking/components/appointment-requests-calendar-layer.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { istanbulTodayYmd } from '@/app/features/appointments/utils/appointment-schedule-validation.utils';
import { AppointmentCalendarGridComponent, type CalendarSlotPick, type DayBoardColumn, type DayBoardVaccines } from '@/app/features/appointments/components/appointment-calendar-grid.component';
import { AppointmentCalendarWeekComponent, type WeekDayColumn } from '@/app/features/appointments/components/appointment-calendar-week.component';
import { TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import { AppointmentFreeSlotFinderComponent, type FreeSlotPick } from '@/app/features/appointments/components/appointment-free-slot-finder.component';
import { type AgendaDay, AppointmentDayAgendaComponent } from '@/app/features/appointments/components/appointment-day-agenda.component';
import { clockLabel, conflictIds, firstFreeVeterinarian, firstScrollMinute, freeGaps, gridBounds, intersectGaps, isCancelled, layoutBlocks, minutesOf, monthGridWeeks, rowStepMinutes, toBlockTimes, weekDateKeys, workingDayFor } from './calendar-grid.utils';

type CalendarViewMode = 'day' | 'week' | 'month';
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
const MONTH_TITLE = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

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
        AppointmentCalendarFiltersComponent,
        AppointmentCalendarMonthComponent,
        AppointmentRequestsCalendarLayerComponent,
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        AppRowActionButtonComponent,
        AppointmentCalendarGridComponent,
        AppointmentCalendarWeekComponent,
        AppointmentFreeSlotFinderComponent,
        RouterLink,
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
                <!-- Takvim çubuğu (taslak 3): gezinme, başlık, "Bugün"; sağda renk açıklaması ve Gün / Hafta / Ay. -->
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <div class="inline-flex items-center gap-1">
                        <button pButton type="button" size="small" severity="secondary" [outlined]="true" aria-label="Önceki" (click)="previous()"><i class="p-button-icon pi pi-angle-left"></i></button>
                        <button pButton type="button" size="small" severity="secondary" [outlined]="true" aria-label="Sonraki" (click)="next()"><i class="p-button-icon pi pi-angle-right"></i></button>
                    </div>
                    <h2 class="m-0 text-lg font-bold" data-testid="calendar-range-title">{{ rangeTitle() }}</h2>
                    @if (showsToday()) {
                        <span class="rounded-md bg-primary-50 dark:bg-primary-950 text-primary text-xs font-semibold px-2 py-0.5">Bugün</span>
                    } @else {
                        <button type="button" class="rounded-md border border-surface text-primary text-xs font-semibold px-2 py-0.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950" (click)="goToday()">Bugüne dön</button>
                    }
                    <span class="flex-1"></span>
                    <span class="hidden xl:inline-flex items-center gap-3 text-xs text-muted-color mr-1" aria-label="Renk açıklaması" data-testid="calendar-legend">
                        @for (l of legend; track l.label) {
                            <span class="inline-flex items-center gap-1.5"><span class="w-[3px] h-3 rounded-sm" [class]="bar(l.tone)" aria-hidden="true"></span>{{ l.label }}</span>
                        }
                    </span>
                    <!-- Telefonda Gün (ajanda) ve Ay; Hafta geniş ekranda. -->
                    <div class="inline-flex rounded-lg border border-surface bg-surface-50 dark:bg-surface-800 p-0.5" role="group" aria-label="Görünüm">
                        <button type="button" class="px-3 py-1 rounded-md text-sm cursor-pointer" [class]="segClass('day')" [attr.aria-pressed]="viewMode() === 'day'" (click)="changeViewMode('day')">Gün</button>
                        <button type="button" class="hidden lg:block px-3 py-1 rounded-md text-sm cursor-pointer" [class]="segClass('week')" [attr.aria-pressed]="viewMode() === 'week'" (click)="changeViewMode('week')">Hafta</button>
                        <button type="button" class="px-3 py-1 rounded-md text-sm cursor-pointer" [class]="segClass('month')" [attr.aria-pressed]="viewMode() === 'month'" (click)="changeViewMode('month')" data-testid="calendar-view-month">Ay</button>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2" [class.mb-2]="vaccineError() || conflictCount()">
                    @if (vaccineError(); as ve) {
                        <span class="text-xs text-red-600 dark:text-red-400" role="alert">{{ ve }}</span>
                    }
                    @if (conflictCount()) {
                        <span class="inline-flex items-center gap-1 rounded-border bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-1 text-sm"
                            ><i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ conflictCount() }} çakışma</span
                        >
                    }
                </div>
                <!-- Filtre şeridi: seçim anında sunucuda uygulanır, adres çubuğunda durur; durum çipleri renk açıklamasıdır. -->
                <div class="mb-3">
                    <app-appointment-calendar-filters
                        [filters]="filters()"
                        [vets]="vets()"
                        [vetOrder]="vetOrder()"
                        [canSeeVaccines]="canReadVaccinations"
                        [clinics]="myClinics()"
                        [activeClinicId]="clinicId"
                        (filtersChange)="applyFilters($event)"
                        (clinicChange)="switchClinic($event)"
                    />
                    @if (narrowed()) {
                        <p class="m-0 mt-1 text-xs text-muted-color">Tür ya da durum filtresi açıkken boş saatler gösterilmez; "Boş saat bul" tüm randevulara bakar.</p>
                    }
                    @if (clinicSwitchError(); as ce) {
                        <p class="m-0 mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{{ ce }}</p>
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

            @if (loading() && items().length === 0 && viewMode() !== 'month') {
                <app-loading-state message="Takvim verileri yükleniyor…" />
            } @else if (error(); as err) {
                <app-error-state [detail]="err" (retry)="reload()" />
            } @else if (viewMode() === 'month' && !activePreset()) {
                <app-appointment-calendar-month
                    [weeks]="monthWeeks()"
                    [monthKey]="selectedDate().slice(0, 7)"
                    [today]="today()"
                    [appointmentSummary]="appointmentSummary()"
                    [vaccineSummary]="vaccineSummary()"
                    [capacity]="capacity()"
                    (dayOpen)="openDay($event)"
                />
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
                @if (viewMode() === 'week') {
                    <app-appointment-calendar-week class="hidden lg:block" [days]="weekDays()" [nowMinute]="nowMinute()" [care]="care()" [clinicName]="clinicName" (open)="openDetail($event)" (dayOpen)="openDay($event)" />
                } @else {
                    <!-- Günün özeti (klinik panosu): randevu, tamamlanan, klinikte, sıradaki, aşı, gelmedi. -->
                    <div class="hidden lg:grid gap-2.5 mb-3" [style.grid-template-columns]="'repeat(' + kpis().length + ', minmax(0, 1fr))'" data-testid="calendar-kpis">
                        @for (k of kpis(); track k.label) {
                            <div class="flex items-center gap-2.5 min-w-0 rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 px-3 py-2">
                                <span class="w-[3px] self-stretch rounded-sm" [class]="bar(k.tone)" aria-hidden="true"></span>
                                <b class="text-[22px] leading-none tabular-nums">{{ k.value }}</b>
                                <span class="min-w-0">
                                    <span class="block text-[13px] font-semibold truncate">{{ k.label }}</span>
                                    <span class="block text-[11.5px] text-muted-color truncate">{{ k.sub }}</span>
                                </span>
                            </div>
                        }
                    </div>
                    <!-- Hekim seçici: "Yalnız benim", hekim çipleri; bugün randevusu olmayan hekim gizli. Seçim kullanıcı başına hatırlanır. -->
                    @if (vetChips().length > 1 || hiddenIdleCount()) {
                        <div class="hidden lg:flex items-center gap-1.5 mb-2 overflow-x-auto text-[12.5px]" data-testid="calendar-vet-bar">
                            <span class="text-muted-color whitespace-nowrap">Hekimler:</span>
                            @if (canOnlyMine()) {
                                <button
                                    type="button"
                                    class="h-7 px-2.5 rounded-full border whitespace-nowrap font-semibold cursor-pointer"
                                    [class]="vetPrefs().onlyMine ? 'border-primary bg-primary text-primary-contrast' : 'border-primary text-primary'"
                                    [attr.aria-pressed]="vetPrefs().onlyMine"
                                    (click)="toggleOnlyMine()"
                                >
                                    Yalnız benim
                                </button>
                            }
                            @for (v of vetChips(); track v.id) {
                                <button
                                    type="button"
                                    class="inline-flex items-center gap-1.5 h-7 pl-0.5 pr-2.5 rounded-full border border-surface bg-surface-0 dark:bg-surface-900 whitespace-nowrap cursor-pointer"
                                    [class]="v.on ? 'font-semibold' : 'opacity-50'"
                                    [attr.aria-pressed]="v.on"
                                    (click)="toggleVet(v.id)"
                                    [attr.data-testid]="'calendar-vet-chip-' + v.id"
                                >
                                    <span class="w-[22px] h-[22px] rounded-full grid place-items-center text-[10px] font-bold bg-primary text-primary-contrast" aria-hidden="true">{{ v.initials }}</span>{{ v.name }}
                                </button>
                            }
                            @if (hiddenIdleCount()) {
                                <button type="button" class="text-primary font-semibold whitespace-nowrap cursor-pointer hover:underline" (click)="showIdleVets.set(true)" data-testid="calendar-vet-idle">
                                    +{{ hiddenIdleCount() }} hekimin bu gün randevusu yok
                                </button>
                            }
                        </div>
                    }
                    <div class="hidden lg:grid gap-3" [class]="showRail() ? 'lg:grid-cols-[minmax(0,1fr)_290px]' : ''">
                        <app-appointment-calendar-grid
                            class="min-w-0"
                            [dateKey]="selectedDate()"
                            [columns]="dayColumns()"
                            [vaccines]="dayVaccines()"
                            [start]="bounds().start"
                            [end]="bounds().end"
                            [working]="selectedWorking()"
                            [rowMinutes]="rowStep()"
                            [conflicts]="conflicts()"
                            [canCreate]="canPick()"
                            [nowMinute]="showsToday() ? nowMinute() : null"
                            [care]="care()"
                            [scrollToMinute]="scrollMinute()"
                            [scrollKey]="loadCount() + viewMode() + selectedDate()"
                            [clinicName]="clinicName"
                            (slotPick)="onSlotPick($event)"
                            (open)="openDetail($event)"
                            (vaccinePick)="openVaccine($event)"
                        />
                        @if (showRail()) {
                            <aside class="flex flex-col gap-3 min-w-0">
                                @if (inClinic(); as list) {
                                    <section class="rounded-lg border border-surface bg-surface-0 dark:bg-surface-900 px-3.5 py-3" aria-labelledby="calendar-in-clinic-title" data-testid="calendar-in-clinic">
                                        <h3 id="calendar-in-clinic-title" class="m-0 flex items-center gap-2 text-[15px] font-semibold">
                                            Klinikte <span class="ml-auto text-xs font-semibold text-amber-600 dark:text-amber-400">{{ list.length }} hasta</span>
                                        </h3>
                                        <p class="m-0 mt-0.5 mb-2 text-xs text-muted-color">Kabulden · {{ clockText(nowMinute() ?? 0) }}</p>
                                        @for (p of list; track p.key) {
                                            <div class="flex items-center gap-2.5 py-1.5 border-t border-surface-100 dark:border-surface-800">
                                                <span class="w-[34px] h-[34px] shrink-0 rounded-full grid place-items-center text-[13px] font-bold" [class]="p.waiting ? 'bg-amber-400 text-amber-950' : 'bg-primary text-primary-contrast'" aria-hidden="true">{{ p.initials }}</span>
                                                <span class="min-w-0">
                                                    <b class="block text-sm truncate">{{ p.petName }} · {{ p.clientName }}</b>
                                                    <span class="block text-xs font-semibold truncate" [class]="p.waiting ? 'text-amber-600 dark:text-amber-400' : 'text-primary'">{{ p.status }}</span>
                                                    @if (p.detail) {
                                                        <span class="block text-xs text-muted-color truncate">{{ p.detail }}</span>
                                                    }
                                                </span>
                                            </div>
                                        } @empty {
                                            <p class="m-0 text-sm text-muted-color">Şu an klinikte bekleyen hasta yok.</p>
                                        }
                                        <a pButton [routerLink]="todayRoute" size="small" class="w-full mt-2">Bugün sayfasında aç</a>
                                    </section>
                                }
                                @if (showFinder()) {
                                    <app-appointment-free-slot-finder [clinicId]="clinicId!" [vets]="vets()" [canCreate]="canPick()" [refreshKey]="loadCount()" (pick)="onFreeSlotPick($event)" />
                                }
                            </aside>
                        }
                    </div>
                }
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
    /** "Klinikte" paneli ve kart rozetleri kabul kuyruğundan (Bugün sayfasıyla aynı kaynak). */
    readonly canReadVisits = this.auth.hasOperationClaim(VISITS_READ_CLAIM);
    private readonly canCreateVaccination = this.auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM);
    private readonly canUpdateVaccination = this.auth.hasOperationClaim(VACCINATIONS_UPDATE_CLAIM);
    readonly clinicId = this.auth.getClinicId()?.trim() || null;
    readonly clinicName = this.auth.getClinicName()?.trim() || '';
    private readonly vaccinationsService = inject(VaccinationsService);

    /** Takvim filtreleri (adres çubuğunda `vet`, `types`, `states`; son seçim tarayıcıda hatırlanır). Aşı katmanı "Tür"deki ayrı seçenek. */
    readonly filters = signal<CalendarFilters>(EMPTY_CALENDAR_FILTERS);
    /** Tür ya da durum filtresi: ekrandaki randevular günün tamamı değildir, boş saat hesaplanmaz. */
    readonly narrowed = computed(() => this.filters().types.length > 0 || this.filters().states.length > 0);
    readonly myClinics = signal<ClinicSummary[]>([]);
    readonly clinicSwitchError = signal<string | null>(null);
    readonly vaccines = signal<VaccinationCalendarItemVm[]>([]);
    readonly vaccineError = signal<string | null>(null);
    readonly selectedVaccine = signal<VaccinationCalendarItemVm | null>(null);
    private readonly vaccineMenu = viewChild<Popover>('vaccineMenu');
    private vaccineRequest: Subscription | null = null;
    private appointmentRequest: Subscription | null = null;

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

    /** Sunucu hekim, tür ve durum filtresini uygulamış randevular. */
    readonly visibleItems = computed(() => this.items());
    /** Gösterilen hekimler: filtre bir hekimse yalnız o, "hekim atanmamış"sa hiçbiri, yoksa klinik hekimleri. */
    readonly activeVetIds = computed(() => {
        const vet = this.filters().vet;

        return vet === NO_VET ? [] : vet ? [vet] : this.vetOrder();
    });
    readonly selectedDayItems = computed(() => this.itemsOn(this.selectedDate(), this.visibleItems()));
    readonly selectedWorking = computed(() => workingDayFor(this.gridHours(), this.selectedDate()));

    readonly selectedDayVaccines = computed(() => vaccinesOn(this.selectedDate(), this.vaccines()));
    /** Aşı katmanı bu görünümde istendi mi (filtre "Planlı aşılar"ı içeriyor, hekim seçili değil, yetki var). */
    readonly vaccineLayer = computed(() => this.canReadVaccinations && !this.activePreset() && calendarRequestFor(this.filters()).vaccines);

    /** Gösterilen gün bugün mü (gün görünümü) ya da bugünü içeriyor mu (hafta, ay). */
    readonly showsToday = computed(() => {
        const today = this.today();

        switch (this.viewMode()) {
            case 'week':
                return this.weekKeys().includes(today);
            case 'month':
                return this.selectedDate().slice(0, 7) === today.slice(0, 7);
            default:
                return this.selectedDate() === today;
        }
    });

    /** Gün görünümünde hekim seçimi (kullanıcı başına hatırlanır); "+N hekim" yalnız bu sayfada açılır. */
    readonly vetPrefs = signal<DayVetPrefs>(readDayVetPrefs());
    readonly showIdleVets = signal(false);
    private readonly myUserId = this.auth.getUserId();
    /** Seçili günde randevusu olan hekimler. */
    private readonly busyVetIds = computed(() => new Set(this.selectedDayItems().flatMap((i) => (i.veterinarianUserId ? [i.veterinarianUserId] : []))));
    /** Çipte gösterilen hekimler: randevusu olanlar ("+N" açıldıysa hepsi); hiçbirinin randevusu yoksa hepsi (boş hücreden randevu verilebilsin). */
    private readonly chipVetIds = computed(() => {
        const all = this.activeVetIds();
        const busy = all.filter((id) => this.busyVetIds().has(id));

        return this.showIdleVets() || busy.length === 0 ? all : busy;
    });
    readonly hiddenIdleCount = computed(() => this.activeVetIds().length - this.chipVetIds().length);
    readonly canOnlyMine = computed(() => !!this.myUserId && this.activeVetIds().includes(this.myUserId));
    readonly vetChips = computed(() => {
        const names = new Map(this.vets().map((v) => [v.userId, v.name]));
        const shown = new Set(this.shownVetIds());

        return this.chipVetIds().map((id) => {
            const name = names.get(id) || this.selectedDayItems().find((i) => i.veterinarianUserId === id)?.veterinarianName || 'Hekim';

            return { id, name: name.replace(/^Dr\.\s*/i, ''), initials: initials(name), on: shown.has(id) };
        });
    });
    /** Sütunu açık hekimler: "Yalnız benim" ya da çipte gizlenmemiş olanlar. */
    private readonly shownVetIds = computed(() => {
        const prefs = this.vetPrefs();

        if (prefs.onlyMine && this.canOnlyMine()) {
            return [this.myUserId!];
        }

        const shown = this.chipVetIds().filter((id) => !prefs.hidden.includes(id));

        return shown.length ? shown : this.chipVetIds();
    });

    /** Gün panosu sütunları: açık hekimler, varsa "Hekim seçilmedi"; hekimsiz klinikte tek sütun. */
    readonly dayColumns = computed<DayBoardColumn[]>(() => {
        const items = this.selectedDayItems();
        const ids = this.conflicts();
        const names = new Map(this.vets().map((v) => [v.userId, v.name]));
        const unassigned = items.filter((i) => !i.veterinarianUserId);
        const column = (key: string, vetId: string | null, title: string, own: AppointmentCalendarItemVm[]): DayBoardColumn => ({
            key,
            vetId,
            title,
            blocks: layoutBlocks(own),
            count: own.filter((i) => appointmentTone(i) !== 'off').length,
            left: own.filter((i) => i.state === 'DueToday' || i.state === 'Upcoming').length,
            conflictCount: own.filter((i) => ids.has(i.id)).length
        });

        if (this.filters().vet === NO_VET) {
            return [column(UNASSIGNED, null, 'Hekim seçilmedi', unassigned)];
        }

        if (this.activeVetIds().length === 0) {
            return [column('all', null, 'Randevular', items)];
        }

        const columns = this.shownVetIds().map((id) => {
            const own = items.filter((i) => i.veterinarianUserId === id);

            return column(id, id, names.get(id) || own[0]?.veterinarianName || 'Hekim', own);
        });
        const mineOnly = this.vetPrefs().onlyMine && this.canOnlyMine();

        return unassigned.length && !mineOnly ? [...columns, column(UNASSIGNED, null, 'Hekim seçilmedi', unassigned)] : columns;
    });

    /** "Aşılar" sütunu: saatli olanlar saatinde; saatsiz, mesai dışı ve uygulananlar başlıkta (sözleşme §8.2). */
    readonly dayVaccines = computed<DayBoardVaccines | null>(() => {
        if (!this.vaccineLayer()) {
            return null;
        }

        const { start, end } = this.bounds();
        const all = this.selectedDayVaccines();
        const due = all.filter((v) => v.kind !== 'Applied');
        const timed = due
            .filter((v) => v.timeSpecified)
            .map((item) => ({ item, minute: minutesOf(toIstanbulTimeInputValue(item.atUtc ?? '')) ?? 0 }))
            .sort((a, b) => a.minute - b.minute || a.item.petName.localeCompare(b.item.petName, 'tr'));

        return {
            timed: timed.filter((t) => t.minute >= start && t.minute < end),
            afterHours: timed.filter((t) => t.minute < start || t.minute >= end).map((t) => t.item),
            untimed: due.filter((v) => !v.timeSpecified),
            applied: all.filter((v) => v.kind === 'Applied'),
            waiting: due.length
        };
    });

    /** Hafta: gün başına randevular ve aşı sayısı (aşılar gün görünümünde saatiyle). */
    readonly weekDays = computed<WeekDayColumn[]>(() =>
        this.weekKeys().map((dateKey) => {
            const vaccines = this.vaccineLayer() ? vaccinesOn(dateKey, this.vaccines()) : null;

            return {
                dateKey,
                dayNumber: String(Number(dateKey.slice(8))),
                weekday: WEEKDAY_LONG.format(new Date(`${dateKey}T12:00:00Z`)),
                today: dateKey === this.today(),
                closed: !workingDayFor(this.gridHours(), dateKey),
                items: this.itemsOn(dateKey, this.visibleItems()),
                vaccines: vaccines ? { total: vaccines.length, overdue: vaccines.filter((v) => v.state === 'Overdue').length } : null
            };
        })
    );

    /** Kabul kuyruğu (Bugün sayfasıyla aynı kaynak): randevu kimliği → bekliyor / muayenede. Yalnız bugünü gösterirken. */
    readonly todayVisits = signal<TodayItemVm[]>([]);
    readonly care = computed<ReadonlyMap<string, CareMark>>(() => {
        const map = new Map<string, CareMark>();

        for (const v of this.todayVisits()) {
            if (v.appointmentId && v.careStatus === 'Waiting') {
                map.set(v.appointmentId, { kind: 'wait', since: v.arrivedAtUtc });
            } else if (v.appointmentId && v.careStatus === 'InProgress') {
                map.set(v.appointmentId, { kind: 'room' });
            }
        }

        return map;
    });
    /** "Klinikte" paneli: bekleyenler (geliş saatiyle) ve muayenedekiler; `null`: gösterilmez (bugün değil ya da yetki yok). */
    readonly inClinic = computed(() => {
        if (!this.canReadVisits || this.selectedDate() !== this.today()) {
            return null;
        }

        return this.todayVisits()
            .filter((v) => v.careStatus === 'Waiting' || v.careStatus === 'InProgress')
            .sort((a, b) => Number(b.careStatus === 'InProgress') - Number(a.careStatus === 'InProgress') || (a.arrivedAtUtc ?? '').localeCompare(b.arrivedAtUtc ?? ''))
            .map((v) => {
                const waiting = v.careStatus === 'Waiting';
                const vet = v.responsibleVeterinarianName ? ` · ${v.responsibleVeterinarianName}` : '';
                const arrived = v.arrivedAtUtc ? toIstanbulTimeInputValue(v.arrivedAtUtc) : '';

                return {
                    key: v.key,
                    petName: v.petName,
                    clientName: v.clientName,
                    initials: initials(v.petName + ' ' + v.clientName),
                    waiting,
                    status: (waiting ? `Bekliyor${arrived ? ` ${waitedSince(v.arrivedAtUtc!)} dk` : ''}` : 'Muayenede') + vet,
                    detail: [arrived ? `${arrived}'de geldi` : '', v.appointmentReasonName ?? ''].filter((x) => !!x).join(' · ')
                };
            });
    });
    readonly showRail = computed(() => this.showFinder() || this.inClinic() !== null);

    /** Günün özeti (klinik panosu). */
    readonly kpis = computed(() => {
        const items = this.selectedDayItems();
        const live = items.filter((i) => appointmentTone(i) !== 'off');
        const done = items.filter((i) => i.state === 'Completed').length;
        const noShow = items.filter((i) => (typeof i.status === 'number' ? i.status : String(i.status)) === 3 || String(i.status) === 'NoShow').length;
        const today = this.selectedDate() === this.today();
        const now = today ? (this.nowMinute() ?? 0) : -1;
        const next = live
            .filter((i) => i.state !== 'Completed')
            .map((i) => ({ i, start: toBlockTimes(i)?.start ?? 0 }))
            .filter((x) => x.start >= now)
            .sort((a, b) => a.start - b.start)[0];
        const out: { label: string; value: string; sub: string; tone: CalendarTone }[] = [
            { label: 'Randevu', value: String(live.length), sub: today ? 'bugün toplam' : 'gün toplamı', tone: 'room' },
            { label: 'Tamamlandı', value: String(done), sub: live.length ? `%${Math.round((done / live.length) * 100)}` : '—', tone: 'done' }
        ];
        const clinic = this.inClinic();

        if (clinic) {
            const waiting = clinic.filter((p) => p.waiting).length;

            out.push({ label: 'Klinikte', value: String(clinic.length), sub: `${waiting} bekliyor · ${clinic.length - waiting} muayenede`, tone: 'today' });
        }

        out.push({
            label: 'Sıradaki',
            value: next ? clockLabel(next.start) : '—',
            sub: next ? `${next.i.petName}${next.i.veterinarianName ? ' · ' + next.i.veterinarianName : ''}` : 'kalan randevu yok',
            tone: 'up'
        });

        const vax = this.dayVaccines();

        if (vax) {
            out.push({ label: 'Aşı bekliyor', value: String(vax.waiting), sub: `${vax.applied.length} uygulandı · ${vax.untimed.length} saatsiz`, tone: 'today' });
        }

        out.push({ label: 'Gelmedi', value: String(noShow), sub: noShow ? 'randevu' : today ? 'bugün yok' : 'yok', tone: 'overdue' });

        return out;
    });

    /** Gün görünümündeki randevu blokları; ızgara o günün çalışma saati ile randevularının birleşimine ölçeklenir (aşı genişletmez). */
    private readonly viewBlocks = computed(() => layoutBlocks(this.selectedDayItems()));
    readonly bounds = computed(() => gridBounds([workingDayFor(this.hours(), this.selectedDate())], this.viewBlocks()));
    /** Açılışta bugün şimdiki saate, başka günde ilk kayda (yoksa açılışa) kaydırılır; her yüklemede bir kez. */
    readonly scrollMinute = computed(() =>
        this.selectedDate() === this.today() && this.nowMinute() !== null ? this.nowMinute() : firstScrollMinute(this.viewBlocks(), workingDayFor(this.hours(), this.selectedDate()))
    );

    readonly conflictCount = computed(() => {
        const ids = this.conflicts();
        const inView = (this.viewMode() === 'week' ? this.visibleItems() : this.selectedDayItems()).filter((i) => ids.has(i.id));

        return Math.ceil(inView.length / 2);
    });

    /** Ay görünümü: ızgara haftaları ve gün özetleri (sunucuda sayılır; sözleşme §7). */
    readonly monthWeeks = computed(() => monthGridWeeks(this.selectedDate()));
    readonly appointmentSummary = signal<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());
    readonly vaccineSummary = signal<ReadonlyMap<string, CalendarDaySummaryVm>>(new Map());
    /** Gün başına kapasite (doluluk rengi; sözleşme §8.4); alınamazsa boş (renk yok). */
    readonly capacity = signal<ReadonlyMap<string, number>>(new Map());
    private capacityRequest: Subscription | null = null;
    private visitsRequest: Subscription | null = null;

    readonly rangeTitle = computed(() => {
        const date = this.selectedDate();

        if (this.viewMode() === 'month') {
            const title = MONTH_TITLE.format(new Date(`${date.slice(0, 7)}-15T12:00:00Z`));

            return title.charAt(0).toLocaleUpperCase('tr') + title.slice(1);
        }

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
        if (this.narrowed()) {
            return [];
        }

        const working = this.selectedWorking();
        const items = this.selectedDayItems();
        const vetIds = this.activeVetIds().filter((id) => this.vets().some((v) => v.userId === id));

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
            const hasFilterParams = ['vet', 'types', 'states'].some((k) => params.has(k));

            // Adreste filtre yoksa son seçim geri yüklenir; adres de güncellenir (yenilemede kaybolmaz).
            if (!preset && !hasFilterParams) {
                const stored = readStoredCalendarFilters();

                if (stored.vet || stored.types.length || stored.states.length) {
                    this.filters.set(stored);
                    this.navigate({}, true);

                    return;
                }
            }

            this.activePreset.set(preset);
            this.filters.set(preset ? EMPTY_CALENDAR_FILTERS : parseCalendarFilters(params));
            const view = params.get('view');

            this.viewMode.set(!preset && (view === 'week' || view === 'month') ? view : 'day');
            this.selectedDate.set(!preset && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : istanbulTodayYmd());
            this.reload();
        });
    }

    /** Filtre seçimi anında uygulanır: adres çubuğuna yazılır (yeniden yükleme oradan), son seçim hatırlanır. */
    applyFilters(f: CalendarFilters): void {
        writeStoredCalendarFilters(f);
        this.filters.set(f);
        this.navigate({});
    }

    /** Şube: takvim aktif klinikle çalışır; aktif klinik değişir ve takvim aynı görünüm ve filtrelerle yeni klinikte açılır (sözleşme §6.4). */
    switchClinic(clinic: ClinicSummary): void {
        this.clinicSwitchError.set(null);
        this.auth.selectClinic(clinic.id, clinic.name).subscribe({
            next: () => window.location.replace(this.router.url),
            error: (e: unknown) => this.clinicSwitchError.set(panelHttpFailureMessage(e, 'Şube değiştirilemedi.'))
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

    /**
     * Ay görünümü: ızgaranın tüm günleri (en çok 42) tek istekte, gün başına sayı; randevu ve aşı aynı filtrelerle (aşı katmanı kuralı
     * gün/hafta ile aynı). Kayıtlar çekilmez.
     */
    private reloadMonth(): void {
        const weeks = this.monthWeeks();
        const last = weeks.at(-1)![6];
        const from = dateOnlyInputToIstanbulStartUtcIso(weeks[0][0]);
        const to = dateOnlyInputToIstanbulStartUtcIso(addGregorianDaysToYmd(last, 1) ?? last);
        const req = calendarRequestFor(this.filters());

        this.today.set(istanbulTodayYmd());
        this.requestLayerRange.set({ fromUtc: from, toUtc: to });
        this.items.set([]);
        this.vaccines.set([]);
        this.error.set(null);
        this.vaccineError.set(null);
        this.loading.set(true);
        this.appointmentRequest?.unsubscribe();
        this.vaccineRequest?.unsubscribe();

        const empty = new Map<string, CalendarDaySummaryVm>();
        const appointments = req.appointments
            ? this.appointments.getCalendarSummary({
                  dateFromUtc: from,
                  dateToUtc: to,
                  veterinarianUserId: req.veterinarianUserId,
                  withoutVeterinarian: req.withoutVeterinarian,
                  appointmentTypes: req.appointmentTypes,
                  states: req.states
              })
            : of(empty);

        this.appointmentRequest = appointments.subscribe({
            next: (s) => {
                this.appointmentSummary.set(s);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(panelHttpFailureMessage(e, 'Takvim özeti yüklenemedi.'));
                this.loading.set(false);
            }
        });

        // Doluluk rengi: kapasite backend'de (çalışma saati ve randevu süresinden, sözleşme §8.4); alınamazsa renk yok.
        this.capacityRequest?.unsubscribe();
        this.capacityRequest = this.appointments.getCalendarCapacity({ dateFromUtc: from, dateToUtc: to, veterinarianUserId: req.veterinarianUserId }).subscribe({
            next: (c) => this.capacity.set(c),
            error: () => this.capacity.set(new Map())
        });

        if (!req.vaccines || !this.canReadVaccinations) {
            this.vaccineSummary.set(empty);

            return;
        }

        this.vaccineRequest = this.vaccinationsService.getCalendarSummary({ dateFromUtc: from, dateToUtc: to, states: req.states }).subscribe({
            next: (s) => this.vaccineSummary.set(s),
            error: () => {
                this.vaccineSummary.set(empty);
                this.vaccineError.set('Aşılar yüklenemedi.');
            }
        });
    }

    reload(): void {
        if (this.viewMode() === 'month' && !this.activePreset()) {
            this.reloadMonth();

            return;
        }

        const preset = this.presetQuery();
        const keys = this.weekKeys();
        const from = preset?.start.toISOString() ?? dateOnlyInputToIstanbulStartUtcIso(keys[0]);
        const to = preset?.endExclusive.toISOString() ?? dateOnlyInputToIstanbulStartUtcIso(addGregorianDaysToYmd(keys[6], 1) ?? keys[6]);

        const req = calendarRequestFor(this.filters());

        this.today.set(istanbulTodayYmd());
        this.requestLayerRange.set({ fromUtc: from, toUtc: to });
        this.loading.set(true);
        this.error.set(null);
        // Hızlı gezinmede ve filtre değişiminde eski yanıt yenisini ezmesin.
        this.appointmentRequest?.unsubscribe();
        const source = req.appointments
            ? this.appointments.getCalendarAppointments({
                  dateFromUtc: from,
                  dateToUtc: to,
                  status: preset?.status,
                  veterinarianUserId: req.veterinarianUserId,
                  withoutVeterinarian: req.withoutVeterinarian,
                  appointmentTypes: req.appointmentTypes,
                  states: req.states
              })
            : of([]);

        this.appointmentRequest = source.subscribe({
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
        this.loadVaccines(preset || !req.vaccines ? null : { dateFromUtc: from, dateToUtc: to, states: req.states });
        this.loadTodayVisits(!preset && keys.includes(this.today()));
    }

    /** Kabul kuyruğu: "Klinikte" paneli ve kart rozetleri (bekliyor / muayenede); yalnız bugünü içeren görünümde ve okuma izniyle. */
    private loadTodayVisits(includesToday: boolean): void {
        this.visitsRequest?.unsubscribe();

        if (!includesToday || !this.canReadVisits) {
            this.todayVisits.set([]);

            return;
        }

        this.visitsRequest = this.visits.getToday().subscribe({
            next: (t) => this.todayVisits.set(t.items),
            error: () => this.todayVisits.set([])
        });
    }

    openVaccine(pick: VaccinePick): void {
        this.selectedVaccine.set(pick.item);
        this.vaccineMenu()?.show(pick.event, pick.event.currentTarget ?? pick.event.target);
    }

    vaccineStateText(v: VaccinationCalendarItemVm): string {
        // Menüde aşıya özgü metin ("bugün yapılacak", "uygulandı").
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

    /** `null`: aşı katmanı istenmiyor (hazır liste, tür filtresinde "Planlı aşılar" yok ya da belirli bir hekim seçili). */
    private loadVaccines(range: { dateFromUtc: string; dateToUtc: string; states: readonly string[] } | null): void {
        // Hızlı gezinmede eski aralığın geç gelen yanıtı yenisini ezmesin.
        this.vaccineRequest?.unsubscribe();

        if (!range || !this.canReadVaccinations) {
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
        this.createAppointment({ date: pick.dateKey, time: clockLabel(pick.minute), vet: pick.vetId });
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

    protected readonly legend = LEGEND;
    protected readonly todayRoute = TODAY_ROUTE;

    bar(tone: CalendarTone): string {
        return toneBarClass(tone);
    }

    clockText(minute: number): string {
        return clockLabel(minute);
    }

    segClass(mode: CalendarViewMode): string {
        return this.viewMode() === mode ? 'bg-surface-0 dark:bg-surface-900 font-semibold shadow-sm' : 'text-muted-color';
    }

    /** "Yalnız benim" ve hekim çipleri; seçim kullanıcı başına tarayıcıda hatırlanır. */
    toggleOnlyMine(): void {
        this.saveVetPrefs({ ...this.vetPrefs(), onlyMine: !this.vetPrefs().onlyMine });
    }

    /** Çip sütunu açar ya da kapar; "Yalnız benim" açıkken bir çipe basmak onu kapatır ve yalnız o hekimi ekler. */
    toggleVet(id: string): void {
        const prefs = this.vetPrefs();

        if (prefs.onlyMine) {
            this.saveVetPrefs({ onlyMine: false, hidden: this.chipVetIds().filter((x) => x !== id && x !== this.myUserId) });

            return;
        }

        this.saveVetPrefs({ onlyMine: false, hidden: prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id] });
    }

    private saveVetPrefs(p: DayVetPrefs): void {
        writeDayVetPrefs(p);
        this.vetPrefs.set(p);
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

    private itemsOn(dateKey: string, items: readonly AppointmentCalendarItemVm[]): AppointmentCalendarItemVm[] {
        return items.filter((i) => toBlockTimes(i)?.dateKey === dateKey);
    }

    private freeVetAt(dateKey: string, minute: number): string | null {
        const vetIds = this.activeVetIds().filter((id) => this.vets().some((v) => v.userId === id));

        return firstFreeVeterinarian(vetIds, this.items(), dateKey, minute, this.rowStep());
    }

    private move(step: number): void {
        if (this.viewMode() === 'month') {
            const first = shiftMonth(this.selectedDate(), step);

            this.navigate({ date: first.slice(0, 7) === istanbulTodayYmd().slice(0, 7) ? null : first });

            return;
        }

        const days = this.viewMode() === 'week' ? 7 : 1;
        const date = addGregorianDaysToYmd(this.selectedDate(), step * days) ?? this.selectedDate();

        this.navigate({ date: date === istanbulTodayYmd() ? null : date });
    }

    /** Görünüm, gün ve filtreler adreste tutulur (geri dön bağlantısı aynı yere döner); `null` varsayılana (gün, bugün) döner. */
    private navigate(params: { view?: CalendarViewMode; date?: string | null }, replaceUrl = false): void {
        const view = params.view ?? this.viewMode();
        const date = params.date === undefined ? (this.selectedDate() === istanbulTodayYmd() ? null : this.selectedDate()) : params.date;

        void this.router.navigate(['/panel/appointments/calendar'], {
            queryParams: { view: view === 'day' ? undefined : view, date: date ?? undefined, ...calendarFiltersToQueryParams(this.filters()) },
            ...(replaceUrl ? { replaceUrl } : {})
        });
    }

    private loadClinicSetup(): void {
        if (!this.clinicId) {
            return;
        }

        // Şube filtresi yalnız birden çok kliniğe erişende görünür.
        this.auth.getMyClinics().subscribe({ next: (c) => this.myClinics.set(c.filter((x) => x.isActive !== false)), error: () => this.myClinics.set([]) });

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

/** Ayın ilk günü (yyyy-MM-01), `step` ay ileri ya da geri. */
function shiftMonth(dateKey: string, step: number): string {
    const y = Number(dateKey.slice(0, 4));
    const m = Number(dateKey.slice(5, 7)) - 1 + step;
    const year = y + Math.floor(m / 12);
    const month = ((m % 12) + 12) % 12;

    return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** Gelişten bu yana geçen dakika ("Bekliyor 8 dk"). */
function waitedSince(arrivedAtUtc: string): number {
    return Math.max(0, Math.round((Date.now() - new Date(arrivedAtUtc).getTime()) / 60_000));
}
