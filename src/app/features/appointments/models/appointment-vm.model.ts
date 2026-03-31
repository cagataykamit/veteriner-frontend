/**
 * Randevu listesi — UI view model.
 */

export interface AppointmentListItemVm {
    id: string;
    scheduledAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    /** Hayvan türü (API `speciesName`); randevu türü değildir. */
    speciesName: string | null;
    /** Randevu türü — backend `AppointmentType` enum (0…6). */
    appointmentType: number | null;
    /** API’nin gönderdiği ek açıklama; etiket için yedek. */
    appointmentTypeName: string | null;
    /** Backend `AppointmentStatus` 0/1/2; bilinmeyen API değeri `null`. */
    status: number | null;
    lifecycleStatus: number | null;
}

/** Randevu detay — liste VM’sinden ayrı; ek alanlar (notes, updatedAtUtc). */
export interface AppointmentDetailVm {
    id: string;
    scheduledAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    speciesName: string | null;
    appointmentType: number | null;
    appointmentTypeName: string | null;
    /** Backend `AppointmentStatus` 0/1/2; bilinmeyen API değeri `null`. */
    status: number | null;
    lifecycleStatus: number | null;
    notes: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface AppointmentEditVm {
    id: string;
    clientId: string;
    petId: string;
    clientName: string | null;
    petName: string | null;
    scheduledAtUtc: string | null;
    /** Form `p-select` — 0…6 veya bilinmeyen için `null`. */
    appointmentType: number | null;
    /** Salt okunur gösterim (GET); yazma isteğine dahil edilmez. */
    status: number | null;
    notes: string;
}
