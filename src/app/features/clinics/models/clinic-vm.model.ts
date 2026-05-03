export interface ClinicListItemVm {
    id: string;
    name: string;
    city: string;
    isActive: boolean | null;
    /** Liste DTO; boş backend alanı için `''`. */
    phone: string;
    email: string;
}

export interface ClinicDetailVm {
    id: string;
    name: string;
    city: string;
    isActive: boolean | null;
    phone: string;
    email: string;
    address: string;
    description: string;
}
