/**
 * Çalışma alanı formunun ham değerleri (UI). API payload'u değildir;
 * dönüşüm yalnızca `examination.mapper.ts` içinde yapılır.
 * `clinicId`, `petId`, `appointmentId`, `rowVersion` bağlam alanlarıdır, form input'u değildir.
 */
export interface ExaminationWorkspaceFormValue {
    /** yyyy-MM-dd (İstanbul) */
    examinationDate: string;
    /** HH:mm (İstanbul) */
    examinationTime: string;
    visitReason: string;
    anamnesis: string;
    findings: string;
    weightKg: number | null;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    /** `datetime-local` (İstanbul duvar saati) veya boş. */
    vitalsMeasuredAtLocal: string;
    assessment: string;
    plan: string;
    notes: string;
}
