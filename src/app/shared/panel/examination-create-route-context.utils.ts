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
