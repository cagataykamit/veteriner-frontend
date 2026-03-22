/**
 * Swagger: `DashboardSummaryDto` ve ilişkili DTO'lar
 * (/api/v1/dashboard/summary).
 */
export type AppointmentStatus = 0 | 1 | 2;

export interface DashboardAppointmentItemDto {
    id: string;
    clinicId: string;
    petId: string;
    scheduledAtUtc: string;
    status: AppointmentStatus;
}

export interface DashboardRecentClientDto {
    id: string;
    fullName?: string | null;
    phone?: string | null;
}

export interface DashboardRecentPetDto {
    id: string;
    clientId: string;
    name?: string | null;
    species?: string | null;
}

export interface DashboardSummaryDto {
    todayAppointmentsCount: number;
    upcomingAppointmentsCount: number;
    completedTodayCount: number;
    cancelledTodayCount: number;
    totalClientsCount: number;
    totalPetsCount: number;
    upcomingAppointments?: DashboardAppointmentItemDto[] | null;
    recentClients?: DashboardRecentClientDto[] | null;
    recentPets?: DashboardRecentPetDto[] | null;
}
