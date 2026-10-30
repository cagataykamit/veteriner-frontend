/**
 * Doz hesabı (EXAM-008): kilo × doz/kg = toplam doz; konsantrasyon verilirse toplam doz ÷ konsantrasyon = hacim.
 * Yalnız hesap yardımcısıdır: ilaç/tür sınırı bilmez, doz önermez, kayda yazmaz; karar ve kontrol hekimdedir.
 */

export type DoseUnit = 'mg' | 'mcg';

export const DOSE_UNIT_OPTIONS: readonly { label: string; value: DoseUnit }[] = [
    { label: 'mg/kg', value: 'mg' },
    { label: 'µg/kg', value: 'mcg' }
];

/** Mantık dışı girişi (ör. virgül/nokta karışıklığından 10 kat değer) yakalamak için üst sınırlar; klinik doz sınırı değildir. */
export const DOSE_LIMITS = { weightKg: 2000, dosePerKg: 1000, concentrationMgPerMl: 10000 } as const;

export interface DoseInput {
    weightKg: number | null;
    dosePerKg: number | null;
    doseUnit: DoseUnit;
    /** mg/mL; boşsa hacim hesaplanmaz. */
    concentrationMgPerMl: number | null;
}

export interface DoseResult {
    /** Doz biriminde (mg veya µg) toplam doz. */
    totalDose: number;
    totalMg: number;
    volumeMl: number | null;
    /** Hesabın açık yazımı (kopyalanabilir): "12,4 kg × 5 mg/kg = 62 mg → 62 mg ÷ 50 mg/mL = 1,24 mL". */
    text: string;
}

const UNIT_LABEL: Record<DoseUnit, string> = { mg: 'mg', mcg: 'µg' };

function positiveWithin(value: number | null, max: number): value is number {
    return value != null && Number.isFinite(value) && value > 0 && value <= max;
}

function format(value: number, maxFractionDigits: number): string {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** Geçersiz veya eksik girişte `null` (kilo ve doz/kg zorunlu; konsantrasyon isteğe bağlı ama verildiyse geçerli olmalı). */
export function calculateDose(input: DoseInput): DoseResult | null {
    if (!positiveWithin(input.weightKg, DOSE_LIMITS.weightKg) || !positiveWithin(input.dosePerKg, DOSE_LIMITS.dosePerKg)) {
        return null;
    }

    if (input.concentrationMgPerMl != null && !positiveWithin(input.concentrationMgPerMl, DOSE_LIMITS.concentrationMgPerMl)) {
        return null;
    }

    const unit = UNIT_LABEL[input.doseUnit];
    const totalDose = input.weightKg * input.dosePerKg;
    const totalMg = input.doseUnit === 'mcg' ? totalDose / 1000 : totalDose;
    const volumeMl = input.concentrationMgPerMl != null ? totalMg / input.concentrationMgPerMl : null;

    let text = `${format(input.weightKg, 3)} kg × ${format(input.dosePerKg, 3)} ${unit}/kg = ${format(totalDose, 2)} ${unit}`;

    if (volumeMl != null) {
        const mgPart = input.doseUnit === 'mcg' ? `${format(totalMg, 3)} mg` : `${format(totalMg, 2)} mg`;

        text += ` → ${mgPart} ÷ ${format(input.concentrationMgPerMl!, 3)} mg/mL = ${format(volumeMl, 3)} mL`;
    }

    return { totalDose, totalMg, volumeMl, text };
}
