export interface ClinicAppointmentSettingsVm {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
}

export interface ClinicAppointmentSettingsFormValue {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
}
