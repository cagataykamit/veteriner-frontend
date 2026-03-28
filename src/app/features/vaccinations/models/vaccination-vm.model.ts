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
    /** GET detay `clientId` — müşteri select `optionValue` ile eşleşir. */
    clientId: string;
    petId: string;
    /** Preload’da dropdown etiketi; liste dışı müşteriler için seçenek birleştirmede kullanılır. */
    clientName: string | null;
    /** Preload’da dropdown etiketi; liste dışı hayvanlar için seçenek birleştirmede kullanılır. */
    petName: string | null;
    vaccineName: string;
    appliedAtUtc: string | null;
    nextDueAtUtc: string | null;
    status: string;
    notes: string;
}
