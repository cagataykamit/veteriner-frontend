import { FormBuilder } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { ClientUpsertFormValue } from '@/app/entities/client/forms/client-upsert-form.model';
import type { ClientContactChannel } from '@/app/entities/client/utils/client-contact-preference.utils';
import { clientUpsertFieldValidators } from '@/app/entities/client/utils/client-upsert.validation.utils';

export type ClientUpsertFormGroup = FormGroup<{
    [K in keyof ClientUpsertFormValue]: FormControl<ClientUpsertFormValue[K]>;
}>;

/** Yeni müşteri, düzenleme ve hızlı modal — tek doğruluk kaynağı. */
export function createClientUpsertFormGroup(fb: FormBuilder): ClientUpsertFormGroup {
    return fb.nonNullable.group({
        fullName: fb.nonNullable.control('', clientUpsertFieldValidators('fullName')),
        phone: fb.nonNullable.control('', clientUpsertFieldValidators('phone')),
        email: fb.nonNullable.control('', clientUpsertFieldValidators('email')),
        address: fb.nonNullable.control('', clientUpsertFieldValidators('address')),
        preferredContactChannel: fb.nonNullable.control<ClientContactChannel>('None'),
        remindersOptedOut: fb.nonNullable.control(false)
    });
}

export function getClientUpsertFormValue(form: ClientUpsertFormGroup): ClientUpsertFormValue {
    return form.getRawValue();
}
