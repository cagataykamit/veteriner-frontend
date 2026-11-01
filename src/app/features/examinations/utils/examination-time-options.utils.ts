import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { toIstanbulDateTimeInputParts } from '@/app/shared/utils/date.utils';

const INTERVAL_MINUTES = 15;

/** Muayene saati seçimi — tam gün, 15 dk aralık (çalışma saati kısıtı yok). */
export function buildExaminationTimeSelectOptions(): SelectOption[] {
    const opts: SelectOption[] = [];

    for (let start = 0; start < 24 * 60; start += INTERVAL_MINUTES) {
        const hh = String(Math.floor(start / 60)).padStart(2, '0');
        const mm = String(start % 60).padStart(2, '0');
        const hm = `${hh}:${mm}`;

        opts.push({ value: hm, label: hm });
    }

    return opts;
}

export const EXAMINATION_TIME_SELECT_OPTIONS = buildExaminationTimeSelectOptions();

/** Düzenlemede slot dışı mevcut saati listede tutar (randevu edit ile aynı UX). */
export function examinationTimeSelectOptionsWithLegacy(legacyHm: string | null | undefined): SelectOption[] {
    const legacy = legacyHm?.trim() ?? '';

    if (!legacy || EXAMINATION_TIME_SELECT_OPTIONS.some((o) => o.value === legacy)) {
        return EXAMINATION_TIME_SELECT_OPTIONS;
    }

    return [{ value: legacy, label: `Mevcut saat: ${legacy}` }, ...EXAMINATION_TIME_SELECT_OPTIONS];
}

/** `HH:mm` → aynı ya da önceki 15 dk dilimi (09:14 → 09:00); seçenek listesiyle aynı aralık. Biçim bozuksa olduğu gibi döner. */
export function floorToExaminationTimeSlot(hm: string): string {
    const m = /^(\d{2}):(\d{2})$/.exec(hm.trim());

    if (!m) {
        return hm;
    }

    const minutes = Number(m[2]) - (Number(m[2]) % INTERVAL_MINUTES);

    return `${m[1]}:${String(minutes).padStart(2, '0')}`;
}

/** Yeni muayene varsayılanı: bugün (İstanbul) ve şimdinin dilime aşağı yuvarlanmış saati; kullanıcı değiştirebilir. */
export function defaultExaminationDateTimeParts(now: Date = new Date()): { date: string; time: string } {
    const parts = toIstanbulDateTimeInputParts(now.toISOString());

    return { date: parts.date, time: floorToExaminationTimeSlot(parts.time) };
}
