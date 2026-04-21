/**
 * Swagger: `DashboardSummaryDto` ve ilişkili DTO'lar
 * (/api/v1/dashboard/summary).
 */
export type AppointmentStatus = 0 | 1 | 2;

export interface DashboardAppointmentItemDto {
    id: string;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    scheduledAtUtc?: string | null;
    status?: AppointmentStatus | string | null;
}

export interface DashboardRecentClientDto {
    id: string;
    fullName?: string | null;
    phone?: string | null;
}

export interface DashboardRecentPetDto {
    id: string;
    clientId?: string | null;
    name?: string | null;
    species?: string | null;
    speciesName?: string | null;
    breed?: string | null;
    breedName?: string | null;
}

export interface DashboardSummaryDto {
    /** Faz 6B — son 7 gün günlük randevu sayıları (dizi veya günlük nesneler; mapper toleranslı). */
    last7DaysAppointments?: unknown | null;
    todayAppointmentsCount?: number | null;
    upcomingAppointmentsCount?: number | null;
    completedTodayCount?: number | null;
    cancelledTodayCount?: number | null;
    totalClientsCount?: number | null;
    totalPetsCount?: number | null;
    upcomingAppointments?: DashboardAppointmentItemDto[] | null;
    recentClients?: DashboardRecentClientDto[] | null;
    recentPets?: DashboardRecentPetDto[] | null;
}
