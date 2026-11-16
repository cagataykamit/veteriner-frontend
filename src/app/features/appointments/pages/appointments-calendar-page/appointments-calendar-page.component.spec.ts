import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM, VACCINATIONS_CREATE_CLAIM, VACCINATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { VaccinationsService } from '@/app/entities/vaccination/services/vaccinations.service';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { AppointmentsCalendarPageComponent } from './appointments-calendar-page.component';

/** İstanbul 16.11.2026 (pazartesi) hh:mm. */
const at = (hm: string, day = 16): string => {
    const [h, m] = hm.split(':').map(Number);

    return new Date(Date.UTC(2026, 10, day, h - 3, m)).toISOString();
};

const appt = (id: string, hm: string, vet: string | null, extra: Partial<AppointmentCalendarItemVm> = {}): AppointmentCalendarItemVm => ({
    id,
    clinicId: 'c1',
    petId: `pet-${id}`,
    clientId: null,
    scheduledAtUtc: at(hm),
    scheduledEndUtc: null,
    durationMinutes: 30,
    durationLabel: '30 dk',
    localDateLabel: '',
    timeLabel: hm,
    timeRangeLabel: hm,
    status: 0,
    statusLabel: 'Planlandı',
    statusSeverity: 'info',
    appointmentTypeLabel: 'Muayene',
    petName: `Hasta-${id}`,
    clientName: 'Sahip',
    veterinarianUserId: vet,
    veterinarianName: vet ? `Dr. ${vet}` : '',
    reasonName: null,
    notes: null,
    ...extra
});

const week = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, dayLabel: '', isClosed: false, opensAt: '09:00', closesAt: '19:00', breakStartsAt: '12:30', breakEndsAt: '13:30' }));

const vaccine = (id: string, dateKey: string, state: VaccinationCalendarItemVm['state'], kind: VaccinationCalendarItemVm['kind'] = 'NextDue'): VaccinationCalendarItemVm => ({
    key: `${id}:${kind}`,
    vaccinationId: id,
    kind,
    state,
    dateKey,
    atUtc: `${dateKey}T09:00:00Z`,
    petId: `pet-${id}`,
    petName: `Aşılı-${id}`,
    clientId: `client-${id}`,
    clientName: 'Sahip',
    vaccineDefinitionId: 'def-karma',
    vaccineName: 'Karma',
    notes: null
});

