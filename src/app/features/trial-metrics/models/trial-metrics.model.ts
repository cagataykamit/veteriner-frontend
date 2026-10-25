/** Deneme aktivasyon özeti sözleşme modelleri (`TRIAL_ACTIVATION_METRICS_API_CONTRACT.md` §3); oranlar 0–1, payda yoksa null. */

export interface TrialMetricRatioDto {
    readonly count: number;
    readonly rate: number | null;
}

export interface TrialActivationSummaryDto {
    readonly count: number;
    readonly rate: number | null;
    readonly within10MinutesCount: number;
    readonly within10MinutesRate: number | null;
    readonly medianMinutesToFirstAction: number | null;
}

export interface TrialFirstActionBreakdownDto {
    readonly kind: string;
    readonly count: number;
}

export type TrialOnboarding = 'ExampleClinic' | 'EmptyClinic';

export interface TrialOnboardingComparisonDto {
    readonly onboarding: TrialOnboarding;
    readonly trialStarts: number;
    readonly activationRate: number | null;
    readonly within10MinutesRate: number | null;
    readonly conversionRate: number | null;
}

export interface TrialActivationMetricsDto {
    readonly fromUtc: string;
    readonly toUtc: string;
    readonly trialStarts: number;
    readonly exampleClinic: TrialMetricRatioDto;
    readonly activation: TrialActivationSummaryDto;
    readonly conversion: TrialMetricRatioDto;
    readonly firstActionBreakdown: TrialFirstActionBreakdownDto[];
    readonly byOnboarding: TrialOnboardingComparisonDto[];
}

/** Sözleşme §2.1 `ActivationSignalKind` → ekran etiketi; bilinmeyen tür ham adıyla gösterilir. */
export const FIRST_ACTION_LABELS: Readonly<Record<string, string>> = {
    ClientCreated: 'Müşteri ekleme',
    PetCreated: 'Hasta ekleme',
    AppointmentCreated: 'Randevu oluşturma',
    ExaminationCreated: 'Muayene oluşturma',
    VaccinationCreated: 'Aşı kaydı',
    ChargeCreated: 'Ücret ekleme',
    PaymentCreated: 'Ödeme alma',
    SaleCreated: 'Tezgâh satışı',
    ProductCreated: 'Ürün ekleme'
};

export const ONBOARDING_LABELS: Readonly<Record<TrialOnboarding, string>> = {
    ExampleClinic: 'Örnek klinikle başlayan',
    EmptyClinic: 'Boş klinikle başlayan'
};

export function firstActionLabel(kind: string): string {
    return FIRST_ACTION_LABELS[kind] ?? kind;
}

const percentFormat = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 1 });
const minutesFormat = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

/** 0–1 oran → "%62,5"; payda yoksa "—". */
export function formatRate(rate: number | null): string {
    return rate === null ? '—' : percentFormat.format(rate);
}

/** Dakika → "7,5 dk"; aktive olan yoksa "—". */
export function formatMinutes(minutes: number | null): string {
    return minutes === null ? '—' : `${minutesFormat.format(minutes)} dk`;
}
