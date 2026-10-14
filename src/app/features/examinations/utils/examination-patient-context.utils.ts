import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';

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
