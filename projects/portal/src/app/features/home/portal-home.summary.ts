import type { PortalAppointment } from '@portal/app/features/appointments/portal-appointments.api';
import { isDeceased, PortalPet, PortalPetVaccinations } from '@portal/app/features/pets/portal-pets.api';

/** Ana ekran aşı kartı için tek satır: hangi hayvanın hangi aşısı, vadesi, gecikmiş mi (sunucudan). */
export interface PortalVaccineAlert {
    readonly petId: string;
    readonly petName: string;
    readonly vaccineName: string;
    readonly dueAtUtc: string | null;
    readonly isOverdue: boolean;
}

export interface PortalVaccineSummary {
    /** Gecikmiş aşılar, en eski vade önce. */
    readonly overdue: readonly PortalVaccineAlert[];
    /** Gecikmemiş en yakın planlı aşı. */
    readonly next: PortalVaccineAlert | null;
}

export interface PortalPetVaccinationsEntry {
    readonly pet: PortalPet;
    readonly vaccinations: PortalPetVaccinations;
}

function byDue(a: PortalVaccineAlert, b: PortalVaccineAlert): number {
    // Vadesiz kayıt sona; ISO metinleri sözlük sırasıyla zaman sırasıdır.
    return (a.dueAtUtc ?? '￿').localeCompare(b.dueAtUtc ?? '￿');
}

/**
 * Hayvanların planlı aşılarından ana ekran özeti. Gecikmiş/yaklaşan ayrımı sunucunun `isOverdue` alanıdır (ADR-028,
 * kural tek yerde, backend); istemci tarih karşılaştırması yapmaz. Vefat eden hayvan sayılmaz.
 */
export function summarizeVaccines(entries: readonly PortalPetVaccinationsEntry[]): PortalVaccineSummary {
    const alerts: PortalVaccineAlert[] = entries
        .filter((e) => !isDeceased(e.pet))
        .flatMap((e) =>
            e.vaccinations.upcoming.map((v) => ({ petId: e.pet.petId, petName: e.pet.name, vaccineName: v.vaccineName, dueAtUtc: v.dueAtUtc, isOverdue: v.isOverdue }))
        );

    const overdue = alerts.filter((a) => a.isOverdue).sort(byDue);
    const next = alerts.filter((a) => !a.isOverdue && a.dueAtUtc !== null).sort(byDue)[0] ?? null;

    return { overdue, next };
}

/** Yaklaşan listede ilk planlı randevu (iptal edilenler de listede gelir, sözleşme §6). */
export function nextScheduledAppointment(items: readonly PortalAppointment[]): PortalAppointment | null {
    return items.find((a) => a.status === 'Scheduled') ?? null;
}
