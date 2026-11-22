/** Randevu kaynağının türü (Veteriner `docs/APPOINTMENT_RESOURCES_API_CONTRACT.md` §1; ADR-053 K1). */
export type AppointmentResourceType = 'Room' | 'Equipment';

export const APPOINTMENT_RESOURCE_NAME_MAX = 100;
export const APPOINTMENT_RESOURCE_CAPACITY_MIN = 1;
export const APPOINTMENT_RESOURCE_CAPACITY_MAX = 20;

export const APPOINTMENT_RESOURCE_TYPE_LABELS: Record<AppointmentResourceType, string> = {
    Room: 'Oda',
    Equipment: 'Cihaz'
};

/** `GET /clinics/{id}/appointment-resources` öğesi; sunucu sırası: odalar, cihazlar, sıra, ad. */
export interface AppointmentResourceVm {
    id: string;
    clinicId: string;
    name: string;
    type: AppointmentResourceType;
    /** Aynı anda en çok kaç randevu (1–20). */
    capacity: number;
    sortOrder: number;
    isActive: boolean;
}

export interface AppointmentResourceFormValue {
    name: string;
    type: AppointmentResourceType;
    capacity: number;
    sortOrder: number | null;
}
