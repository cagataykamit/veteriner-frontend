/**
 * Lab result oluşturma / güncelleme — servis isteği.
 */

export interface CreateLabResultRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    resultDateUtc: string;
    testName: string;
    resultText: string;
    interpretation?: string | null;
    notes?: string | null;
}
