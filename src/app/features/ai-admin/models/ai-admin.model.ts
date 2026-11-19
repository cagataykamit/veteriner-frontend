/**
 * Platform yöneticisi: yapay zekâ kredi, fon ve maliyet — Veteriner `docs/AI_HISTORY_SUMMARY_API_CONTRACT.md` §3, §4a.
 * Maliyet ayardaki fiyatla tahmindir, fatura değildir. Hiçbir alan klinik metin taşımaz.
 */

/** Klinik satırı: AI ayarı ve bu ayın kredi durumu. */
export interface AiAdminClinicDto {
    tenantId: string;
    tenantName: string;
    clinicId: string;
    clinicName: string;
    isClinicActive: boolean;
    /** Paket API kodu (`Basic`, `Pro`, `Premium`); abonelik yoksa `null`. */
    planCode: string | null;
    isEnabled: boolean;
    updatedAtUtc: string | null;
    monthlyCredits: number;
    creditsUsedThisMonth: number;
    creditsRemaining: number;
    fundCredits: number;
    /** 0–100; kliniğin gördüğüyle aynı oran. */
    usedPercent: number;
    quotaResetsAtUtc: string;
}

export interface AiFundGrantDto {
    id: string;
    kind: string;
    credits: number;
    note: string | null;
    createdByUserId: string | null;
    createdAtUtc: string;
}

/** Bir kırılım satırının ölçüleri. */
export interface AiAdminTotalsDto {
    requests: number;
    failedRequests: number;
    inputTokens: number;
    outputTokens: number;
    tokens: number;
    credits: number;
    fundCredits: number;
    costUsd: number;
}

export interface AiAdminUsageDto {
    isConfigured: boolean;
    model: string;
    /** `yyyy-MM` (İstanbul takvim ayı). */
    month: string;
    isCurrentMonth: boolean;
    monthStartUtc: string;
    monthEndUtc: string;
    system: AiAdminTotalsDto;
    budget: { limitUsd: number; spentUsd: number; remainingUsd: number; usedPercent: number };
    limits: {
        maxInputTokens: number;
        maxOutputTokens: number;
        userRequestsPerMinute: number;
        clinicMonthlyTokenLimit: number;
        clinicMonthlyCostLimitUsd: number;
        systemMonthlyCostLimitUsd: number;
        creditValueUsd: number;
        planMonthlyCredits: Record<string, number>;
    };
    clinics: { tenantId: string; tenantName: string; clinicId: string; clinicName: string; isEnabled: boolean; usage: AiAdminTotalsDto }[];
    features: { feature: string; usage: AiAdminTotalsDto }[];
    models: { model: string; usage: AiAdminTotalsDto }[];
}

const FEATURE_LABELS: Record<string, string> = {
    PetHistorySummary: 'Hasta geçmişi özeti',
    ExamNoteStructure: 'Muayene notunu alanlara ayırma',
    OwnerExplanation: 'Hasta sahibine açıklama',
    DischargeInstructions: 'Taburcu / bakım talimatı'
};

export function aiFeatureLabel(feature: string): string {
    return FEATURE_LABELS[feature] ?? feature;
}

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ISTANBUL_YEAR_MONTH = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' });

/** "2026-11" → "Kasım 2026"; biçim bozuksa olduğu gibi. */
export function aiMonthLabel(month: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(month);

    return m ? `${TR_MONTHS[Number(m[2]) - 1]} ${m[1]}` : month;
}

/** Bu ay ve önceki `count - 1` ay (İstanbul takvimi), yeniden eskiye; ay filtresi seçenekleri. */
export function aiRecentMonths(count: number, now: Date = new Date()): { value: string; label: string }[] {
    const [year, month] = ISTANBUL_YEAR_MONTH.format(now).split('-').map(Number);

    return Array.from({ length: count }, (_, i) => {
        const index = year * 12 + (month - 1) - i;
        const value = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;

        return { value, label: aiMonthLabel(value) };
    });
}

/** Tahmini dolar: küçük tutarlar da görünsün diye 2–4 ondalık ("$0,0027"). */
export function formatAiUsd(value: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 4 : 2 }).format(value);
}

/** Kredi ve token: tam sayı, binlik ayraçlı; kredi aşağı yuvarlanır (kalan kredi abartılmasın). */
export function formatAiNumber(value: number, maximumFractionDigits = 0): string {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits }).format(maximumFractionDigits === 0 ? Math.floor(value) : value);
}
