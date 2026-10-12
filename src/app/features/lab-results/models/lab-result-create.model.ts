/**
 * Lab result oluşturma / güncelleme — servis isteği.
 */

export interface CreateLabResultRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    resultDateUtc?: string | null;
    testName: string;
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    /** Yalnız güncellemede; GET'ten alınan sürüm. */
    rowVersion?: string;
}
