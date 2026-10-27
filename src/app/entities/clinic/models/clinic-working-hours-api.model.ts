/** Backend `ClinicWorkingHourDto` — mapper toleranslı okur. */
export interface ClinicWorkingHourDto {
    dayOfWeek?: number | null;
    isClosed?: boolean | null;
    opensAt?: string | null;
    closesAt?: string | null;
    breakStartsAt?: string | null;
    breakEndsAt?: string | null;
}

/** `PUT .../working-hours` gövdesi. */
export interface UpdateClinicWorkingHoursRequestDto {
    items: ClinicWorkingHourWriteItemDto[];
}

export interface ClinicWorkingHourWriteItemDto {
    dayOfWeek: number;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    breakStartsAt: string | null;
    breakEndsAt: string | null;
}
