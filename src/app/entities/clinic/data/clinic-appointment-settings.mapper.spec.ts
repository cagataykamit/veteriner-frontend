import { clinicAppointmentSettingsFormToPutBody, mapClinicAppointmentSettingsResponse } from './clinic-appointment-settings.mapper';

describe('clinic-appointment-settings.mapper (hatırlatmadaki iptal bağlantısı, TIER-019)', () => {
    it('ownerCancelLinkEnabled okunur; alan yoksa backend varsayılanı gibi açık sayılır', () => {
        expect(mapClinicAppointmentSettingsResponse({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false, ownerCancelLinkEnabled: false }).ownerCancelLinkEnabled).toBe(false);
        expect(mapClinicAppointmentSettingsResponse({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false }).ownerCancelLinkEnabled).toBe(true);
    });

    it('PUT gövdesi alanı her zaman gönderir', () => {
        expect(clinicAppointmentSettingsFormToPutBody({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false, ownerCancelLinkEnabled: false })).toEqual({
            defaultAppointmentDurationMinutes: 30,
            slotIntervalMinutes: 15,
            allowOverlappingAppointments: false,
            ownerCancelLinkEnabled: false
        });
    });
});
