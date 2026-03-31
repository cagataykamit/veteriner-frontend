import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

type ProblemBody = ProblemDetails & {
    errors?: Record<string, string[] | string | unknown> | null;
};

function isGenericValidationTitle(s: string): boolean {
    const t = s.trim();
    return (
        /one or more validation errors occurred/i.test(s) ||
        /^validation failed/i.test(t) ||
        /^bad request$/i.test(t) ||
        /^İstek\s+işlenemedi\.?$/iu.test(t)
    );
}

/**
 * Alan sözlüğü yoksa: `detail` / `title` öncelikli; jenerik doğrulama başlıkları ve sunucunun genel "istek işlenemedi" metni yerine anlamlı fallback.
 */
function resolveVaccinationUpsertNonFieldMessage(err: HttpErrorResponse): string {
    const status = err.status;
    const body = err.error as ProblemBody | string | null | undefined;

    if (typeof body === 'string') {
        const t = body.trim();
        if (t && !isGenericValidationTitle(t)) {
            return t;
        }
        return messageFromHttpError(err, FALLBACK_GENERIC);
    }

    if (body && typeof body === 'object') {
        const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
        if (detail && !isGenericValidationTitle(detail)) {
            return detail;
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title && !isGenericValidationTitle(title)) {
            return title;
        }
    }

    if (status === 400 || status === 422) {
        return messageFromHttpError(err, FALLBACK_GENERIC);
    }

    return messageFromHttpError(err, FALLBACK_GENERIC);
}

export type VaccinationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'vaccineName'
    | 'appliedAtLocal'
    | 'nextDueDate'
    | 'status'
    | 'notes';

export type VaccinationUpsertFieldErrors = Partial<Record<VaccinationUpsertFormFieldKey, string>>;

export interface ParsedVaccinationUpsertHttpError {
    fieldErrors: VaccinationUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, VaccinationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    vaccinename: 'vaccineName',
    name: 'vaccineName',
    appliedatutc: 'appliedAtLocal',
    applicationdateutc: 'appliedAtLocal',
    appliedonutc: 'appliedAtLocal',
    nextdueatutc: 'nextDueDate',
    nextdoseatutc: 'nextDueDate',
    dueatutc: 'nextDueDate',
    duedate: 'nextDueDate',
    status: 'status',
    vaccinationstatus: 'status',
    lifecyclestatus: 'status',
    notes: 'notes',
    note: 'notes',
    description: 'notes'
};

export function parseVaccinationUpsertHttpError(err: HttpErrorResponse): ParsedVaccinationUpsertHttpError {
    return parseValidationHttpError<VaccinationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: resolveVaccinationUpsertNonFieldMessage,
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
