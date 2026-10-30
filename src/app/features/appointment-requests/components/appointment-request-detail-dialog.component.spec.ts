import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import {
    AppointmentRequestActorKind,
    AppointmentRequestSource,
    AppointmentRequestStatus,
    type AppointmentRequestDetailVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { AppointmentRequestDetailDialogComponent } from './appointment-request-detail-dialog.component';

const detail = (over: Partial<AppointmentRequestDetailVm['summary']> = {}): AppointmentRequestDetailVm => ({
    summary: {
        id: 'q1',
        clinicId: 'c1',
        status: AppointmentRequestStatus.Pending,
        source: AppointmentRequestSource.Link,
        reasonId: 'r1',
        reasonName: 'Aşı',
        requestedStartUtc: '2026-11-02T07:00:00Z',
        durationMinutes: 30,
        contactName: 'Ayşe Yılmaz',
        contactEmail: 'ayse@example.com',
        contactPhone: '905551234567',
        clientId: null,
        clientName: null,
        petId: null,
        petName: 'Pamuk',
        createdAtUtc: '2026-10-30T09:00:00Z',
        appointmentId: null,
        ...over
    },
    petSpecies: 'Kedi',
    petBreed: null,
    ownerNote: 'İlk aşı',
    approvedStartUtc: null,
    approvedVeterinarianUserId: null,
    wasRescheduled: false,
    rejectionReason: null,
    closedAtUtc: null,
    history: [{ fromStatus: null, toStatus: AppointmentRequestStatus.Pending, actorKind: AppointmentRequestActorKind.Owner, actorUserId: null, actorName: null, note: null, atUtc: '2026-10-30T09:00:00Z' }],
    clientMatches: [{ clientId: 'cl1', fullName: 'Ayşe Yılmaz', phone: '905551234567', email: 'ayse@example.com', pets: [] }],
    requestedSlotFree: true,
    freeVeterinarianUserIds: ['v1']
});

describe('AppointmentRequestDetailDialogComponent', () => {
    let fixture: ComponentFixture<AppointmentRequestDetailDialogComponent>;
    let requests: MockedObject<AppointmentRequestsService>;

    async function create(d: AppointmentRequestDetailVm): Promise<void> {
        requests = {
            get: vi.fn().mockReturnValue(of(d)),
            approve: vi.fn().mockReturnValue(of({ ...d, summary: { ...d.summary, status: AppointmentRequestStatus.Approved } })),
            reject: vi.fn().mockReturnValue(of({ ...d, summary: { ...d.summary, status: AppointmentRequestStatus.Rejected } })),
            previewEmail: vi.fn().mockReturnValue(of({ subject: 'Konu', body: 'Metin' }))
        } as unknown as MockedObject<AppointmentRequestsService>;
        await TestBed.configureTestingModule({
            imports: [AppointmentRequestDetailDialogComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AppointmentRequestsService, useValue: requests },
                { provide: OnlineBookingService, useValue: { availability: vi.fn().mockReturnValue(of([])) } },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([{ userId: 'v1', name: 'Dr. Can' }]) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AppointmentRequestDetailDialogComponent);
        fixture.componentRef.setInput('canDecide', true);
        fixture.componentRef.setInput('requestId', 'q1');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('tek eşleşen müşteri ön seçilir; hayvan seçilmeden onay kapalı, seçilince doğru gövdeyle gider', async () => {
        await create(detail());
        const cmp = fixture.componentInstance;

        expect(cmp.clientId()).toBe('cl1');
        cmp.startApprove();
        expect(cmp.canApprove()).toBe(false);

        cmp.petId.set('p9');
        expect(cmp.canApprove()).toBe(true);
        cmp.approve();

        expect(requests.approve).toHaveBeenCalledWith('q1', { clientId: 'cl1', petId: 'p9', scheduledAtUtc: null, veterinarianUserId: null, email: null });
        expect(cmp.detail()?.summary.status).toBe(AppointmentRequestStatus.Approved);
        expect(cmp.mode()).toBe('view');
    });

    it('portal talebinde müşteri ve hayvan bağdan gelir; farklı saat seçilince yeniden planlama saati gider', async () => {
        await create(detail({ source: AppointmentRequestSource.Portal, clientId: 'cl5', clientName: 'Portal Sahip', petId: 'p5' }));
        const cmp = fixture.componentInstance;

        cmp.startApprove();
        cmp.setTimeChoice('other');
        expect(cmp.canApprove()).toBe(false);
        cmp.pickSlot('2026-11-03T08:00:00Z', ['v1']);
        cmp.vetId.set('v1');
        cmp.approve();

        expect(requests.approve).toHaveBeenCalledWith('q1', { clientId: null, petId: null, scheduledAtUtc: '2026-11-03T08:00:00Z', veterinarianUserId: 'v1', email: null });
    });

    it('red gerekçesiz yapılamaz; düzenlenen e-posta red isteğine eklenir', async () => {
        await create(detail());
        const cmp = fixture.componentInstance;

        cmp.startReject();
        cmp.rejectReason.set('ab');
        expect(cmp.canReject()).toBe(false);
        cmp.rejectReason.set('Hekim izinli');
        cmp.toggleEmailEdit();
        expect(requests.previewEmail).toHaveBeenCalled();
        expect(cmp.emailEditing()).toBe(true);
        cmp.emailBody.set('Düzenlendi');
        cmp.reject();

        expect(requests.reject).toHaveBeenCalledWith('q1', 'Hekim izinli', { subject: 'Konu', body: 'Düzenlendi' });
    });
});
