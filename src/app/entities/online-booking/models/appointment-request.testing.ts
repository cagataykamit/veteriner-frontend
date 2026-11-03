import { AppointmentRequestSource, AppointmentRequestStatus, type AppointmentRequestListItemVm } from './online-booking.model';

/** Yalnız spec'ler: bekleyen randevu talebi satırı. */
export function pendingRequest(id: string, over: Partial<AppointmentRequestListItemVm> = {}): AppointmentRequestListItemVm {
    return {
        id,
        clinicId: 'k1',
        status: AppointmentRequestStatus.Pending,
        source: AppointmentRequestSource.Portal,
        reasonId: null,
        reasonName: 'Diğer / emin değilim',
        requestedStartUtc: '2026-11-03T11:30:00Z',
        durationMinutes: 30,
        contactName: 'Ayşe Yılmaz',
        contactEmail: 'ayse@example.com',
        contactPhone: null,
        clientId: 'c1',
        clientName: 'Ayşe Yılmaz',
        petId: 'p1',
        petName: 'Çomar',
        createdAtUtc: '2026-11-03T09:00:00Z',
        appointmentId: null,
        ...over
    };
}
