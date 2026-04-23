import type { ClinicSummary } from '@/app/core/auth/auth.models';

/** Rapor filtreleri: kullanıcının erişebildiği klinikler → `p-select` seçenekleri (+ panel varsayılanı). */
export function mapMyClinicsToSelectOptions(
    clinics: readonly ClinicSummary[],
    panelDefaultLabel: string
): { label: string; value: string }[] {
    return [{ label: panelDefaultLabel, value: '' }, ...clinics.map((c) => ({ label: c.name, value: c.id }))];
}
