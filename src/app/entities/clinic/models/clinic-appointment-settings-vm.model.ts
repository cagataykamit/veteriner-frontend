export interface ClinicAppointmentSettingsVm {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
}

export interface ClinicAppointmentSettingsFormValue {
    defaultAppointmentDurationMinutes: number;
    slotIntervalMinutes: number;
    allowOverlappingAppointments: boolean;
    ownerCancelLinkEnabled: boolean;
}
