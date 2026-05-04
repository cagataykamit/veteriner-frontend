export interface AppointmentCalendarItemDto {
    id: string;
    clinicId?: string | null;
    petId?: string | null;
    clientId?: string | null;
    scheduledAtUtc?: string | null;
    durationMinutes?: number | string | null;
    scheduledEndUtc?: string | null;
    status?: string | number | null;
    appointmentType?: string | number | null;
    petName?: string | null;
    clientName?: string | null;
}

export interface AppointmentCalendarQuery {
    dateFromUtc: string;
    dateToUtc: string;
    clinicId?: string;
    status?: string;
}
