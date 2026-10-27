/** Backend `ClinicListItemDto` / liste kökü — mapper toleranslı okur. */
export interface ClinicListItemDto {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    isActive?: boolean | null;
    phone?: string | null;
    email?: string | null;
}

/** `GET/PUT` tek klinik — `ClinicDetailDto`. */
export interface ClinicDetailDto {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    isActive?: boolean | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    description?: string | null;
}

/** `PUT /api/v1/clinics/{id}` — tam gövde (patch değil; tüm alanlar gönderilir). */
export interface ClinicUpdateRequestDto {
    name: string;
    city: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    description: string | null;
}

/** `POST /api/v1/clinics` gövdesi — `ClinicUpdateRequestDto` ile aynı profil alanları. */
export interface ClinicCreateRequestDto {
    name: string;
    city: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    description: string | null;
}
