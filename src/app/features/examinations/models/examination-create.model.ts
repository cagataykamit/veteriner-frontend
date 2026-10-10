/**
 * Muayene yazma isteği — servis girişi (form değil, API DTO değil).
 * Payload'a dönüşüm yalnızca `examination.mapper.ts` içindedir.
 */

export interface ExaminationVitalsInput {
    weightKg: number | null;
    temperatureC: number | null;
    heartRateBpm: number | null;
    respiratoryRatePerMin: number | null;
    /** En az bir vital yoksa mapper `null` gönderir. */
    vitalsMeasuredAtUtc: string | null;
}

export interface ExaminationContentInput extends ExaminationVitalsInput {
    examinedAtUtc: string;
    visitReason: string;
    anamnesis?: string | null;
    findings?: string | null;
    assessment?: string | null;
    plan?: string | null;
    notes?: string | null;
}

export interface CreateExaminationRequest extends ExaminationContentInput {
    /**
     * Randevudan create: appointmentId doluysa clinicId/petId backend tarafından çözülebilir.
     * Randevusuz create: appointmentId yoksa clinicId + petId birlikte zorunlu.
     */
    appointmentId?: string;
    clinicId?: string;
    petId?: string;
    /**
     * Bugün'den muayene: yalnızca `visitId` yeterlidir (hasta tekrar seçilmez); klinik, hayvan ve randevu
     * Visit'ten gelir, bu durumda `appointmentId`/`clinicId`/`petId` gönderilmez.
     */
    visitId?: string;
}

export interface UpdateExaminationRequest extends ExaminationContentInput {
    /** Boşaltılan alan `""` olarak gider; `null`/yok mevcut değeri korurdu. */
    anamnesis: string;
    findings: string;
    assessment: string;
    plan: string;
    notes: string;
    /** GET'ten gelen (veya son başarılı yazmadan dönen) sürüm — zorunlu. */
    rowVersion: string;
    /** Kaydın mevcut değerleri; değiştirilemez, form input'u değildir. */
    clinicId: string;
    petId: string;
    /**
     * Tüm vital değerler bilinçli boşaltıldıysa (kayıtta vital varken) `true`; bu durumda
     * vital alanları `null` olmalıdır. Sözleşme: `clearVitals` ile vital değer birlikte gitmez.
     */
    clearVitals: boolean;
    /** Mevcut bağlantı varsa aynı değer; yoksa gönderilmez. */
    appointmentId?: string | null;
}
