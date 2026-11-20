import { clinicAppointmentSettingsFormToPutBody, mapClinicAppointmentSettingsResponse } from './clinic-appointment-settings.mapper';

describe('clinic-appointment-settings.mapper (hatırlatmadaki iptal bağlantısı, TIER-019)', () => {
    it('ownerCancelLinkEnabled okunur; alan yoksa backend varsayılanı gibi açık sayılır', () => {
        expect(mapClinicAppointmentSettingsResponse({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false, ownerCancelLinkEnabled: false, waitlistAutoOfferEnabled: false }).ownerCancelLinkEnabled).toBe(false);
        expect(mapClinicAppointmentSettingsResponse({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false }).ownerCancelLinkEnabled).toBe(true);
    });

    it('PUT gövdesi alanı her zaman gönderir', () => {
        expect(clinicAppointmentSettingsFormToPutBody({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false, ownerCancelLinkEnabled: false, waitlistAutoOfferEnabled: false })).toEqual({
            defaultAppointmentDurationMinutes: 30,
            slotIntervalMinutes: 15,
            allowOverlappingAppointments: false,
            ownerCancelLinkEnabled: false,
            waitlistAutoOfferEnabled: false
        });
    });
});

describe('clinic-appointment-settings.mapper (çalışma saati kısıtı)', () => {
    it('enforceWorkingHours okunur; alan yoksa backend varsayılanı gibi açık sayılır', () => {
        expect(mapClinicAppointmentSettingsResponse({ enforceWorkingHours: false }).enforceWorkingHours).toBe(false);
        expect(mapClinicAppointmentSettingsResponse({ defaultAppointmentDurationMinutes: 30 }).enforceWorkingHours).toBe(true);
    });

    it('Randevu Varsayılanları gövdesi kısıtı göndermez (mevcut değer korunur)', () => {
        const body = clinicAppointmentSettingsFormToPutBody({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false, ownerCancelLinkEnabled: true, waitlistAutoOfferEnabled: true });

        expect(body).not.toHaveProperty('enforceWorkingHours');
    });
});
