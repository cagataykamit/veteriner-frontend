export interface ClinicAppointmentSettingsDto {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    /** Randevu hatırlatmasında "iptal et" bağlantısı (TIER-019; varsayılan açık). */
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
}

export interface UpdateClinicAppointmentSettingsRequestDto {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
}
