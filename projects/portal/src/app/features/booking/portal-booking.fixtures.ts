import type { PortalAppointmentRequest, PortalBookingDay, PortalBookingPage } from './portal-booking.api';

/**
 * Yalnız spec'ler: online randevu örnek yanıtları. Saatler İstanbul duvar saatiyle seçildi (CI UTC):
 * 2026-11-02 Pazartesi 09:00 İstanbul = 06:00Z.
 */
export const BOOKING_PAGE: PortalBookingPage = {
    clinicName: 'Merkez Veteriner',
    clinicCity: 'İzmir',
    clinicPhone: '0232 000 00 00',
    clinicAddress: 'Alsancak',
    minLeadMinutes: 120,
    maxAdvanceDays: 30,
    maxPendingRequests: 3,
    reasons: [
        { id: 'reason-1', name: 'Aşı', durationMinutes: 15 },
        { id: 'reason-2', name: 'Kontrol', durationMinutes: 30 }
    ]
};

export const SLOT_MON_0900 = '2026-11-02T06:00:00Z';
export const SLOT_MON_0930 = '2026-11-02T06:30:00Z';
export const SLOT_TUE_1400 = '2026-11-03T11:00:00Z';

export const BOOKING_DAYS: PortalBookingDay[] = [
    { date: '2026-11-01', slots: [] },
    {
        date: '2026-11-02',
        slots: [
            { startUtc: SLOT_MON_0900, endUtc: '2026-11-02T06:15:00Z' },
            { startUtc: SLOT_MON_0930, endUtc: '2026-11-02T06:45:00Z' }
        ]
    },
    { date: '2026-11-03', slots: [{ startUtc: SLOT_TUE_1400, endUtc: '2026-11-03T11:15:00Z' }] }
];

export function bookingRequest(overrides: Partial<PortalAppointmentRequest> = {}): PortalAppointmentRequest {
    return {
        id: 'req-1',
        status: 0,
        reasonName: 'Aşı',
        requestedStartUtc: SLOT_MON_0900,
        durationMinutes: 15,
        petId: 'pet-1',
        petName: 'Pamuk',
        approvedStartUtc: null,
        wasRescheduled: false,
        rejectionReason: null,
        createdAtUtc: '2026-10-30T08:00:00Z',
        canCancel: true,
        ...overrides
    };
}
