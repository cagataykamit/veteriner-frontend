export interface PetListItemVm {
    id: string;
    /** Liste DTO’sunda varsa; client’a göre filtre için (API ClientId yok sayarsa yedek). */
    clientId: string | null;
    name: string;
    speciesName: string;
    breed: string;
    ownerName: string;
    gender: string;
    birthDateUtc: string | null;
    status: string | null;
}

export interface PetDetailVm {
    id: string;
    name: string;
    speciesName: string;
    breed: string;
    gender: string;
    birthDateUtc: string | null;
    color: string;
    weight: string;
    status: string | null;
    notes: string;
    ownerId: string | null;
    ownerName: string;
    ownerPhone: string;
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
