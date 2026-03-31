import { FormBuilder, Validators } from '@angular/forms';
import type { FormControl, FormGroup } from '@angular/forms';
import type { PetUpsertFormValue } from '@/app/features/pets/forms/pet-upsert-form.model';
import { petBirthDateValidator, petWeightStrValidator } from '@/app/features/pets/utils/pet-create-form.validators';

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
        notes: fb.nonNullable.control('')
    });
}

/** Typed `FormGroup` için `getRawValue()` — bileşende `as` kullanılmaz. */
export function getPetUpsertFormValue(form: PetUpsertFormGroup): PetUpsertFormValue {
    return form.getRawValue();
}
