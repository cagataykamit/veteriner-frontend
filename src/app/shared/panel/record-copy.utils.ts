import type { ParamMap } from '@angular/router';

/**
 * Kayıt kopyası (RECORD-004): "Kopyasını oluştur" oluşturma formunu bu sorgu anahtarındaki kaynak kimliğiyle açar; ayrı kopyalama
 * ucu yoktur, kayıt normal oluşturma ucundan geçer. Hangi alanların kopyalandığı tür başına tek yardımcıdadır
 * (`prescriptionCopyDraft`, `treatmentCopyDraft`).
 */
export const RECORD_COPY_QUERY_KEY = 'copyFrom';

/** Adres çubuğundaki kopya kaynağı; yoksa `null`. */
export function recordCopySourceId(params: ParamMap): string | null {
    return params.get(RECORD_COPY_QUERY_KEY)?.trim() || null;
}

export function recordCopyQueryParams(sourceId: string): Record<string, string> {
    return { [RECORD_COPY_QUERY_KEY]: sourceId };
}

/**
 * Kopyanın hedef muayenesi: kaynağın muayene bağı taşınmaz (kesinleşmiş eski muayeneye yanlışlıkla geç kayıt açılmasın);
 * hastanın tek açık (taslak) muayenesi varsa o önerilir, yoksa hekim seçer.
 */
export function copyTargetExaminationId(examinations: readonly { id: string; status?: string | null }[]): string | null {
    const open = examinations.filter((e) => e.status === 'Draft');

    return open.length === 1 ? open[0].id : null;
}
