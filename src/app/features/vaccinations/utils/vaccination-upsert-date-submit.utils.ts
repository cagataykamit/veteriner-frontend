import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import {
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';

export type VaccinationWriteStatusNum = 0 | 1 | 2;

export interface VaccinationAppliedDueSubmitResult {
    readonly appliedAtUtc: string | null;
    readonly dueAtUtc: string | null;
    readonly errorMessage: string | null;
}

/**
 * Aşı create/update gövdesi için `appliedAtUtc` / `dueAtUtc` — domain:
 * - Planlandı (0): `appliedAtUtc` yok, `dueAtUtc` zorunlu, şimdi'den ileri olmalı.
 * - Uygulandı (1): `appliedAtUtc` zorunlu, gelecek olamaz; `dueAtUtc` opsiyonel, varsa uygulamadan sonra.
 * - İptal (2): `appliedAtUtc` yok; `dueAtUtc` opsiyonel.
 */
export function buildVaccinationAppliedDueForSubmit(
    status: VaccinationWriteStatusNum,
    appliedAtLocalTrimmed: string,
    nextDueDateTrimmed: string
): VaccinationAppliedDueSubmitResult {
    if (status === 0) {
        if (!nextDueDateTrimmed) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Planlanan uygulama tarihi ve saati zorunludur.' };
        }
        const dueIso = fromIstanbulDateTimeLocalInputToUtcIso(nextDueDateTrimmed);
        if (!dueIso) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Geçerli bir planlanan uygulama tarihi ve saati seçin.' };
        }
        if (new Date(dueIso).getTime() <= Date.now()) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Planlanan uygulama tarihi ve saati gelecekte olmalıdır.' };
        }
        return { appliedAtUtc: null, dueAtUtc: dueIso, errorMessage: null };
    }

    if (status === 1) {
        if (!appliedAtLocalTrimmed) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Uygulama tarihi ve saati zorunludur.' };
        }
        const appliedIso = fromIstanbulDateTimeLocalInputToUtcIso(appliedAtLocalTrimmed);
        if (!appliedIso) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Geçerli bir uygulama tarihi ve saati seçin.' };
        }
        if (new Date(appliedIso).getTime() > Date.now()) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Uygulama tarihi gelecek bir tarih olamaz.' };
        }
        if (!nextDueDateTrimmed) {
            return { appliedAtUtc: appliedIso, dueAtUtc: null, errorMessage: null };
        }
        const dueIso = fromIstanbulDateTimeLocalInputToUtcIso(nextDueDateTrimmed);
        if (!dueIso) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Geçerli bir sonraki uygulama tarihi ve saati seçin.' };
        }
        if (new Date(dueIso).getTime() <= new Date(appliedIso).getTime()) {
            return {
                appliedAtUtc: null,
                dueAtUtc: null,
                errorMessage: 'Sonraki uygulama tarihi ve saati, uygulama tarihinden sonra olmalıdır.'
            };
        }
        return { appliedAtUtc: appliedIso, dueAtUtc: dueIso, errorMessage: null };
    }

    let dueIso: string | null = null;
    if (nextDueDateTrimmed) {
        const d = fromIstanbulDateTimeLocalInputToUtcIso(nextDueDateTrimmed);
        if (!d) {
            return { appliedAtUtc: null, dueAtUtc: null, errorMessage: 'Geçerli bir tarih seçin.' };
        }
        dueIso = d;
    }
    return { appliedAtUtc: null, dueAtUtc: dueIso, errorMessage: null };
}

/** Planlandı (0): `nextDueDate` şimdi'den ileri olmalı. */
export function vaccinationPlannedNotPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const root = control.parent;
        if (!root) {
            return null;
        }
        if (Number(root.get('status')?.value) !== 0) {
            return null;
        }
        const v = String(control.value ?? '').trim();
        if (!v) {
            return null;
        }
        const dueIso = fromIstanbulDateTimeLocalInputToUtcIso(v);
        if (!dueIso) {
            return null;
        }
        if (new Date(dueIso).getTime() <= Date.now()) {
            return { plannedNotPast: true };
        }
        return null;
    };
}

