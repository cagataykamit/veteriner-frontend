import { FormBuilder, Validators } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { ReminderSettingsFormValue } from '@/app/features/reminders/forms/reminder-settings-form.model';

export type ReminderSettingsFormGroup = FormGroup<{
    [K in keyof ReminderSettingsFormValue]: FormControl<ReminderSettingsFormValue[K]>;
}>;

export function createReminderSettingsFormGroup(fb: FormBuilder): ReminderSettingsFormGroup {
    return fb.group({
        appointmentRemindersEnabled: fb.nonNullable.control(false),
        appointmentReminderHoursBefore: fb.control<number | null>(24, [Validators.required, Validators.min(1), Validators.max(168)]),
        vaccinationRemindersEnabled: fb.nonNullable.control(false),
        vaccinationReminderDaysBefore: fb.control<number | null>(3, [Validators.required, Validators.min(1), Validators.max(30)]),
        emailChannelEnabled: fb.nonNullable.control(true)
    });
}

export function getReminderSettingsFormValue(form: ReminderSettingsFormGroup): ReminderSettingsFormValue {
    return form.getRawValue();
}
