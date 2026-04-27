export interface ReminderSettingsFormValue {
    appointmentRemindersEnabled: boolean;
    appointmentReminderHoursBefore: number | null;
    vaccinationRemindersEnabled: boolean;
    vaccinationReminderDaysBefore: number | null;
    emailChannelEnabled: boolean;
}
