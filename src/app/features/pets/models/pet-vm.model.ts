export interface PetListItemVm {
    id: string;
    /** Liste DTO’sunda varsa; client’a göre filtre için (API ClientId yok sayarsa yedek). */
    clientId: string | null;
    name: string;
    speciesName: string;
    breed: string;
    colorName: string;
    weight: string;
}

export interface PetDetailVm {
    id: string;
    name: string;
    speciesName: string;
    breed: string;
    gender: string;
    birthDate: string | null;
    colorName: string;
    weight: string;
    notes: string;
    /** Müteri detay rotası — `ownerId` veya `clientId`. */
    ownerId: string | null;
    /** Sahip: API `clientName` → yedek `ownerName`. */
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    vaccinationsSummary: {
        totalCount: number;
        items: { id: string; name: string }[];
    };
    examinationsSummary: {
        totalCount: number;
        lastExaminedAtUtc: string | null;
    };
    appointmentsSummary: {
        totalCount: number;
        upcomingCount: number | null;
    };
}

/** Edit form için ham değerlere yakın, canonical alanlar. */
export interface PetEditVm {
    id: string;
    clientId: string;
    name: string;
    speciesId: string;
    breedId: string;
    /** Irk listesinde yoksa seçici etiketi (sentetik seçenek). */
    breedName: string | null;
    gender: string;
    birthDateInput: string;
    colorId: string;
    /** Katalogda yoksa seçici etiketi (sentetik seçenek). */
    colorName: string | null;
    weightStr: string;
    notes: string;
}
