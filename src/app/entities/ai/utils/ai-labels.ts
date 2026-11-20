import { petTimelineTypeDefinition } from '@/app/entities/pet/utils/pet-timeline-types';
import { parseUtcApiInstantIsoString } from '@/app/shared/utils/date.utils';

/** Geçmiş özeti bölümleri, sözleşmedeki sabit sırayla; başlığı arayüz verir. */
export const AI_SUMMARY_SECTION_TITLES: Readonly<Record<string, string>> = {
    Alerts: 'Uyarılar',
    ActiveIssues: 'Süren sorunlar',
    RecentVisits: 'Son muayeneler',
    Medications: 'İlaçlar',
    Vaccinations: 'Aşılar',
    LabResults: 'Laboratuvar',
    FollowUps: 'Takipler'
};

export const AI_SUMMARY_ALERT_SECTION = 'Alerts';

/** Bilinmeyen tür bozulmadan backend başlığıyla görünür. */
export function aiSummarySectionTitle(kind: string, fallback: string): string {
    return AI_SUMMARY_SECTION_TITLES[kind] ?? (fallback.trim() || kind);
}

/** Kayıt türünün küçük harfli adı: "muayene", "laboratuvar"; bilinmeyen tür olduğu gibi. */
export function aiRecordTypeNoun(type: string): string {
    const def = petTimelineTypeDefinition(type);

    return def ? def.label.toLocaleLowerCase('tr-TR') : type;
}

/** `recordCounts` → "5 muayene · 3 reçete · 4 aşı · 2 laboratuvar" (klinik akış sırasıyla: muayene, tedavi, reçete, aşı, laboratuvar, yatış). */
export function aiRecordCountsLabel(counts: Readonly<Record<string, number>> | null | undefined): string {
    if (!counts) {
        return '';
    }

    return Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => typeOrder(a) - typeOrder(b))
        .map(([type, n]) => `${n} ${aiRecordTypeNoun(type)}`)
        .join(' · ');
}

/** "laboratuvar", "laboratuvar ve aşı", "laboratuvar, aşı ve yatış". */
export function aiTypeListLabel(types: readonly string[]): string {
    const nouns = types.map(aiRecordTypeNoun);

    return nouns.length <= 1 ? (nouns[0] ?? '') : `${nouns.slice(0, -1).join(', ')} ve ${nouns[nouns.length - 1]}`;
}

const DAY_MONTH = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short' });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric' });

/** Kaynak çipinin kısa tarihi: "10 Kas" (İstanbul). Geçersiz/boşta `null`. */
export function aiDayMonthLabel(iso: string | null | undefined): string | null {
    const d = parseUtcApiInstantIsoString(iso);

    return d ? DAY_MONTH.format(d) : null;
}

/** Kapsam satırının tarihi: "2 Mar 2026" (İstanbul). Geçersiz/boşta `null`. */
export function aiDayMonthYearLabel(iso: string | null | undefined): string | null {
    const d = parseUtcApiInstantIsoString(iso);

    return d ? DAY_MONTH_YEAR.format(d) : null;
}

function typeOrder(type: string): number {
    const order = ['Examination', 'Treatment', 'Prescription', 'Vaccination', 'LabResult', 'Hospitalization'];
    const i = order.indexOf(type);

    return i === -1 ? order.length : i;
}
