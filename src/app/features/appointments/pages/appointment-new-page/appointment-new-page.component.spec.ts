import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicWorkingHourVm } from '@/app/entities/clinic/models/clinic-working-hours-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
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

    const create = (hours: ClinicWorkingHourVm[]) => {
        TestBed.configureTestingModule({
            imports: [AppointmentNewPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', getUserId: () => 'u1', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClinicsService, useValue: { getWorkingHours: () => of(hours), getAppointmentSettings: () => of({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 30 }) } }
            ]
        });
        const fixture = TestBed.createComponent(AppointmentNewPageComponent);

        fixture.detectChanges();

        return fixture.componentInstance;
    };

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
});
