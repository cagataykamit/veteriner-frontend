import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { createPetUpsertFormGroup, type PetUpsertFormGroup } from '@/app/features/pets/forms/pet-upsert-form.factory';
import { PetAlertFieldsComponent } from './pet-alert-fields.component';

describe('PetAlertFieldsComponent', () => {
    let fixture: ComponentFixture<PetAlertFieldsComponent>;
    let form: PetUpsertFormGroup;
    const note = () => fixture.nativeElement.querySelector('#alertNote') as HTMLInputElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [PetAlertFieldsComponent] }).compileComponents();
        form = createPetUpsertFormGroup(TestBed.inject(FormBuilder));
        fixture = TestBed.createComponent(PetAlertFieldsComponent);
        fixture.componentRef.setInput('form', form);
        fixture.detectChanges();
    });

    it('başlangıçta (form henüz geçersizken bile) not alanı geçersiz görünmez', () => {
        expect(form.invalid).toBe(true);
        expect(note().classList).not.toContain('ng-invalid');
        expect(note().readOnly).toBe(true);
    });

    it('200 karakteri aşan not alanı geçersiz işaretler', () => {
        form.controls.alertNote.setValue('x'.repeat(201));
        fixture.detectChanges();
        expect(form.controls.alertNote.invalid).toBe(true);
        expect(note().classList).toContain('ng-invalid');
    });

    it('bayrak seçilince not alanı yazılabilir olur', () => {
        form.controls.alertFlags.setValue(['Allergy']);
        fixture.detectChanges();
        expect(note().readOnly).toBe(false);
    });
});
