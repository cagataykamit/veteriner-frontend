/**
 * Lab result oluşturma / güncelleme — servis isteği.
 */

import type { LabResultLineInput } from '@/app/entities/lab-result/models/lab-result-vm.model';

export interface CreateLabResultRequest {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    resultDateUtc?: string | null;
    testName: string;
    resultText?: string | null;
    interpretation?: string | null;
    notes?: string | null;
    /** Verilmezse gövdeye yazılmaz (PUT'ta sunucu satırları korur). */
    lines?: LabResultLineInput[];
    /** Yalnız güncellemede; GET'ten alınan sürüm. */
    rowVersion?: string;
}
