export interface AppointmentCalendarItemDto {
    id: string;
    clinicId?: string | null;
    petId?: string | null;
    clientId?: string | null;
    scheduledAtUtc?: string | null;
    durationMinutes?: number | string | null;
    scheduledEndUtc?: string | null;
    status?: string | number | null;
    appointmentType?: string | number | null;
    petName?: string | null;
    clientName?: string | null;
    /** Randevunun hekimi; hekimsizse boş (takvimde "Hekim seçilmedi" sütunu). */
    veterinarianUserId?: string | null;
    veterinarianName?: string | null;
    reasonId?: string | null;
    /** Randevu nedeninin adı (ayrıntı balonu); nedensiz randevuda boş. */
    reasonName?: string | null;
    notes?: string | null;
    /** Takvim durumu (sözleşme §8.3); iptal ve gelmedi randevuda boş. */
    state?: string | null;
    /** Oda ve cihaz (APPOINTMENT_RESOURCES_API_CONTRACT.md §4); takvimin "Oda ve cihaz" sütunları. */
    roomResourceId?: string | null;
    roomResourceName?: string | null;
    equipmentResourceId?: string | null;
    equipmentResourceName?: string | null;
}

export interface AppointmentCalendarQuery {
    dateFromUtc: string;
    dateToUtc: string;
    clinicId?: string;
    status?: string;
    /** Takvim filtreleri (sözleşme §6): hekim ya da yalnız hekimsiz, türler (sayı), durumlar. */
    veterinarianUserId?: string;
    withoutVeterinarian?: boolean;
    appointmentTypes?: readonly number[];
    states?: readonly string[];
}
