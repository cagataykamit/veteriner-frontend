export interface ReminderSettingsVm {
    appointmentRemindersEnabled: boolean;
    appointmentReminderHoursBefore: number;
    vaccinationRemindersEnabled: boolean;
    vaccinationReminderDaysBefore: number;
    emailChannelEnabled: boolean;
    updatedAtUtc: string | null;
}
