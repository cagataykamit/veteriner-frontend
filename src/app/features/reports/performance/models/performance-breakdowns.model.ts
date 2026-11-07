/** Gelişmiş raporlar — `PERFORMANCE_BREAKDOWNS_API_CONTRACT.md` §2. İzni olmayan bölüm ya da alan `null`. */
export interface VeterinarianBreakdownDto {
    readonly veterinarianUserId: string | null;
    readonly name: string;
    readonly examinationCount: number | null;
    readonly netChargeAmount: number | null;
}

export interface LineKindBreakdownDto {
    readonly lineKind: 'Service' | 'Product' | string;
    readonly netChargeAmount: number;
    readonly chargeCount: number;
}

export interface ChargeItemBreakdownDto {
    readonly description: string;
    readonly lineKind: string;
    readonly netChargeAmount: number;
    readonly chargeCount: number;
}

export interface SpeciesBreakdownDto {
    readonly speciesId: string | null;
    readonly name: string;
    readonly examinationCount: number | null;
    readonly netChargeAmount: number | null;
}

export interface PerformanceBreakdownPeriodDto {
    readonly from: string;
    readonly to: string;
    readonly byVeterinarian: readonly VeterinarianBreakdownDto[] | null;
    readonly byLineKind: readonly LineKindBreakdownDto[] | null;
    readonly topItems: readonly ChargeItemBreakdownDto[] | null;
    readonly bySpecies: readonly SpeciesBreakdownDto[] | null;
    readonly activity: { readonly visitCount: number; readonly clientCount: number } | null;
}

export interface PerformanceBreakdownsDto {
    readonly currency: string;
    readonly current: PerformanceBreakdownPeriodDto;
    readonly previous: PerformanceBreakdownPeriodDto | null;
}
