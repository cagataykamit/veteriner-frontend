import type {
    ClinicAppointmentSettingsDto,
    UpdateClinicAppointmentSettingsRequestDto
} from '@/app/features/clinics/models/clinic-appointment-settings-api.model';
import type {
    ClinicAppointmentSettingsFormValue,
    ClinicAppointmentSettingsVm
} from '@/app/features/clinics/models/clinic-appointment-settings-vm.model';

const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
const DEFAULT_SLOT_INTERVAL_MINUTES = 15;
const DEFAULT_ALLOW_OVERLAPPING_APPOINTMENTS = false;

function isRecord(x: unknown): x is Record<string, unknown> {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = Number(value.trim());
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}

function pickBoolean(raw: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true' || normalized === '1') {
                return true;
            }
            if (normalized === 'false' || normalized === '0') {
                return false;
            }
        }
    }
    return null;
}

function normalizePositiveInteger(value: number | null, fallback: number): number {
    if (value === null) {
        return fallback;
    }
    const rounded = Math.trunc(value);
    return Number.isFinite(rounded) ? rounded : fallback;
}

export function mapClinicAppointmentSettingsRaw(raw: unknown): ClinicAppointmentSettingsVm {
    const source = isRecord(raw) ? raw : {};
    const defaultAppointmentDurationMinutes = normalizePositiveInteger(
        pickNumber(source, ['defaultAppointmentDurationMinutes', 'DefaultAppointmentDurationMinutes']),
        DEFAULT_APPOINTMENT_DURATION_MINUTES
    );
    const slotIntervalMinutes = normalizePositiveInteger(
        pickNumber(source, ['slotIntervalMinutes', 'SlotIntervalMinutes']),
        DEFAULT_SLOT_INTERVAL_MINUTES
    );
    const allowOverlappingAppointments =
        pickBoolean(source, ['allowOverlappingAppointments', 'AllowOverlappingAppointments']) ??
        DEFAULT_ALLOW_OVERLAPPING_APPOINTMENTS;

    return {
        defaultAppointmentDurationMinutes,
        slotIntervalMinutes,
        allowOverlappingAppointments
    };
}

export function mapClinicAppointmentSettingsResponse(raw: unknown): ClinicAppointmentSettingsVm {
    if (isRecord(raw)) {
        for (const key of ['data', 'Data', 'value', 'Value', 'result', 'Result']) {
            const nested = raw[key];
            if (nested !== undefined && nested !== null) {
                return mapClinicAppointmentSettingsRaw(nested);
            }
        }
    }
    return mapClinicAppointmentSettingsRaw(raw);
}

export function clinicAppointmentSettingsFormToPutBody(
    value: ClinicAppointmentSettingsFormValue
): UpdateClinicAppointmentSettingsRequestDto {
    return {
        defaultAppointmentDurationMinutes: normalizePositiveInteger(
            Number(value.defaultAppointmentDurationMinutes),
            DEFAULT_APPOINTMENT_DURATION_MINUTES
        ),
        slotIntervalMinutes: normalizePositiveInteger(Number(value.slotIntervalMinutes), DEFAULT_SLOT_INTERVAL_MINUTES),
        allowOverlappingAppointments: Boolean(value.allowOverlappingAppointments)
    };
}

export function mapClinicAppointmentSettingsDtoToVm(dto: ClinicAppointmentSettingsDto): ClinicAppointmentSettingsVm {
    return mapClinicAppointmentSettingsRaw(dto);
}
