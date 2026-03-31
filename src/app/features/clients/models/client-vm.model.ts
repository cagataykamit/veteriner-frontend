export interface ClientListItemVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
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
    address: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
}
