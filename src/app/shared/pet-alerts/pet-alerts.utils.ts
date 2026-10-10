import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Hayvan uyarı bayrakları — `docs/PET_ALERTS_API_CONTRACT.md`. JSON'da enum adı string. */
export type PetAlertFlag = 'Allergy' | 'Aggressive' | 'ChronicCondition' | 'AnesthesiaRisk';

export const PET_ALERT_NOTE_MAX = 200;

/** API gövdesi: `petAlerts` (hiçbir zaman null değildir; savunmacı okunur). */
export interface PetAlertsDto {
    flags?: string[] | null;
    note?: string | null;
}

export interface PetAlertsVm {
    flags: PetAlertFlag[];
    note: string | null;
}

export const NO_PET_ALERTS: PetAlertsVm = { flags: [], note: null };

interface PetAlertDefinition {
    readonly value: PetAlertFlag;
    readonly label: string;
    readonly icon: string;
    readonly severity: StatusTagSeverity;
}

/** Sıra sözleşmedeki sabit sıradır (rozetler ve form aynı sırayı kullanır). */
export const PET_ALERT_OPTIONS: ReadonlyArray<PetAlertDefinition> = [
    { value: 'Allergy', label: 'Alerji', icon: 'pi-exclamation-circle', severity: 'danger' },
    { value: 'Aggressive', label: 'Agresif', icon: 'pi-exclamation-triangle', severity: 'danger' },
    { value: 'ChronicCondition', label: 'Kronik hastalık', icon: 'pi-heart', severity: 'warn' },
    { value: 'AnesthesiaRisk', label: 'Anestezi riski', icon: 'pi-bolt', severity: 'warn' }
];

const KNOWN_FLAGS: ReadonlySet<string> = new Set(PET_ALERT_OPTIONS.map((o) => o.value));

/** Tanınmayan bayrak adı yok sayılır (yeni backend bayrağı eski arayüzü bozmaz); sıra sözleşmedeki sıradır. */
export function mapPetAlertsDtoToVm(dto: PetAlertsDto | null | undefined): PetAlertsVm {
    const present = new Set((dto?.flags ?? []).filter((f) => KNOWN_FLAGS.has(f)));
    const flags = PET_ALERT_OPTIONS.filter((o) => present.has(o.value)).map((o) => o.value);
    const note = dto?.note?.trim();
    return { flags, note: flags.length > 0 && note ? note : null };
}

export function petAlertDefinitions(alerts: PetAlertsVm): PetAlertDefinition[] {
    return PET_ALERT_OPTIONS.filter((o) => alerts.flags.includes(o.value));
}

/** Rozet `title` / ekran okuyucu metni: "Alerji, Agresif — not"; uyarı yoksa `null`. */
export function petAlertsSummary(alerts: PetAlertsVm): string | null {
    const labels = petAlertDefinitions(alerts).map((o) => o.label);
    if (labels.length === 0) {
        return null;
    }
    const joined = labels.join(', ');
    return alerts.note ? `${joined} — ${alerts.note}` : joined;
}

/**
 * Form → yazma alanları. Bayrak yoksa not gönderilmez ("" = temizle; bayraksız dolu not sunucuda 400).
 * Her zaman her iki alan gönderilir: form mevcut değerlerle doldurulduğu için değişmeyen uyarı aynen geri gider.
 */
export function petAlertsFormToWrite(flags: readonly PetAlertFlag[], note: string): { alertFlags: PetAlertFlag[]; alertNote: string } {
    const ordered = PET_ALERT_OPTIONS.filter((o) => flags.includes(o.value)).map((o) => o.value);
    return { alertFlags: ordered, alertNote: ordered.length > 0 ? note.trim() : '' };
}
