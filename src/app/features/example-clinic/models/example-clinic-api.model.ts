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
