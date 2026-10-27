/**
 * `ExampleClinicLoadSummaryDto` — kayıtta (`owner-signup.exampleClinic`) ve sonradan yüklemede
 * (`POST /tenants/{tenantId}/example-clinic`) aynı gövde (`EXAMPLE_CLINIC_API_CONTRACT.md` §5).
 */
export interface ExampleClinicLoadSummaryDto {
    tenantId: string;
    clinicId: string;
    clients: number;
    pets: number;
    appointments: number;
    examinations: number;
    vaccinations: number;
    treatments: number;
    labResults: number;
    charges: number;
    payments: number;
    products: number;
    stockMovements: number;
}

/** Yükleme özeti ile temizlik sayılarının ortak sayaçları (kart satırları bunlardan kurulur). */
export type ExampleClinicCounts = Omit<ExampleClinicLoadSummaryDto, 'tenantId' | 'clinicId'>;

/**
 * `ExampleClinicDataCountsDto` — durum sorgusunda silinecek, `DELETE` yanıtında silinen/pasife alınan sayılar
 * (`EXAMPLE_CLINIC_API_CONTRACT.md` §10.2).
 */
export interface ExampleClinicDataCountsDto extends ExampleClinicCounts {
    productsDeactivated: number;
    otherRecords: number;
}

/** `GET /tenants/{tenantId}/example-clinic` (§10.2). */
export interface ExampleClinicStatusDto {
    hasExampleData: boolean;
    counts: ExampleClinicDataCountsDto;
}
