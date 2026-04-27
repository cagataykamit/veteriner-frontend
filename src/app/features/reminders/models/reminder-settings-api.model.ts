export interface ReminderSettingsDto {
    appointmentRemindersEnabled: boolean;
    appointmentReminderHoursBefore: number;
    vaccinationRemindersEnabled: boolean;
    vaccinationReminderDaysBefore: number;
    emailChannelEnabled: boolean;
    updatedAtUtc: string | null;
}

export interface ReminderSettingsUpdateRequestDto {
    appointmentRemindersEnabled: boolean;
    appointmentReminderHoursBefore: number;
    vaccinationRemindersEnabled: boolean;
    vaccinationReminderDaysBefore: number;
    emailChannelEnabled: boolean;
}
