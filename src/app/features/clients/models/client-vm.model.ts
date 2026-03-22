export interface ClientListItemVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    petCount: number | null;
    status: string | null;
    createdAtUtc: string | null;
}

export interface PetsSummaryVm {
    totalCount: number;
    items: { id: string; name: string }[];
}

export interface AppointmentsSummaryVm {
    totalCount: number;
    upcomingCount: number | null;
}

export interface ClientDetailVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    notes: string;
    address: string;
    status: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    petsSummary: PetsSummaryVm;
    appointmentsSummary: AppointmentsSummaryVm;
}
