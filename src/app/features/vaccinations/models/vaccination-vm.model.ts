/**
 * Aşı listesi — UI view model.
 */

export interface VaccinationListItemVm {
    id: string;
    appliedAtUtc: string | null;
    nextDueAtUtc: string | null;
    vaccineName: string;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    status: string | null;
    notes: string;
}

/** Detay — liste VM’sine ek olarak audit alanları. */
export interface VaccinationDetailVm {
    id: string;
    appliedAtUtc: string | null;
    nextDueAtUtc: string | null;
    vaccineName: string;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    status: string | null;
    notes: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}

export interface VaccinationEditVm {
    id: string;
    clientId: string;
    petId: string;
    vaccineName: string;
    appliedAtUtc: string | null;
    nextDueAtUtc: string | null;
    status: string;
    notes: string;
}
