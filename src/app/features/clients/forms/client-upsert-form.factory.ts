import { FormBuilder } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { ClientUpsertFormValue } from '@/app/features/clients/forms/client-upsert-form.model';
import { clientUpsertFieldValidators } from '@/app/features/clients/utils/client-upsert.validation.utils';

export type ClientUpsertFormGroup = FormGroup<{
    [K in keyof ClientUpsertFormValue]: FormControl<ClientUpsertFormValue[K]>;
}>;

/** Yeni müşteri, düzenleme ve hızlı modal — tek doğruluk kaynağı. */
export function createClientUpsertFormGroup(fb: FormBuilder): ClientUpsertFormGroup {
    return fb.nonNullable.group({
        fullName: fb.nonNullable.control('', clientUpsertFieldValidators('fullName')),
        phone: fb.nonNullable.control('', clientUpsertFieldValidators('phone')),
        email: fb.nonNullable.control('', clientUpsertFieldValidators('email')),
        address: fb.nonNullable.control('', clientUpsertFieldValidators('address'))
    });
}

export function getClientUpsertFormValue(form: ClientUpsertFormGroup): ClientUpsertFormValue {
    return form.getRawValue();
}
