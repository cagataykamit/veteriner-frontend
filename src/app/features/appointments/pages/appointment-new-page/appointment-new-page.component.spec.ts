import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { isObservable, type Observable, of, Subject, throwError } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { AppointmentNewPageComponent } from './appointment-new-page.component';

const day = (dayOfWeek: number, isClosed = false): ClinicWorkingHourVm => ({
    dayOfWeek,
    dayLabel: '',
    isClosed,
    opensAt: isClosed ? null : '08:00',
    closesAt: isClosed ? null : '18:00',
    breakStartsAt: null,
    breakEndsAt: null
});

describe('AppointmentNewPageComponent — varsayılanlar (H1)', () => {
    afterEach(() => vi.useRealTimers());

    /** Varsayılan: müsaitlik alınamadı; form çalışma saatine göre önerir. */
    let availability: (reasonId: string | null) => Observable<StaffAvailabilityDayVm[]> = () => throwError(() => new Error('yok'));

    beforeEach(() => {
        availability = () => throwError(() => new Error('yok'));
    });

    const settingsOf = (enforceWorkingHours: boolean) => ({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 30, enforceWorkingHours });

    const create = (
        hours: ClinicWorkingHourVm[] | Observable<ClinicWorkingHourVm[]>,
        query: Record<string, string> = {},
        enforceWorkingHours = true,
        settings: Observable<ReturnType<typeof settingsOf>> = of(settingsOf(enforceWorkingHours))
    ) => {
        TestBed.configureTestingModule({
            imports: [AppointmentNewPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', getUserId: () => 'u1', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClinicsService, useValue: { getWorkingHours: () => (isObservable(hours) ? hours : of(hours)), getAppointmentSettings: () => settings } },
                { provide: OnlineBookingService, useValue: { availability: (_clinicId: string, reasonId: string | null) => availability(reasonId) } }
            ]
        });
        const fixture = TestBed.createComponent(AppointmentNewPageComponent);

        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const slot = (startUtc: string, vets: string[]) => ({ startUtc, endUtc: startUtc, freeVeterinarianUserIds: vets });
    const freeDays: StaffAvailabilityDayVm[] = [
        { date: '2026-11-16', slots: [slot('2026-11-16T08:00:00Z', ['v1']), slot('2026-11-16T08:30:00Z', ['v2'])] },
        { date: '2026-11-17', slots: [slot('2026-11-17T11:00:00Z', ['v1', 'v2'])] }
    ];

    describe('boş saatler (O9)', () => {
        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['Date'] });
            vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
            availability = () => of(freeDays);
        });

        it('ilk boş saat müsaitlikten önden seçilir (dolu 10:30 atlanır)', () => {
            const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

            expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-16');
            expect(cmp.form.controls.scheduledTime.value).toBe('11:00');
            expect(cmp.slotDays().map((d) => d.date)).toEqual(['2026-11-16', '2026-11-17']);
        });

        it('hekim değişince önden seçilen saat o hekimin ilk boş saatine kayar; kullanıcı seçimi korunur', () => {
            const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

            cmp.form.controls.veterinarianUserId.setValue('v2');
            expect(cmp.form.controls.scheduledTime.value).toBe('11:30');

            cmp.pickSlot({ date: '2026-11-17', time: '14:00' });
            cmp.form.controls.veterinarianUserId.setValue('v1');
            expect(cmp.form.getRawValue()).toEqual(expect.objectContaining({ scheduledDate: '2026-11-17', scheduledTime: '14:00' }));
            expect(cmp.form.dirty).toBe(true);
        });

        it('gün şeridi günü ve o günün ilk boş saatini seçer', () => {
            const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

            cmp.pickSlotDay('2026-11-17');

            expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-17');
            expect(cmp.form.controls.scheduledTime.value).toBe('14:00');
        });

        it('neden değişince boş saatler o nedenin süresiyle yeniden alınır', () => {
            const reasons: (string | null)[] = [];

            availability = (reasonId) => {
                reasons.push(reasonId);

                return of(freeDays);
            };
            const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

            cmp.form.controls.reasonId.setValue('r1');

            expect(reasons).toEqual([null, 'r1']);
        });
    });

    it('takvimden gelen tarih, saat ve hekim formu doldurur; ilk uygun saat önerisi yapılmaz', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
        const cmp = create(
            [0, 1, 2, 3, 4, 5, 6].map((d) => day(d)),
            { date: '2026-11-18', time: '14:00', vet: 'v2' }
        );

        expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-18');
        expect(cmp.form.controls.scheduledTime.value).toBe('14:00');
        expect(cmp.form.controls.veterinarianUserId.value).toBe('v2');
    });

    it('randevu ayarı çalışma saatlerinden önce gelse de takvimden gelen saat silinmez', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
        const hours = new Subject<ClinicWorkingHourVm[]>();
        const settings = new Subject<ReturnType<typeof settingsOf>>();
        const cmp = create(hours, { date: '2026-11-18', time: '10:00', room: 'r1' }, true, settings);

        settings.next(settingsOf(true));
        expect(cmp.form.controls.scheduledTime.value).toBe('10:00');
        hours.next([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

        expect(cmp.form.getRawValue()).toEqual(expect.objectContaining({ scheduledDate: '2026-11-18', scheduledTime: '10:00', roomResourceId: 'r1' }));
        expect(cmp.timeOptions().some((o) => o.value === '10:00')).toBe(true);
    });

    it('takvimin kaynak sütunundan gelen oda ya da cihaz formu doldurur', () => {
        const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)), { date: '2026-11-18', time: '14:00', room: 'r1', equipment: 'e1' });

        expect(cmp.form.controls.roomResourceId.value).toBe('r1');
        expect(cmp.form.controls.equipmentResourceId.value).toBe('e1');
    });

    it('tür Muayene seçili gelir', () => {
        const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

        expect(cmp.form.controls.appointmentType.value).toBe(0);
    });

    it('bugünün saatleri geçtiyse kapalı günü atlayıp ilk açık günün ilk saati seçilir', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        // Pazartesi 16.11.2026 20:00; salı kapalı.
        vi.setSystemTime(new Date('2026-11-16T20:00:00+03:00'));
        const cmp = create([0, 1, 3, 4, 5, 6].map((d) => day(d)).concat(day(2, true)));

        expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-18');
        expect(cmp.form.controls.scheduledTime.value).toBe('08:00');
    });

    it('bugün uygun saat varsa bugün ve şimdiden sonraki ilk saat seçilir (geçmiş saatler listede kalır)', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
        const cmp = create([0, 1, 2, 3, 4, 5, 6].map((d) => day(d)));

        expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-16');
        expect(cmp.form.controls.scheduledTime.value).toBe('10:30');
        expect(cmp.timeOptions()[0].value).toBe('08:00');
    });
    it('kapalı gün seçilince ilk uygun gün önerilir; düğme tarih ve saati seçer', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
        const cmp = create([0, 1, 3, 4, 5, 6].map((d) => day(d)).concat(day(2, true)));

        cmp.form.controls.scheduledDate.setValue('2026-11-17');

        expect(cmp.timeOptions()).toEqual([]);
        const next = cmp.nextAvailableSlot();

        expect(next).toEqual(expect.objectContaining({ date: '2026-11-18', time: '08:00' }));
        cmp.selectSlot(next!);
        expect(cmp.form.controls.scheduledDate.value).toBe('2026-11-18');
        expect(cmp.form.controls.scheduledTime.value).toBe('08:00');
    });

    it('çalışma saati kısıtı kapalıyken kapalı günde de günün her saati seçilir (gün sonunu aşan saat yok)', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:10:00+03:00'));
        const cmp = create([0, 1, 3, 4, 5, 6].map((d) => day(d)).concat(day(2, true)), {}, false);

        cmp.form.controls.scheduledDate.setValue('2026-11-17');
        const values = cmp.timeOptions().map((o) => o.value);

        expect(values[0]).toBe('00:00');
        expect(values).toContain('22:00');
        expect(values.at(-1)).toBe('23:00');
        expect(cmp.nextAvailableSlot()).toBeNull();
    });
});
