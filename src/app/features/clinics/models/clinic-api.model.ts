/** Backend `ClinicListItemDto` / liste kökü — mapper toleranslı okur. */
export interface ClinicListItemDto {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    isActive?: boolean | null;
}

/** `GET/PUT` tek klinik — `ClinicDetailDto`. */
export interface ClinicDetailDto {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    isActive?: boolean | null;
}

/** `PUT /api/v1/clinics/{id}` gövdesi. */
export interface ClinicUpdateRequestDto {
    name: string;
    city: string;
}
