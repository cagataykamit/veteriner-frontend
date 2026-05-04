import { HttpErrorResponse } from '@angular/common/http';
import { parseValidationHttpError } from '@/app/shared/utils/validation-error-parse.utils';
import { messageFromAppointmentUpsertHttpError } from '@/app/features/appointments/utils/appointment-upsert-error.utils';

const SUMMARY_FIELD_ERRORS = 'Lütfen hatalı alanları düzeltin.';

export type AppointmentUpsertFormFieldKey =
    | 'clientId'
    | 'petId'
    | 'scheduledAtLocal'
    | 'durationMinutes'
    | 'appointmentType'
    | 'status'
    | 'notes';
export type AppointmentUpsertFieldErrors = Partial<Record<AppointmentUpsertFormFieldKey, string>>;

export interface ParsedAppointmentUpsertHttpError {
    fieldErrors: AppointmentUpsertFieldErrors;
    summaryMessage: string | null;
}

const FIELD_MAP: Record<string, AppointmentUpsertFormFieldKey> = {
    clientid: 'clientId',
    ownerid: 'clientId',
    petid: 'petId',
    animalid: 'petId',
    scheduledatutc: 'scheduledAtLocal',
    scheduledat: 'scheduledAtLocal',
    appointmentdateutc: 'scheduledAtLocal',
    type: 'appointmentType',
    appointmenttype: 'appointmentType',
    status: 'status',
    appointmentstatus: 'status',
    lifecyclestatus: 'status',
    notes: 'notes',
    note: 'notes',
    durationminutes: 'durationMinutes',
    duration: 'durationMinutes'
};

export function parseAppointmentUpsertHttpError(err: HttpErrorResponse): ParsedAppointmentUpsertHttpError {
    return parseValidationHttpError<AppointmentUpsertFormFieldKey>(err, {
        fieldMap: FIELD_MAP,
        nonFieldMessage: (e) => messageFromAppointmentUpsertHttpError(e),
        fieldErrorsSummaryMessage: SUMMARY_FIELD_ERRORS
    });
}
