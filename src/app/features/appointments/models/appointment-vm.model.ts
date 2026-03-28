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
    type: string;
    status: string | null;
    lifecycleStatus: string | null;
    reason: string;
    createdAtUtc: string | null;
}

/** Randevu detay — liste VM’sinden ayrı; ek alanlar (notes, updatedAtUtc). */
export interface AppointmentDetailVm {
    id: string;
    scheduledAtUtc: string | null;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    type: string;
    status: string | null;
    lifecycleStatus: string | null;
    reason: string;
    notes: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface AppointmentEditVm {
    id: string;
    clientId: string;
    petId: string;
    /** Dropdown etiketi — liste dışı müşteri için sentetik seçenek. */
    clientName: string | null;
    /** Dropdown etiketi — liste dışı hayvan için sentetik seçenek. */
    petName: string | null;
    scheduledAtUtc: string | null;
    type: string;
    status: string;
    reason: string;
    notes: string;
}
