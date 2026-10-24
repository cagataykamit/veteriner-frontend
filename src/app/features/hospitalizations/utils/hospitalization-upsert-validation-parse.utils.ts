import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import {
    extractRawValidationErrors,
    firstStringMessage,
    parseValidationHttpError
} from '@/app/shared/utils/validation-error-parse.utils';
import {
    HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE,
    isHospitalizationDateTooFarPastBackendMessage
} from '@/app/features/hospitalizations/utils/hospitalization-date-validation.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';
const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

export const HOSPITALIZATION_CONCURRENCY_CONFLICT_CODE = 'Hospitalizations.ConcurrencyConflict';

/** Yatışta yalnız muayene bağı kilitlidir (sözleşme §3); diğer alanlar kesinleşmiş muayenede de serbesttir. */
export const HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE =
    'Kesinleşmiş muayeneye yatış bağlanamaz ve bağlı olduğu kesinleşmiş muayeneden ayrılamaz. Gerekirse muayeneye ek not ekleyin veya yatışı muayene olmadan, geliş kaydıyla bağlayın.';

/** Oda seçimi kodları (sözleşme §10.5) → oda alanı mesajı; seçici güncel tanımlarla yenilenmelidir. */
export const HOSPITALIZATION_ROOM_PROBLEM_MESSAGES: Record<string, string> = {
    'Hospitalizations.RoomNotFound': 'Seçilen oda bu klinikte bulunamadı; konum listesini yenileyip tekrar seçin.',
    'Hospitalizations.RoomInactive': 'Seçilen oda veya bölümü pasife alınmış; aktif bir oda seçin.'
};

function isConcurrencyConflict(err: HttpErrorResponse): boolean {
    return err.status === 409 && problemCodeFromHttpError(err) === HOSPITALIZATION_CONCURRENCY_CONFLICT_CODE;
}

/** Kod → yatışa özel mesaj; yoksa `null` (genel ayrıştırma sürer). */
function examinationFinalizedMessage(err: HttpErrorResponse): string | null {
    return err.status === 409 && problemCodeFromHttpError(err) === 'Examinations.Finalized' ? HOSPITALIZATION_EXAMINATION_FINALIZED_MESSAGE : null;
}

function roomProblemMessage(err: HttpErrorResponse): string | null {
    const code = problemCodeFromHttpError(err);

    return (code && HOSPITALIZATION_ROOM_PROBLEM_MESSAGES[code]) || null;
}

export type HospitalizationUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'admittedAtLocal'
    | 'plannedDischargeAtLocal'
    | 'examinationId'
    | 'visitId'
    | 'roomId'
    | 'reason'
    | 'notes';

export type HospitalizationUpsertFieldErrors = Partial<Record<HospitalizationUpsertFormFieldKey, string>>;

export interface ParsedHospitalizationUpsertHttpError {
    fieldErrors: HospitalizationUpsertFieldErrors;
    summaryMessage: string | null;
    /** 409 + `Hospitalizations.ConcurrencyConflict`: kayıt başka biri tarafından değişti, yeniden yükleme gerekir. */
    isConcurrencyConflict: boolean;
}

const FIELD_MAP: Record<string, HospitalizationUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    admittedatutc: 'admittedAtLocal',
    admittedat: 'admittedAtLocal',
    admissiontimeutc: 'admittedAtLocal',
    admissiontime: 'admittedAtLocal',
    planneddischargeatutc: 'plannedDischargeAtLocal',
    planneddischargeat: 'plannedDischargeAtLocal',
    examinationid: 'examinationId',
    visitid: 'visitId',
    // Konum artık bölüm → oda seçimidir; sunucunun `location`/`clearRoom` hataları da oda alanında gösterilir.
    roomid: 'roomId',
    clearroom: 'roomId',
    location: 'roomId',
    reason: 'reason',
    notes: 'notes',
    note: 'notes'
};

function normalizeHospitalizationUpsertFieldMessage(formKey: HospitalizationUpsertFormFieldKey, message: string): string {
    if (formKey === 'admittedAtLocal' && isHospitalizationDateTooFarPastBackendMessage(message)) {
        return HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE;
    }

    return message.trim();
}

