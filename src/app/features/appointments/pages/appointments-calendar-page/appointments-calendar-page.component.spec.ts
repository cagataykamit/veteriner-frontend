import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
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
    ...extra
});

const week = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, dayLabel: '', isClosed: false, opensAt: '09:00', closesAt: '19:00', breakStartsAt: '12:30', breakEndsAt: '13:30' }));

describe('AppointmentsCalendarPageComponent — saat ızgarası (B1)', () => {
    let getCalendarAppointments: Mock;
    let navigate: Mock;
    let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    afterEach(() => vi.useRealTimers());

    const create = (items: AppointmentCalendarItemVm[], query: Record<string, string> = {}) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:40:00+03:00'));
        getCalendarAppointments = vi.fn().mockReturnValue(of(items));
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
                { provide: AuthService, useValue: { getClinicId: () => 'c1', hasOperationClaim: (c: string) => c === APPOINTMENTS_CREATE_CLAIM } },
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

    it('zamanı geçmiş preset: eski gruplu liste', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1')], { preset: 'overdue-appointments' });

        expect(cmp.isPresetDateGroupedMode()).toBe(true);
        expect(el.querySelector('[data-testid="calendar-grid"]')).toBeNull();
        expect(el.textContent).toContain('Zamanı geçmiş randevular filtreleniyor.');
    });
});
