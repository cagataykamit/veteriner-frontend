/** Backend'in bugün döndürdüğü olay türleri; ödeme sonradan `Payment` olarak eklenecek. */
export type PetTimelineType = 'Visit' | 'Examination' | 'Treatment' | 'Prescription' | 'LabResult' | 'Vaccination' | 'Hospitalization';

export interface PetTimelineItemVm {
    /** Tür + kaynak kimliği (liste `track` anahtarı). */
    key: string;
    /** Bilinmeyen (yeni) türler de olduğu gibi taşınır; arayüz genel simgeye düşer. */
    type: string;
    sourceId: string;
    eventAtUtc: string | null;
    clinicName: string | null;
    title: string;
    summary: string | null;
    status: string | null;
    isVoided: boolean;
    /** Olayın kaynak kaydı: `linkRef` yoksa türden ve `sourceId`'den türetilir. */
    linkType: string;
    linkId: string;
    relatedExaminationId: string | null;
}

export interface PetTimelinePageVm {
    items: PetTimelineItemVm[];
    /** `null` → sayfa sonu. İçeriği yorumlanmaz. */
    nextCursor: string | null;
    /** Yetki yok nedeniyle sorguya girmeyen türler (kayıt yok ile karıştırılmaz). */
    omittedTypes: string[];
}

export interface PetTimelineQuery {
    /** Boş/undefined = yetkili tüm türler. */
    types?: PetTimelineType[];
    /** İstanbul günü (`yyyy-MM-dd`), bitiş günü dahil; UTC dönüşümü mapper'dadır. */
    fromDate?: string;
    toDate?: string;
    includeVoided?: boolean;
    limit?: number;
    cursor?: string | null;
}
