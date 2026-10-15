import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import { addGregorianDaysToYmd, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

export type ChargeSuggestionPeriod = 'all' | 'today' | 'week';

export const CHARGE_SUGGESTION_PERIOD_OPTIONS: ReadonlyArray<{ label: string; value: ChargeSuggestionPeriod }> = [
    { label: 'Tüm tarihler', value: 'all' },
    { label: 'Bugün', value: 'today' },
    { label: 'Son 7 gün', value: 'week' }
];

export interface ChargeSuggestionFilter {
    clientId: string | null;
    period: ChargeSuggestionPeriod;
}

/**
 * Sözleşmede müşteri ve tarih süzgeci yoktur (yalnız `petId`/`examinationId`/`visitId`); bekleyen liste küçüktür ve tek sayfada
 * yüklenir, bu iki süzgeç yüklenen liste üzerinde uygulanır. Gün, Türkiye takvim günüdür.
 */
export function filterChargeSuggestions(items: readonly ChargeSuggestionVm[], filter: ChargeSuggestionFilter, now: Date = new Date()): ChargeSuggestionVm[] {
    const today = toIstanbulDateInputValue(now.toISOString());
    const from = filter.period === 'today' ? today : filter.period === 'week' ? (addGregorianDaysToYmd(today, -6) ?? today) : null;

    return items.filter((i) => (!filter.clientId || i.clientId === filter.clientId) && (!from || toIstanbulDateInputValue(i.occurredAtUtc) >= from));
}