/** Uygulandı (1): `appliedAtLocal` gelecek olamaz. */
export function vaccinationAppliedNotFutureValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const root = control.parent;
        if (!root) {
            return null;
        }
        if (Number(root.get('status')?.value) !== 1) {
            return null;
        }
        const raw = String(control.value ?? '').trim();
        if (!raw) {
            return null;
        }
        const iso = fromIstanbulDateTimeLocalInputToUtcIso(raw);
        if (!iso) {
            return null;
        }
        if (new Date(iso).getTime() > Date.now()) {
            return { appliedNotFuture: true };
        }
        return null;
    };
}

/** Uygulandı (1): `nextDueDate` doluysa uygulama anından sonra olmalı. */
export function vaccinationNextDueAfterAppliedGroupValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        if (!group || typeof (group as { get?: unknown }).get !== 'function') {
            return null;
        }
        const g = group as { get: (n: string) => AbstractControl | null };
        if (Number(g.get('status')?.value) !== 1) {
            return null;
        }
        const appliedRaw = String(g.get('appliedAtLocal')?.value ?? '').trim();
        const next = String(g.get('nextDueDate')?.value ?? '').trim();
        if (!next || !appliedRaw) {
            return null;
        }
        const appliedIso = fromIstanbulDateTimeLocalInputToUtcIso(appliedRaw);
        const nextIso = fromIstanbulDateTimeLocalInputToUtcIso(next);
        if (!appliedIso || !nextIso) {
            return null;
        }
        if (new Date(nextIso).getTime() <= new Date(appliedIso).getTime()) {
            return { nextDueAfterApplied: true };
        }
        return null;
    };
}

/** `datetime-local` için Istanbul duvar saatinde şu an (`YYYY-MM-DDTHH:mm`). */
export function localDateTimeLocalInputMaxNow(): string {
    return toIstanbulDateTimeLocalInputValue(new Date().toISOString());
}

/** `datetime-local` min: Istanbul duvar saatinde andan 1 dakika sonrası (`YYYY-MM-DDTHH:mm`). */
export function minDateTimeLocalMinuteAfterNow(): string {
    return toIstanbulDateTimeLocalInputValue(new Date(Date.now() + 60_000).toISOString());
}

/** Uygulandı için boş alan varsayılanı: yereldeki şu an (`datetime-local` değeri). */
export function currentLocalDateTimeLocalInput(): string {
    return localDateTimeLocalInputMaxNow();
}

/**
 * Durum değişiminde tarih alanlarını semantiğe göre sıfırlar (create/edit ortak).
 * Yalnızca `prev !== next` çağrılarında kullanın; ilk form doldurmada çağırılmamalı.
 */
export function vaccinationStatusDateFieldsAfterTransition(
    _prev: VaccinationWriteStatusNum,
    next: VaccinationWriteStatusNum,
    appliedAtLocalTrimmed: string,
    nextDueDateTrimmed: string
): { appliedAtLocal: string; nextDueDate: string } {
    let applied = appliedAtLocalTrimmed.trim();
    let nextDue = nextDueDateTrimmed.trim();

    if (next === 1) {
        nextDue = '';
        if (!applied) {
            applied = currentLocalDateTimeLocalInput();
        } else {
            const iso = fromIstanbulDateTimeLocalInputToUtcIso(applied);
            if (iso && new Date(iso).getTime() > Date.now()) {
                applied = currentLocalDateTimeLocalInput();
            }
        }
        return { appliedAtLocal: applied, nextDueDate: nextDue };
    }

    if (next === 0) {
        applied = '';
        if (nextDue) {
            const dueIso = fromIstanbulDateTimeLocalInputToUtcIso(nextDue);
            if (!dueIso || new Date(dueIso).getTime() <= Date.now()) {
                nextDue = '';
            }
        }
        return { appliedAtLocal: applied, nextDueDate: nextDue };
    }

    return { appliedAtLocal: '', nextDueDate: '' };
}

/** Uygulamadan sonraki ilk dakika (`YYYY-MM-DDTHH:mm`, Istanbul); geçersizse boş. */
export function minDateTimeLocalMinuteAfter(appliedLocalDateTime: string): string {
    const appliedIso = fromIstanbulDateTimeLocalInputToUtcIso(appliedLocalDateTime.trim());
    if (!appliedIso) {
        return '';
    }
    const ms = new Date(appliedIso).getTime() + 60_000;
    if (Number.isNaN(ms)) {
        return '';
    }
    return toIstanbulDateTimeLocalInputValue(new Date(ms).toISOString());
}

