import { FormBuilder, Validators } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { PetUpsertFormValue } from '@/app/entities/pet/forms/pet-upsert-form.model';
import { PET_ALERT_NOTE_MAX, type PetAlertFlag } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { petBirthDateValidator, petWeightStrValidator } from '@/app/entities/pet/utils/pet-create-form.validators';

/** Angular typed forms: form değeri `PetUpsertFormValue` ile kilitli. */
export type PetUpsertFormGroup = FormGroup<{
    [K in keyof PetUpsertFormValue]: FormControl<PetUpsertFormValue[K]>;
}>;

/**
 * Yeni hayvan ve düzenleme sayfaları aynı factory’yi kullanır (tek doğruluk kaynağı).
 */
export function createPetUpsertFormGroup(fb: FormBuilder): PetUpsertFormGroup {
    return fb.group({
        clientId: fb.nonNullable.control('', Validators.required),
        name: fb.nonNullable.control('', Validators.required),
        speciesId: fb.nonNullable.control('', Validators.required),
        breedId: fb.nonNullable.control(''),
        gender: fb.nonNullable.control(''),
        birthDate: fb.nonNullable.control('', petBirthDateValidator()),
        colorId: fb.nonNullable.control(''),
        weightStr: fb.nonNullable.control<string | number>('', petWeightStrValidator()),
        microchipNumber: fb.nonNullable.control('', Validators.maxLength(50)),
        passportOrTagNumber: fb.nonNullable.control('', Validators.maxLength(50)),
        specialProtocolNumber: fb.nonNullable.control('', Validators.maxLength(50)),
        hbsAnimalId: fb.nonNullable.control('', Validators.maxLength(50)),
        isNeutered: fb.nonNullable.control(false),
        notes: fb.nonNullable.control(''),
        alertFlags: fb.nonNullable.control<PetAlertFlag[]>([]),
        alertNote: fb.nonNullable.control('', Validators.maxLength(PET_ALERT_NOTE_MAX))
    });
}

/** Typed `FormGroup` için `getRawValue()` — bileşende `as` kullanılmaz. */
export function getPetUpsertFormValue(form: PetUpsertFormGroup): PetUpsertFormValue {
    return form.getRawValue();
}
