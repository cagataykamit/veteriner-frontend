import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import type { PetUpsertFormGroup } from '@/app/entities/pet/forms/pet-upsert-form.factory';
import { PET_ALERT_NOTE_MAX, PET_ALERT_OPTIONS } from '@/app/shared/pet-alerts/pet-alerts.utils';

/** Hayvan oluşturma/düzenleme formunun "Uyarılar" bölümü (dört bayrak + kısa not). Not, bayrak seçilmeden kapalıdır. */
@Component({
    selector: 'app-pet-alert-fields',
    standalone: true,
    imports: [ReactiveFormsModule, CheckboxModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <fieldset class="border-0 p-0 m-0">
            <legend class="block text-sm font-medium text-muted-color mb-2 p-0">Uyarılar</legend>
            <div class="flex flex-wrap gap-4 mb-3">
                @for (o of options; track o.value) {
                    <div class="flex items-center gap-2">
                        <p-checkbox [formControl]="form().controls.alertFlags" [value]="o.value" [inputId]="'alert-' + o.value" />
                        <label class="text-sm cursor-pointer mb-0" [for]="'alert-' + o.value">{{ o.label }}</label>
                    </div>
                }
            </div>
            <label for="alertNote" class="block text-sm font-medium text-muted-color mb-2">Uyarı notu</label>
            <input
                id="alertNote"
                type="text"
                class="w-full p-inputtext p-component"
                [formControl]="form().controls.alertNote"
                [attr.maxlength]="noteMax"
                [readOnly]="form().controls.alertFlags.value.length === 0"
                placeholder="Örn. Penisiline alerji"
            />
            @if (form().controls.alertFlags.value.length === 0) {
                <small class="text-muted-color">Not eklemek için önce bir uyarı seçin.</small>
            }
        </fieldset>
    `
})
export class PetAlertFieldsComponent {
    readonly form = input.required<PetUpsertFormGroup>();
    protected readonly options = PET_ALERT_OPTIONS;
    protected readonly noteMax = PET_ALERT_NOTE_MAX;
}