describe('AppointmentsCalendarPageComponent — saat ızgarası (B1)', () => {
    let getCalendarAppointments: Mock;
    let getCalendarVaccinations: Mock;
    let navigate: Mock;
    let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let claims: Set<string>;

    beforeEach(() => {
        claims = new Set([APPOINTMENTS_CREATE_CLAIM]);
        localStorage.removeItem('vetinity.calendar.vaccineLayer');
    });

    afterEach(() => vi.useRealTimers());

    const create = (items: AppointmentCalendarItemVm[], query: Record<string, string> = {}, vaccines: VaccinationCalendarItemVm[] = []) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:40:00+03:00'));
        getCalendarAppointments = vi.fn().mockReturnValue(of(items));
        getCalendarVaccinations = vi.fn().mockReturnValue(of(vaccines));
        params = new BehaviorSubject(convertToParamMap(query));
        TestBed.configureTestingModule({
            imports: [AppointmentsCalendarPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable(), snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AppointmentsService, useValue: { getCalendarAppointments } },
                { provide: ClinicsService, useValue: { getWorkingHours: () => of(week), getAppointmentSettings: () => of({ slotIntervalMinutes: 15 }) } },
                {
                    provide: VisitsService,
                    useValue: {
                        getVeterinarians: () =>
                            of([
                                { userId: 'v1', name: 'Dr. Ayşe' },
                                { userId: 'v2', name: 'Dr. Mert' }
                            ])
                    }
                },
                { provide: AppointmentReasonsService, useValue: { list: () => of([]) } },
                { provide: OnlineBookingService, useValue: { availability: () => of([]) } },
                { provide: VaccinationsService, useValue: { getCalendarVaccinations } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as Mock;
        const fixture = TestBed.createComponent(AppointmentsCalendarPageComponent);

        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    };

    it('gün görünümü: gün adı başlıkta, hekim başına sütun, hekimsiz randevu için ayrı sütun; hafta aralığı tek istekte yüklenir', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1'), appt('b', '10:00', 'v2'), appt('c', '11:00', null)]);

        expect(el.querySelector('[data-testid="calendar-range-title"]')?.textContent).toContain('Bugün · Pazartesi');
        expect(cmp.gridColumns().map((c) => c.title)).toEqual(['Dr. Ayşe', 'Dr. Mert', 'Hekim seçilmedi']);
        expect(el.querySelector('[data-testid="calendar-block-a"]')?.textContent).toContain('Hasta-a');
        expect(getCalendarAppointments).toHaveBeenCalledWith({ dateFromUtc: '2026-11-15T21:00:00.000Z', dateToUtc: '2026-11-22T21:00:00.000Z', status: undefined });
    });

    it('aynı hekimde üst üste binen randevular çakışma olarak işaretlenir; farklı hekimler işaretlenmez', () => {
        const { el, cmp } = create([appt('a', '14:00', 'v1'), appt('b', '14:15', 'v1'), appt('c', '14:00', 'v2')]);

        expect([...cmp.conflicts()].sort()).toEqual(['a', 'b']);
        expect(el.textContent).toContain('1 çakışma');
        expect(el.querySelector('[data-testid="calendar-block-c"]')?.textContent).not.toContain('Çakışma');
    });

    it('boş hücreye tıklayınca tarih, saat ve sütunun hekimi dolu Yeni randevu açılır', () => {
        const { el } = create([]);
        const cell = el.querySelector<HTMLButtonElement>('[aria-label="Yeni randevu Dr. Mert 14:00"]');

        cell!.click();

        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '14:00', vet: 'v2' } });
        expect(el.querySelector('[aria-label="Yeni randevu Dr. Mert 13:00"]')).toBeNull();
    });

    it('hafta görünümü: yedi gün sütunu; boş hücrede o saatte boş ilk hekim önerilir; gün başlığı o güne geçer', () => {
        const { el, cmp } = create([appt('a', '14:00', 'v1')], { view: 'week' });

        expect(cmp.gridColumns().map((c) => c.dateKey)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
        expect(cmp.gridColumns()[6].working).toBeNull();
        cmp.onSlotPick({ column: cmp.gridColumns()[0], minute: 14 * 60 });

        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '14:00', vet: 'v2' } });
        el.querySelector<HTMLButtonElement>('[data-testid="calendar-column-2026-11-18"]')!.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/calendar'], { queryParams: { view: undefined, date: '2026-11-18' } });
    });

    it('telefon ajandası: randevular saat sırasıyla, herkesin boş olduğu aralıklar satır olarak', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1'), appt('b', '09:00', 'v2')]);

        expect(el.querySelector('[data-testid="agenda-item-a"]')).not.toBeNull();
        expect(cmp.agendaGaps()[0]).toEqual({ start: 570, end: 750 });
        el.querySelector<HTMLButtonElement>('[data-testid="agenda-gap"]')!.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '09:30', vet: 'v1' } });
    });

    it('aşı katmanı: aşılar günün üst şeridinde; randevu sayılmaz (çakışma ve boş saatler değişmez)', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, cmp } = create([appt('a', '09:00', 'v1')], {}, [vaccine('x', '2026-11-16', 'DueToday'), vaccine('y', '2026-11-16', 'Overdue', 'Planned'), vaccine('z', '2026-11-18', 'Upcoming')]);

        expect(getCalendarVaccinations).toHaveBeenCalledWith({ dateFromUtc: '2026-11-15T21:00:00.000Z', dateToUtc: '2026-11-22T21:00:00.000Z' });
        const strip = el.querySelector('[data-testid="calendar-all-day"]');

        expect(strip?.textContent).toContain('Aşılı-x');
        expect(strip?.textContent).not.toContain('Aşılı-z');
        // Gecikmiş önce, sonra bugün.
        expect(cmp.selectedDayVaccines().map((v) => v.vaccinationId)).toEqual(['y', 'x']);
        expect(cmp.gridColumns().map((c) => c.title)).toEqual(['Dr. Ayşe', 'Dr. Mert']);
        expect(cmp.conflicts().size).toBe(0);
        expect(el.querySelector('[data-testid="agenda-vaccines"]')?.textContent).toContain('Aşılı-x');
    });

    it('aşı katmanı kapatılınca şerit gizlenir ve seçim hatırlanır', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, fixture } = create([], {}, [vaccine('x', '2026-11-16', 'DueToday')]);

        el.querySelector<HTMLButtonElement>('[data-testid="calendar-vaccine-layer-toggle"]')!.click();
        fixture.detectChanges();

        expect(el.querySelector('[data-testid="calendar-all-day"]')).toBeNull();
        expect(localStorage.getItem('vetinity.calendar.vaccineLayer')).toBe('off');
    });

    it('aşı yetkisi yoksa katman düğmesi yok ve aşı istenmez', () => {
        const { el } = create([]);

        expect(el.querySelector('[data-testid="calendar-vaccine-layer-toggle"]')).toBeNull();
        expect(getCalendarVaccinations).not.toHaveBeenCalled();
    });

    it('sonraki aşıdan "Aşıyı yap" hasta ve aşı dolu yeni aşı; "Randevu ver" aşılama türü ve not dolu yeni randevu açar', () => {
        claims.add(VACCINATIONS_READ_CLAIM).add(VACCINATIONS_CREATE_CLAIM);
        const { cmp } = create([]);
        const v = vaccine('x', '2026-11-18', 'Upcoming');

        expect(cmp.canApplyVaccine(v)).toBe(true);
        cmp.applyVaccine(v);
        expect(navigate).toHaveBeenCalledWith(['/panel/vaccinations/new'], {
            queryParams: expect.objectContaining({ clientId: 'client-x', petId: 'pet-x', vaccineDefinitionId: 'def-karma', status: 1 })
        });

        cmp.bookForVaccine(v);
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], {
            queryParams: expect.objectContaining({ clientId: 'client-x', petId: 'pet-x', date: '2026-11-18', type: 1, notes: 'Aşı: Karma' })
        });

        cmp.bookForVaccine(vaccine('old', '2026-11-10', 'Overdue'));
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/new'], { queryParams: expect.objectContaining({ date: undefined }) });
    });

    it('randevuya tıklayınca sayfadan çıkılmaz; ayrıntı pencerede açılır, düzenleme aynı pencerede', () => {
        const { cmp } = create([appt('a', '09:00', 'v1')]);

        cmp.openDetail('a');
        expect(cmp.dialog()).toEqual({ id: 'a', mode: 'detail' });
        expect(navigate).not.toHaveBeenCalled();
    });

    it('pencere kapanınca takvim yalnız değişiklik olduysa yenilenir', () => {
        const { cmp } = create([appt('a', '09:00', 'v1')]);

        cmp.dialog.set({ id: 'a', mode: 'detail' });
        cmp.closeDialog();
        expect(getCalendarAppointments).toHaveBeenCalledTimes(1);

        cmp.dialog.set({ id: 'a', mode: 'detail' });
        cmp.calendarDirty = true;
        cmp.closeDialog();
        expect(getCalendarAppointments).toHaveBeenCalledTimes(2);
        expect(cmp.dialog()).toBeNull();
    });

    it('zamanı geçmiş preset: eski gruplu liste', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1')], { preset: 'overdue-appointments' });

        expect(cmp.isPresetDateGroupedMode()).toBe(true);
        expect(el.querySelector('[data-testid="calendar-grid"]')).toBeNull();
        expect(el.textContent).toContain('Zamanı geçmiş randevular filtreleniyor.');
    });
});
