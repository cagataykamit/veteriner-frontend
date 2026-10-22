/**
 * Reçete listesi — GET `/api/v1/prescriptions`.
 * HttpParams: `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order` (+ `clinicId`, `PetId`, `hbsStatus`).
 */

import type { HbsEntryStatus } from '@/app/features/hbs/models/hbs.model';

export interface PrescriptionsListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Gönderilmezse `AuthService` klinik kimliği kullanılır. */
    clinicId?: string;
    /** Hayvana göre daraltma (backend `PetId`). */
    petId?: string;
    /** yyyy-MM-dd; istekte İstanbul günü başı UTC `dateFromUtc` olarak gider. */
    fromDate?: string;
    /** yyyy-MM-dd; istekte İstanbul günü sonu UTC `dateToUtc` olarak gider. */
    toDate?: string;
    sort?: string;
    order?: string;
    /** HBS durumu süzgeci (`hbsStatus`). */
    hbsStatus?: HbsEntryStatus;
}
