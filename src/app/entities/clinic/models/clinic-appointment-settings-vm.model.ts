export interface ClinicAppointmentSettingsVm {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
    /** Panelden randevu çalışma saati ve molaya uyar (varsayılan açık); online randevu bu ayardan etkilenmez. */
    enforceWorkingHours: boolean;
}

export interface ClinicAppointmentSettingsFormValue {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
}
