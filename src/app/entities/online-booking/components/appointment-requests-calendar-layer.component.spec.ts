import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AppointmentRequestSource, AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { AppointmentRequestsCalendarLayerComponent, CALENDAR_REQUEST_LAYER_STORAGE_KEY } from './appointment-requests-calendar-layer.component';

describe('AppointmentRequestsCalendarLayerComponent', () => {
    let fixture: ComponentFixture<AppointmentRequestsCalendarLayerComponent>;
    let list: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        localStorage.removeItem(CALENDAR_REQUEST_LAYER_STORAGE_KEY);
        list = vi.fn().mockReturnValue(
            of({
                items: [
                    {
                        id: 'q1',
                        clinicId: 'c1',
                        status: AppointmentRequestStatus.Pending,
                        source: AppointmentRequestSource.Link,
                        reasonId: 'r1',
                        reasonName: 'Aşı',
                        // İstanbul 2 Kasım 2026 10:00
                        requestedStartUtc: '2026-11-02T07:00:00Z',
                        durationMinutes: 30,
                        contactName: 'Ayşe',
                        contactEmail: 'a@example.com',
                        contactPhone: null,
                        clientId: null,
                        clientName: null,
                        petId: null,
                        petName: 'Pamuk',
                        createdAtUtc: '2026-10-30T09:00:00Z',
                        appointmentId: null
                    }
                ],
                totalCount: 1,
                page: 1,
                pageSize: 200
            })
        );
        await TestBed.configureTestingModule({
            imports: [AppointmentRequestsCalendarLayerComponent],
            providers: [provideRouter([]), { provide: AppointmentRequestsService, useValue: { list } }]
        }).compileComponents();
        fixture = TestBed.createComponent(AppointmentRequestsCalendarLayerComponent);
        fixture.componentRef.setInput('fromUtc', '2026-11-01T21:00:00.000Z');
        fixture.componentRef.setInput('toUtc', '2026-11-02T21:00:00.000Z');
        fixture.detectChanges();
    });

    it('görünen aralıktaki bekleyen talepleri kesik çerçeveli "Talep" kartıyla gösterir', () => {
        expect(list).toHaveBeenCalledWith({ status: AppointmentRequestStatus.Pending, fromUtc: '2026-11-01T21:00:00.000Z', toUtc: '2026-11-02T21:00:00.000Z', page: 1, pageSize: 200 });
        const item = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="calendar-request-item"]');

        expect(item?.textContent).toContain('Talep');
        expect(item?.textContent).toContain('10:00');
        expect(item?.className).toContain('border-dashed');
    });

    it('filtreyle gizlenir, tercih saklanır; tıklanınca kuyrukta talep açılır', () => {
        const cmp = fixture.componentInstance;
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        cmp.open('q1');
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/requests'], { queryParams: { requestId: 'q1' } });

        cmp.toggle();
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="calendar-request-item"]')).toBeNull();
        expect(localStorage.getItem(CALENDAR_REQUEST_LAYER_STORAGE_KEY)).toBe('0');
    });
});
