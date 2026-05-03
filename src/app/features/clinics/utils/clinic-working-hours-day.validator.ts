import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

function toMinutes(t: string): number | null {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
        return null;
    }
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59 || Number.isNaN(h) || Number.isNaN(min)) {
        return null;
    }
    return h * 60 + min;
}

/** Tek gün satırı — `isClosed` true iken doğrulama yok. */
export const clinicWorkingDayGroupValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    if (g.get('isClosed')?.value === true) {
        return null;
    }
    const open = (g.get('opensAt')?.value as string | null | undefined)?.trim() ?? '';
    const close = (g.get('closesAt')?.value as string | null | undefined)?.trim() ?? '';
    if (!open || !close) {
        return { dayHoursRequired: true };
    }
    const om = toMinutes(open);
    const cm = toMinutes(close);
    if (om === null || cm === null) {
        return { dayHoursRequired: true };
    }
    if (om >= cm) {
        return { openCloseOrder: true };
    }
    const bs = (g.get('breakStartsAt')?.value as string | null | undefined)?.trim() ?? '';
    const be = (g.get('breakEndsAt')?.value as string | null | undefined)?.trim() ?? '';
    if ((!bs && be) || (bs && !be)) {
        return { breakPair: true };
    }
    if (!bs && !be) {
        return null;
    }
    const bsm = toMinutes(bs);
    const bem = toMinutes(be);
    if (bsm === null || bem === null) {
        return { breakPair: true };
    }
    if (bsm >= bem) {
        return { breakOrder: true };
    }
    if (bsm < om || bem > cm) {
        return { breakInside: true };
    }
    return null;
};

const MSG: Record<string, string> = {
    dayHoursRequired: 'Açık günlerde açılış ve kapanış saati zorunludur.',
    openCloseOrder: 'Açılış saati kapanış saatinden önce olmalıdır.',
    breakPair: 'Mola başlangıç ve bitiş saati birlikte girilmelidir.',
    breakOrder: 'Mola başlangıç saati bitişten önce olmalıdır.',
    breakInside: 'Mola saatleri çalışma saatleri içinde olmalıdır.'
};

export function clinicWorkingDayErrorMessage(errors: ValidationErrors | null | undefined): string | null {
    if (!errors) {
        return null;
    }
    for (const k of Object.keys(errors)) {
        if (MSG[k]) {
            return MSG[k];
        }
    }
    return null;
}
