export interface ClinicAppointmentSettingsDto {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    /** Randevu hatırlatmasında "iptal et" bağlantısı (TIER-019; varsayılan açık). */
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
    /** Panelden randevu çalışma saati ve molaya uyar (varsayılan açık); online randevu bu ayardan etkilenmez. */
    enforceWorkingHours: boolean;
}

export interface UpdateClinicAppointmentSettingsRequestDto {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
    /** İptalde bekleme listesine otomatik teklif (TIER-018; varsayılan açık). */
    waitlistAutoOfferEnabled: boolean;
    /** Gönderilmezse mevcut değer korunur; yalnız Çalışma Saatleri kartı gönderir. */
    enforceWorkingHours?: boolean;
}