function problemDetailText(err: HttpErrorResponse): string {
    const body = err.error as Record<string, unknown> | null | undefined;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return '';
    }

    const detail = typeof body['detail'] === 'string' ? body['detail'] : typeof body['Detail'] === 'string' ? body['Detail'] : '';
    const title = typeof body['title'] === 'string' ? body['title'] : typeof body['Title'] === 'string' ? body['Title'] : '';

    return [detail, title].filter(Boolean).join('\n').trim();
}

function promoteHospitalizationDatePastFromProblemDetail(err: HttpErrorResponse): HospitalizationUpsertFieldErrors | null {
    const detail = problemDetailText(err);

    if (isHospitalizationDateTooFarPastBackendMessage(detail)) {
        return { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE };
    }

    return null;
}

function promoteHospitalizationDatePastFromUnmappedErrors(err: HttpErrorResponse): HospitalizationUpsertFieldErrors | null {
    const raw = extractRawValidationErrors(err.error);

    if (!raw) {
        return null;
    }

    for (const [apiKey, val] of Object.entries(raw)) {
        const normalizedKey = apiKey
            .replace(/^\$/, '')
            .replace(/\[\d+]$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        if (FIELD_MAP[normalizedKey]) {
            continue;
        }

        const msg = firstStringMessage(val);

        if (msg && isHospitalizationDateTooFarPastBackendMessage(msg)) {
            return { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE };
        }
    }

    return null;
}

export function parseHospitalizationUpsertHttpError(err: HttpErrorResponse): ParsedHospitalizationUpsertHttpError {
    const finalized = examinationFinalizedMessage(err);

    if (finalized) {
        return { fieldErrors: { examinationId: finalized }, summaryMessage: SUMMARY_FIELD_ERRORS, isConcurrencyConflict: false };
    }

    const room = roomProblemMessage(err);

    if (room) {
        return { fieldErrors: { roomId: room }, summaryMessage: SUMMARY_FIELD_ERRORS, isConcurrencyConflict: false };
    }

    return { ...parseUpsertFieldErrors(err), isConcurrencyConflict: isConcurrencyConflict(err) };
}

function parseUpsertFieldErrors(err: HttpErrorResponse): Omit<ParsedHospitalizationUpsertHttpError, 'isConcurrencyConflict'> {
    const parsed = parseValidationHttpError<HospitalizationUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        normalizeMessage: normalizeHospitalizationUpsertFieldMessage,
        nonFieldMessage: (e) => messageFromHttpError(e, FALLBACK_GENERIC),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    if (Object.keys(parsed.fieldErrors).length > 0) {
        return parsed;
    }

    const fromDetail = promoteHospitalizationDatePastFromProblemDetail(err);

    if (fromDetail) {
        return { fieldErrors: fromDetail, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    const fromUnmapped = promoteHospitalizationDatePastFromUnmappedErrors(err);

    if (fromUnmapped) {
        return { fieldErrors: fromUnmapped, summaryMessage: SUMMARY_FIELD_ERRORS };
    }

    if (parsed.summaryMessage && isHospitalizationDateTooFarPastBackendMessage(parsed.summaryMessage)) {
        return {
            fieldErrors: { admittedAtLocal: HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE },
            summaryMessage: SUMMARY_FIELD_ERRORS
        };
    }

    return parsed;
}

export type HospitalizationDischargeFormFieldKey = 'dischargedAtLocal' | 'dischargeNote';

export type HospitalizationDischargeFieldErrors = Partial<Record<HospitalizationDischargeFormFieldKey, string>>;

export interface ParsedHospitalizationDischargeHttpError {
    fieldErrors: HospitalizationDischargeFieldErrors;
    summaryMessage: string | null;
    isConcurrencyConflict: boolean;
}

const DISCHARGE_FIELD_MAP: Record<string, HospitalizationDischargeFormFieldKey> = {
    dischargedatutc: 'dischargedAtLocal',
    dischargedat: 'dischargedAtLocal',
    dischargenote: 'dischargeNote',
    notes: 'dischargeNote',
    note: 'dischargeNote'
};

export function parseHospitalizationDischargeHttpError(
    err: HttpErrorResponse
): ParsedHospitalizationDischargeHttpError {
    const parsed = parseValidationHttpError<HospitalizationDischargeFormFieldKey>(err, {
        fieldMap: DISCHARGE_FIELD_MAP,
        nonFieldMessage: (e) => messageFromHttpError(e, 'Taburcu işlemi tamamlanamadı.'),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });

    return { ...parsed, isConcurrencyConflict: isConcurrencyConflict(err) };
}
