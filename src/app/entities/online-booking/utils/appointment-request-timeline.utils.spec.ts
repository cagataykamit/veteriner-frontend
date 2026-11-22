import {
    AppointmentRequestActorKind,
    AppointmentRequestChannel,
    AppointmentRequestStatus,
    type AppointmentRequestDetailVm,
    type AppointmentRequestHistoryVm
} from '@/app/entities/online-booking/models/online-booking.model';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { appointmentRequestTimeline, appointmentRequestTimelineAppointment } from './appointment-request-timeline.utils';

const created: AppointmentRequestHistoryVm = {
    fromStatus: null,
    toStatus: AppointmentRequestStatus.Pending,
    actorKind: AppointmentRequestActorKind.Owner,
    actorUserId: null,
    actorName: null,
    note: null,
    atUtc: '2026-11-03T09:00:00Z'
};

const closing = (over: Partial<AppointmentRequestHistoryVm>): AppointmentRequestHistoryVm => ({
    fromStatus: AppointmentRequestStatus.Pending,
    toStatus: AppointmentRequestStatus.Approved,
    actorKind: AppointmentRequestActorKind.Staff,
    actorUserId: 'u1',
    actorName: 'Sekreter Elif',
    note: null,
    atUtc: '2026-11-03T10:00:00Z',
    ...over
});

const detail = (over: Partial<AppointmentRequestDetailVm> = {}): AppointmentRequestDetailVm => ({
    summary: pendingRequest('q1', { channel: AppointmentRequestChannel.ClinicSite }),
    petSpecies: null,
    petBreed: null,
    ownerNote: null,
    approvedStartUtc: null,
    approvedVeterinarianUserId: null,
    wasRescheduled: false,
    rejectionReason: null,
    closedAtUtc: null,
    history: [created],
    clientMatches: [],
    requestedSlotFree: true,
    freeVeterinarianUserIds: [],
    appointment: null,
    ...over
});

describe('appointmentRequestTimeline (APPT-024)', () => {
    it('oluşturma olayı: sahip adı, yeni durum, istenen saat ve kaynak', () => {
        const [e] = appointmentRequestTimeline(detail());

        expect(e.title).toBe('Talep alındı');
        expect(e.actor).toBe('Hasta sahibi · Ayşe Yılmaz');
        expect(e.fromLabel).toBeNull();
        expect(e.toLabel).toBe('Bekliyor');
        expect(e.details).toEqual(['İstenen saat: 03.11.2026 14:30', 'Kaynak: Kendi sitesi']);
    });

    it('farklı saatle onay: personel adı, eski → yeni durum, onaylanan ve istenen saat; not başlıkta tekrar etmez', () => {
        const [, e] = appointmentRequestTimeline(
            detail({
                wasRescheduled: true,
                approvedStartUtc: '2026-11-03T12:00:00Z',
                history: [created, closing({ note: 'Farklı saatle onaylandı' })]
            })
        );

        expect(e.title).toBe('Farklı saatle onaylandı');
        expect(e.actor).toBe('Sekreter Elif');
        expect(e.fromLabel).toBe('Bekliyor');
        expect(e.toLabel).toBe('Onaylandı');
        expect(e.severity).toBe('success');
        expect(e.details).toEqual(['Onaylanan saat: 03.11.2026 15:00', 'İstenen saat: 03.11.2026 14:30']);
    });

    it('red gerekçesi, sahibin vazgeçmesi ve sistemin süre doldurması', () => {
        const rejected = appointmentRequestTimeline(detail({ history: [created, closing({ toStatus: AppointmentRequestStatus.Rejected, note: 'Hekim izinli' })] }))[1];
        const cancelled = appointmentRequestTimeline(
            detail({ history: [created, closing({ toStatus: AppointmentRequestStatus.Cancelled, actorKind: AppointmentRequestActorKind.Owner, actorUserId: null, actorName: null })] })
        )[1];
        const expired = appointmentRequestTimeline(
            detail({ history: [created, closing({ toStatus: AppointmentRequestStatus.Expired, actorKind: AppointmentRequestActorKind.System, actorUserId: null, actorName: null })] })
        )[1];

        expect(rejected.title).toBe('Reddedildi');
        expect(rejected.details).toEqual(['Gerekçe: Hekim izinli']);
        expect(cancelled.title).toBe('Sahip vazgeçti');
        expect(cancelled.actor).toBe('Hasta sahibi · Ayşe Yılmaz');
        expect(expired.title).toBe('Süresi doldu');
        expect(expired.actor).toBe('Sistem');
    });

    it('adı gelmeyen personel satırı "Personel" görünür', () => {
        const [, e] = appointmentRequestTimeline(detail({ history: [created, closing({ actorName: null })] }));

        expect(e.actor).toBe('Personel');
    });
});

describe('appointmentRequestTimelineAppointment (APPT-024)', () => {
    it('onaysız talepte randevu yok', () => {
        expect(appointmentRequestTimelineAppointment(detail())).toBeNull();
    });

    it('randevunun güncel durumu; onaydan sonra taşındıysa işaretlenir', () => {
        const a = appointmentRequestTimelineAppointment(
            detail({
                summary: pendingRequest('q1', { status: AppointmentRequestStatus.Approved, appointmentId: 'a1' }),
                approvedStartUtc: '2026-11-03T11:30:00Z',
                appointment: { id: 'a1', scheduledAtUtc: '2026-11-04T08:00:00Z', durationMinutes: 30, status: 2 }
            })
        );

        expect(a).toEqual({ id: 'a1', whenText: '04.11.2026 11:00 · 30 dk', statusLabel: 'İptal', statusSeverity: 'danger', movedAfterApproval: true });
    });

    it('randevu bilgisi gelmezse yalnız bağlantı kalır', () => {
        const a = appointmentRequestTimelineAppointment(detail({ summary: pendingRequest('q1', { appointmentId: 'a1' }) }));

        expect(a).toEqual({ id: 'a1', whenText: null, statusLabel: null, statusSeverity: 'secondary', movedAfterApproval: false });
    });
});
