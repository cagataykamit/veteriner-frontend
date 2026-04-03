import type { ParamMap } from '@angular/router';

/** Muayene detayından tedavi/reçete oluşturma için taşınan minimum bağlam (query). */
export interface ExaminationCreateRouteContext {
    clientId: string;
    petId: string;
    examinationId: string;
}

/** `clientId`, `petId`, `examinationId` üçünü de dolu isteyen bağlam. */
export function parseExaminationCreateRouteContext(params: ParamMap): ExaminationCreateRouteContext | null {
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';
    const examinationId = params.get('examinationId')?.trim() ?? '';
    if (!clientId || !petId || !examinationId) {
        return null;
    }
    return { clientId, petId, examinationId };
}

/** Tedavi detayından reçete oluşturma — `treatmentId` baskın bağlam (examination query ile çakışabilir). */
export interface TreatmentPrescriptionRouteContext {
    clientId: string;
    petId: string;
    treatmentId: string;
    /** Query’de yoksa / boşsa sunucudaki tedavi kaydı esas alınır. */
    examinationId: string | null;
}

export function parseTreatmentPrescriptionRouteContext(params: ParamMap): TreatmentPrescriptionRouteContext | null {
    const treatmentId = params.get('treatmentId')?.trim() ?? '';
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';
    if (!treatmentId || !clientId || !petId) {
        return null;
    }
    const examinationId = params.get('examinationId')?.trim() ?? '';
    return { clientId, petId, treatmentId, examinationId: examinationId || null };
}

/** Randevu detayından muayene oluşturma. */
export interface AppointmentExaminationRouteContext {
    clientId: string;
    petId: string;
    appointmentId: string;
}

export function parseAppointmentExaminationRouteContext(params: ParamMap): AppointmentExaminationRouteContext | null {
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';
    const appointmentId = params.get('appointmentId')?.trim() ?? '';
    if (!clientId || !petId || !appointmentId) {
        return null;
    }
    return { clientId, petId, appointmentId };
}
