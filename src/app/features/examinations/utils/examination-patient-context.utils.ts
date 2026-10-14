import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';

/** Muayene çalışma alanı yan panelinde gösterilen kilo: önce son muayene ölçümü, yoksa tarihsiz profil kilosu. */
export interface ContextWeightVm {
    weightKg: number;
    /** `examination`: muayenede ölçülen (tarihli); `profile`: hayvan kaydındaki tarihsiz kilo. */
    source: 'examination' | 'profile';
    measuredAtUtc: string | null;
}

export function contextWeight(summary: PetSummaryVm | null): ContextWeightVm | null {
    const latest = summary?.latestWeight.data;
    if (latest) {
        return { weightKg: latest.weightKg, source: 'examination', measuredAtUtc: latest.measuredAtUtc };
    }
    const profile = summary?.profileWeightKg ?? null;
    return profile !== null ? { weightKg: profile, source: 'profile', measuredAtUtc: null } : null;
}

/**
 * Tedavide durum alanı yok (backend sözleşmesi); "aktif tedavi" takip tarihi bugün veya ileride olan tedavi sayılır.
 * Takip tarihi en yakın olan önce.
 */
export function followUpTreatments(items: readonly TreatmentListItemVm[], now: Date = new Date()): TreatmentListItemVm[] {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return items
        .filter((t) => !!t.followUpDateUtc && Date.parse(t.followUpDateUtc) >= startOfToday)
        .sort((a, b) => Date.parse(a.followUpDateUtc!) - Date.parse(b.followUpDateUtc!));
}
