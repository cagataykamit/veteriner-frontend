import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

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
