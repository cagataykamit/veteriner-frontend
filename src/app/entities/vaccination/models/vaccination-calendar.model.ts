/**
 * Takvim aşı katmanı (`GET /api/v1/vaccinations/calendar`; Veteriner `docs/APPOINTMENT_CALENDAR_API_CONTRACT.md` §5).
 * Aşı randevu değildir: saat dilimini doldurmaz, çakışma ve boş saat hesabına girmez.
 */
export type VaccinationCalendarKind = 'Planned' | 'NextDue' | 'Applied';
/** Ortak takvim durumu (sözleşme §6.1): randevu ve aşı aynı dili kullanır. */
export type CalendarItemState = 'DueToday' | 'Upcoming' | 'Overdue' | 'Completed';

export interface VaccinationCalendarItemDto {
    vaccinationId: string;
    kind?: string | null;
    state?: string | null;
    /** İstanbul günü (yyyy-MM-dd). */
    date?: string | null;
    atUtc?: string | null;
    clinicId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    vaccineDefinitionId?: string | null;
    vaccineName?: string | null;
    notes?: string | null;
}

export interface VaccinationCalendarItemVm {
    /** Satır anahtarı: aynı aşı kaydı uygulandığı gün ve sonraki tarihi için iki satır verebilir. */
    key: string;
    vaccinationId: string;
    kind: VaccinationCalendarKind;
    state: CalendarItemState;
    dateKey: string;
    atUtc: string | null;
    petId: string | null;
    petName: string;
    clientId: string | null;
    clientName: string;
    vaccineDefinitionId: string | null;
    vaccineName: string;
    notes: string | null;
}
