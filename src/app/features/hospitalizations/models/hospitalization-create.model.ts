/**
 * Yatış oluşturma / güncelleme — servis isteği.
 */

export interface CreateHospitalizationRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    visitId?: string | null;
    /** Güncellemede `null` = dokunma, boş metin = temizle. */
    location?: string | null;
    /** Klinik tanımlı oda (HOSP-002); güncellemede yok/`null` = oda bağına dokunma. */
    roomId?: string | null;
    /** Yalnız güncellemede: oda bağını kaldır (`roomId` ile birlikte verilmez). */
    clearRoom?: boolean;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
    /** Yalnız güncellemede; GET’ten alınan sürüm. */
    rowVersion?: string;
}

export interface DischargeHospitalizationRequest {
    dischargedAtUtc: string;
    dischargeNote?: string | null;
    rowVersion?: string;
}

/** PUT / taburcu sonucu: kaydın yeni sürümü. */
export interface HospitalizationWriteResult {
    id: string;
    rowVersion: string | null;
}
