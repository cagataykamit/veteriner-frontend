import { HttpErrorResponse } from '@angular/common/http';

/**
 * Backend: ClinicId yoksa aktif klinikleri resolve eder.
 * - Tek aktif klinik: otomatik seçer.
 * - Hiç aktif klinik yoksa: Clinics.NotFound
 * - Birden fazla aktif klinik varsa: Clinics.ClinicSelectionRequired
 *
 * Bu helper UI eklemeden anlaşılır hata mesajı üretir.
 */
export function messageFromClinicResolutionHttpError(err: HttpErrorResponse): string | null {
    const body = err.error as unknown;
    const code = extractErrorCode(body);

    if (code === 'Clinics.NotFound') {
        return 'Aktif klinik bulunamadı. Lütfen klinik kaydı ekleyin veya en az bir kliniği aktif edin.';
    }
    if (code === 'Clinics.ClinicSelectionRequired') {
        return 'Birden fazla aktif klinik bulundu. Devam etmek için klinik seçimi gerekli.';
    }
    return null;
}

function extractErrorCode(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;

    const direct = firstString(
        o['code'],
        o['errorCode'],
        o['error_code'],
        o['key'],
        o['name'],
        o['type'],
        o['title'],
        o['detail']
    );
    if (direct) {
        const normalized = direct.trim();
        if (normalized === 'Clinics.NotFound' || normalized === 'Clinics.ClinicSelectionRequired') {
            return normalized;
        }
        // Bazı backend’lerde title/detail içinde metin olarak gömülü olabilir.
        if (normalized.includes('Clinics.NotFound')) {
            return 'Clinics.NotFound';
        }
        if (normalized.includes('Clinics.ClinicSelectionRequired')) {
            return 'Clinics.ClinicSelectionRequired';
        }
    }

    const ext = o['extensions'];
    if (ext && typeof ext === 'object') {
        const e = ext as Record<string, unknown>;
        const extCode = firstString(e['code'], e['errorCode'], e['error_code'], e['key'], e['name']);
        if (extCode?.trim() === 'Clinics.NotFound' || extCode?.trim() === 'Clinics.ClinicSelectionRequired') {
            return extCode.trim();
        }
        if (typeof extCode === 'string' && extCode.includes('Clinics.NotFound')) {
            return 'Clinics.NotFound';
        }
        if (typeof extCode === 'string' && extCode.includes('Clinics.ClinicSelectionRequired')) {
            return 'Clinics.ClinicSelectionRequired';
        }
    }

    return null;
}

function firstString(...vals: unknown[]): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v;
        }
    }
    return null;
}

