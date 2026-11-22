export interface ClinicWorkingHourVm {
    readonly dayOfWeek: number;
    readonly dayLabel: string;
    readonly isClosed: boolean;
    readonly opensAt: string | null;
    readonly closesAt: string | null;
    readonly breakStartsAt: string | null;
    readonly breakEndsAt: string | null;
}

/** `GET .../working-hours`: `isConfigured=false` iken kayıt yoktur, `items` varsayılan haftadır. */
export interface ClinicWorkingHoursStateVm {
    readonly isConfigured: boolean;
    readonly items: ClinicWorkingHourVm[];
}

export interface ClinicWorkingHourFormValue {
    dayOfWeek: number;
    dayLabel: string;
    isClosed: boolean;
    opensAt: string;
    closesAt: string;
    breakStartsAt: string;
    breakEndsAt: string;
}
