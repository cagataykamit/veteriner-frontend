import type { Mock } from 'vitest';
import { Component, Directive, forwardRef, input, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import type { ExaminationDetailVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { PetAlertBannerComponent } from '@/app/entities/pet/components/pet-alert-banner.component';
import { PetSearchComponent } from '@/app/entities/pet/components/pet-search.component';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { PrescriptionItemsEditorComponent } from '@/app/entities/prescription/components/prescription-items-editor.component';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { LabResultFormComponent } from './lab-result-form.component';
import { PrescriptionFormComponent } from './prescription-form.component';

/** Arama bileşenlerinin yerine basit değer erişimcisi (sunucu araması bu testin konusu değil). */
@Directive()
abstract class StubValueAccessor implements ControlValueAccessor {
    readonly inputId = input('');
    writeValue(): void {}
    registerOnChange(): void {}
    registerOnTouched(): void {}
}

@Component({
    selector: 'app-client-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubClientSearchComponent), multi: true }]
})
class StubClientSearchComponent extends StubValueAccessor {}

@Component({
    selector: 'app-pet-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StubPetSearchComponent), multi: true }]
})
class StubPetSearchComponent extends StubValueAccessor {
    readonly clientId = input<string | null>(null);
}

@Component({ selector: 'app-pet-alert-banner', standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class StubPetAlertBannerComponent {
    readonly petId = input<string | null>(null);
}

@Component({ selector: 'app-prescription-items-editor', standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class StubPrescriptionItemsEditorComponent {
    readonly items = input<unknown>(null);
}

const exam = {
    id: 'e1',
    clinicId: 'clinic-1',
    clinicName: 'Merkez',
    examinedAtUtc: '2026-10-08T10:30:00Z',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    petId: 'pet-1',
    petName: 'Pamuk',
    appointmentId: null,
    visitReason: 'İştahsızlık',
    status: 'Draft'
} as unknown as ExaminationDetailVm;

/** Muayene çalışma alanının "İşlemler" panelindeki bağlam (EXAM-010): müşteri, hasta ve muayene kimliği. */
const examinationContext = convertToParamMap({ clientId: 'client-1', petId: 'pet-1', examinationId: 'e1' });

describe('Muayeneden hızlı lab istemi ve reçete (EXAM-010)', () => {
    let createLab: Mock;
    let createPrescription: Mock;
    let getExaminationById: Mock;

    const configure = () => {
        createLab = vi.fn().mockName('createLabResult').mockReturnValue(of({ id: 'lab-1' }));
        createPrescription = vi.fn().mockName('createPrescription').mockReturnValue(of({ id: 'rx-1' }));
        getExaminationById = vi.fn().mockName('getExaminationById').mockReturnValue(of(exam));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: LabResultsService, useValue: { createLabResult: createLab } },
                { provide: PrescriptionsService, useValue: { createPrescription } },
                { provide: ExaminationsService, useValue: { getExaminationById, getExaminations: () => of({ items: [] }) } },
                { provide: TreatmentsService, useValue: { getTreatments: () => of({ items: [] }) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} },
                { provide: AuthService, useValue: { getClinicId: () => 'clinic-1', getClinicName: () => 'Merkez', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const stubs = { remove: { imports: [ClientSearchComponent, PetSearchComponent, PetAlertBannerComponent] }, add: { imports: [StubClientSearchComponent, StubPetSearchComponent, StubPetAlertBannerComponent] } };

        TestBed.overrideComponent(LabResultFormComponent, stubs);
        TestBed.overrideComponent(PrescriptionFormComponent, {
            remove: { imports: [...stubs.remove.imports, PrescriptionItemsEditorComponent] },
            add: { imports: [...stubs.add.imports, StubPrescriptionItemsEditorComponent] }
        });
    };

    it('lab istemi: muayene okunur, müşteri/hasta/muayene dolu ve kilitli gelir; kayıt muayene kimliğiyle gider', () => {
        configure();
        const fixture = TestBed.createComponent(LabResultFormComponent);

        fixture.componentRef.setInput('contextParams', examinationContext);
        fixture.componentRef.setInput('embedded', true);
        fixture.detectChanges();
        const c = fixture.componentInstance;
        const saved: string[] = [];

        c.saved.subscribe((id) => saved.push(id));

        expect(getExaminationById).toHaveBeenCalledWith('e1');
        expect(c.contextFromExamination()).toBe(true);
        expect(c.form.getRawValue()).toEqual(expect.objectContaining({ clientId: 'client-1', petId: 'pet-1', examinationId: 'e1' }));
        expect(c.form.controls.clientId.disabled && c.form.controls.petId.disabled && c.form.controls.examinationId.disabled).toBe(true);

        c.form.controls.testName.setValue('Hemogram');
        c.onSubmit();

        expect(createLab).toHaveBeenCalledTimes(1);
        expect(createLab.mock.lastCall![0]).toEqual(expect.objectContaining({ clinicId: 'clinic-1', petId: 'pet-1', examinationId: 'e1', testName: 'Hemogram' }));
        expect(saved).toEqual(['lab-1']);
    });

    it('reçete: muayene bağlamı dolu ve kilitli gelir; kayıt muayene kimliğiyle gider', () => {
        configure();
        const fixture = TestBed.createComponent(PrescriptionFormComponent);

        fixture.componentRef.setInput('contextParams', examinationContext);
        fixture.componentRef.setInput('embedded', true);
        fixture.detectChanges();
        const c = fixture.componentInstance;
        const saved: string[] = [];

        c.saved.subscribe((id) => saved.push(id));

        expect(getExaminationById).toHaveBeenCalledWith('e1');
        expect(c.prescriptionContextLocked()).toBe(true);
        expect(c.form.getRawValue()).toEqual(expect.objectContaining({ clientId: 'client-1', petId: 'pet-1', examinationId: 'e1' }));
        expect(c.form.controls.clientId.disabled && c.form.controls.petId.disabled && c.form.controls.examinationId.disabled).toBe(true);

        // Reçete tarihi en çok 7 gün geçmiş olabilir: bir saat önce (İstanbul duvar saati).
        c.form.patchValue({ prescribedAtLocal: toIstanbulDateTimeLocalInputValue(new Date(Date.now() - 3_600_000).toISOString()), title: 'Antibiyotik', content: 'Amoksisilin 2x1, 7 gün' });
        c.onSubmit();

        expect(createPrescription).toHaveBeenCalledTimes(1);
        expect(createPrescription.mock.lastCall![0]).toEqual(expect.objectContaining({ clinicId: 'clinic-1', petId: 'pet-1', examinationId: 'e1', title: 'Antibiyotik' }));
        expect(saved).toEqual(['rx-1']);
    });

    it('bağlam muayeneyle uyuşmazsa alanlar kilitlenmez ve uyarı verilir (yanlış hastaya kayıt açılmaz)', () => {
        configure();
        const fixture = TestBed.createComponent(LabResultFormComponent);

        fixture.componentRef.setInput('contextParams', convertToParamMap({ clientId: 'client-1', petId: 'pet-9', examinationId: 'e1' }));
        fixture.detectChanges();
        const c = fixture.componentInstance;

        expect(c.contextFromExamination()).toBe(false);
        expect(c.selectionError()).toContain('uyuşmuyor');
        expect(c.form.getRawValue().examinationId).toBe('');
    });
});
