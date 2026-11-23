import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { StaffAvailabilityDayVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { AppointmentFreeSlotFinderComponent } from './appointment-free-slot-finder.component';

const day = (date: string, ...startsUtc: string[]): StaffAvailabilityDayVm => ({
    date,
    slots: startsUtc.map((startUtc) => ({ startUtc, endUtc: startUtc, freeVeterinarianUserIds: ['v1'] }))
});

describe('AppointmentFreeSlotFinderComponent', () => {
    let fixture: ComponentFixture<AppointmentFreeSlotFinderComponent>;
    let availability: ReturnType<typeof vi.fn>;

    const el = () => fixture.nativeElement as HTMLElement;
    const dayLabels = () => Array.from(el().querySelectorAll('[data-testid="free-slot-day"]')).map((x) => x.textContent?.trim());

    const render = (days: StaffAvailabilityDayVm[], date: string | null) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        // Pazartesi 16.11.2026 10:00 (İstanbul).
        vi.setSystemTime(new Date('2026-11-16T10:00:00+03:00'));
        availability = vi.fn().mockReturnValue(of(days));
        TestBed.configureTestingModule({
            imports: [AppointmentFreeSlotFinderComponent],
            providers: [
                { provide: AppointmentReasonsService, useValue: { list: () => of([]) } },
                { provide: OnlineBookingService, useValue: { availability } }
            ]
        });
        fixture = TestBed.createComponent(AppointmentFreeSlotFinderComponent);
        fixture.componentRef.setInput('clinicId', 'c1');
        fixture.componentRef.setInput('vets', [{ userId: 'v1', name: 'Dr. Ayşe' }]);
        fixture.componentRef.setInput('date', date);
        fixture.detectChanges();
    };

    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
    });

    it('bugün açıkken arama bugünden başlar; satırlar "Bugün", "Yarın" ve kısa tarih', () => {
        render([day('2026-11-16', '2026-11-16T11:00:00Z'), day('2026-11-17', '2026-11-17T06:00:00Z'), day('2026-11-19', '2026-11-19T06:00:00Z')], '2026-11-16');

        expect(availability).toHaveBeenCalledWith('c1', null, '2026-11-16', 7);
        const [today, tomorrow, later] = dayLabels();

        expect(today).toBe('Bugün');
        expect(tomorrow).toBe('Yarın');
        expect(later).toContain('19');
        expect(later).toContain('Kas');
    });

    it('başka gün açıkken arama o günden başlar ve satırlarda "Bugün" yazmaz', () => {
        render([day('2026-11-19', '2026-11-19T06:00:00Z', '2026-11-19T07:00:00Z'), day('2026-11-20', '2026-11-20T06:00:00Z')], '2026-11-19');

        expect(availability).toHaveBeenCalledWith('c1', null, '2026-11-19', 7);
        const labels = dayLabels();

        expect(labels).toHaveLength(3);
        expect(labels).not.toContain('Bugün');
        expect(labels).not.toContain('Yarın');
        expect(labels[0]).toContain('19');
        expect(labels[2]).toContain('20');
    });

    it('açık gün yarınsa satır "Yarın" der', () => {
        render([day('2026-11-17', '2026-11-17T06:00:00Z')], '2026-11-17');

        expect(availability).toHaveBeenCalledWith('c1', null, '2026-11-17', 7);
        expect(dayLabels()).toEqual(['Yarın']);
    });

    it('geçmiş gün açıkken arama bugünden başlar', () => {
        render([], '2026-11-10');

        expect(availability).toHaveBeenCalledWith('c1', null, '2026-11-16', 7);
        expect(el().textContent).toContain('Önümüzdeki 7 günde boş saat yok.');
    });

    it('açık gün değişince liste o günden yeniden yüklenir; boşsa açık güne göre metin', () => {
        render([], null);
        expect(availability).toHaveBeenLastCalledWith('c1', null, '2026-11-16', 7);

        fixture.componentRef.setInput('date', '2026-11-21');
        fixture.detectChanges();

        expect(availability).toHaveBeenLastCalledWith('c1', null, '2026-11-21', 7);
        expect(el().textContent).toContain('Açık günden itibaren 7 günde boş saat yok.');
    });
});
