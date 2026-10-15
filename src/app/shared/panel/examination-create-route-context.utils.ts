import type { AbstractControl } from '@angular/forms';
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

/** Bugün'deki geliş satırından muayene oluşturma. */
export interface VisitExaminationRouteContext {
    visitId: string;
    clientId: string;
    petId: string;
}

export function parseVisitExaminationRouteContext(params: ParamMap): VisitExaminationRouteContext | null {
    const visitId = params.get('visitId')?.trim() ?? '';
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';

    if (!visitId || !clientId || !petId) {
        return null;
    }

    return { visitId, clientId, petId };
}

/** Aşı create: zorunlu `clientId` + `petId`; `examinationId` opsiyonel (API gövdesine iletilebilir). */
export interface VaccinationCreateRouteContext {
    clientId: string;
    petId: string;
    examinationId: string | null;
}

export function parseVaccinationCreateRouteContext(params: ParamMap): VaccinationCreateRouteContext | null {
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';

    if (!clientId || !petId) {
        return null;
    }

    const examinationId = params.get('examinationId')?.trim() ?? '';

    return { clientId, petId, examinationId: examinationId || null };
}

/** Hayvan/müşteri detayındaki eylem çubuğundan açılan formlar: yalnız müşteri ve hayvan (geliş, muayene, randevu, tedavi bağlamı yok). */
export interface PetRouteContext {
    clientId: string;
    petId: string;
}

export function parsePetRouteContext(params: ParamMap): PetRouteContext | null {
    const clientId = params.get('clientId')?.trim() ?? '';
    const petId = params.get('petId')?.trim() ?? '';
    const hasOtherContext = ['visitId', 'examinationId', 'appointmentId', 'treatmentId'].some((k) => params.get(k)?.trim());

    return clientId && petId && !hasOtherContext ? { clientId, petId } : null;
}

/** Hayvan bağlamı varsa müşteri ve hayvan seçimini önceden doldurur (müşteri değişimi hayvanı sıfırladığı için sıra önemli). */
export function prefillPetFromRoute(params: ParamMap, clientControl: AbstractControl<string>, petControl: AbstractControl<string>): boolean {
    const ctx = parsePetRouteContext(params);

    if (!ctx) {
        return false;
    }

    clientControl.setValue(ctx.clientId);
    petControl.setValue(ctx.petId);

    return true;
}
