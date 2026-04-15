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
    /**
     * Aşağıdaki üç özet, GET `/pets/{id}` gövdesindeki alanlarla map edilir.
     * Detay sayfası şu an bu blokları göstermez; hasta geçmişi için `PetHistorySummaryVm` / `history-summary` kullanılır (bilinçli ürün kararı; ayrı kart UI eklemeden önce backend anlamlılığını doğrulayın).
     */
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

/** GET /pets/{id}/history-summary — pet detay hasta geçmişi. */
export interface PetHistoryAppointmentItemVm {
    id: string;
    scheduledAtUtc: string | null;
    status: number | null;
    appointmentType: number | null;
    appointmentTypeName: string | null;
    notes: string | null;
    clinicName: string | null;
}

export interface PetHistoryExaminationItemVm {
    id: string;
    examinedAtUtc: string | null;
    visitReason: string;
    clinicName: string | null;
}

export interface PetHistoryTreatmentItemVm {
    id: string;
    treatmentDateUtc: string | null;
    title: string;
    clinicName: string | null;
}

export interface PetHistoryPrescriptionItemVm {
    id: string;
    prescribedAtUtc: string | null;
    title: string;
    clinicName: string | null;
}

export interface PetHistoryLabResultItemVm {
    id: string;
    resultDateUtc: string | null;
    testName: string;
    clinicName: string | null;
}

export interface PetHistoryHospitalizationItemVm {
    id: string;
    admittedAtUtc: string | null;
    reason: string;
    dischargedAtUtc: string | null;
    isActive: boolean;
    clinicName: string | null;
}

export interface PetHistoryPaymentItemVm {
    id: string;
    paidAtUtc: string | null;
    amount: number | null;
    currency: string | null;
    method: unknown;
    clinicName: string | null;
}

export interface PetHistorySummaryVm {
    petId: string;
    petName: string;
    clientId: string | null;
    clientName: string;
    recentAppointments: PetHistoryAppointmentItemVm[];
    recentExaminations: PetHistoryExaminationItemVm[];
    recentTreatments: PetHistoryTreatmentItemVm[];
    recentPrescriptions: PetHistoryPrescriptionItemVm[];
    recentLabResults: PetHistoryLabResultItemVm[];
    recentHospitalizations: PetHistoryHospitalizationItemVm[];
    recentPayments: PetHistoryPaymentItemVm[];
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
