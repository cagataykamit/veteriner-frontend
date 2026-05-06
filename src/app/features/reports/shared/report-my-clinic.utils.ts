import type { ClinicSummary } from '@/app/core/auth/auth.models';

/** UI’daki rapor klinik filtresi, `/me/clinics` özet listesinde yoksa (restore / drift). */
export function isReportUiClinicIdUnknownToMyClinics(uiClinicId: string, summaries: ClinicSummary[]): boolean {
    const id = uiClinicId.trim();
    if (!id) {
        return false;
    }
    return !summaries.some((c) => c.id === id);
}

/**
 * JWT’de aktif `clinic_id` varken UI filtresi farklı id taşıyorsa backend rapor isteğini reddedebilir.
 * Token’da klinik claim yoksa false (istek yalnızca JWT bağlamına düşer).
 */
export function isReportUiClinicIdMisalignedWithJwt(uiClinicId: string, jwtClinicId: string | null | undefined): boolean {
    const ui = uiClinicId.trim();
    if (!ui) {
        return false;
    }
    const jwt = typeof jwtClinicId === 'string' ? jwtClinicId.trim() : '';
    if (!jwt) {
        return false;
    }
    return ui !== jwt;
}
