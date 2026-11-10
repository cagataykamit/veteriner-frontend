import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientSearchService } from '@/app/entities/client/services/client-search.service';
import type { ExaminationDetailVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TreatmentEditVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { TreatmentFormComponent } from './treatment-form.component';

const exam = {
    id: 'e1',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    petId: 'pet-1',
    petName: 'Pamuk',
    examinedAtUtc: '2026-10-08T10:30:00Z',
    status: 'Draft'
} as ExaminationDetailVm;

describe('TreatmentFormComponent — muayene bağlamı', () => {
    const setup = (queryParams: Record<string, string>, examination: ExaminationDetailVm = exam) => {
        const examinations = {
            getExaminationById: vi.fn().mockName('ExaminationsService.getExaminationById'),
            getExaminations: vi.fn().mockName('ExaminationsService.getExaminations')
        };

        examinations.getExaminationById.mockReturnValue(of(examination));
        TestBed.configureTestingModule({
            imports: [TreatmentFormComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ExaminationsService, useValue: examinations },
                { provide: TreatmentsService, useValue: {} },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'client-1', fullName: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }), getPetById: () => of({ id: 'pet-1', name: 'Pamuk' }) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicName: () => 'K', getClinicId: () => 'c' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(TreatmentFormComponent);

        fixture.componentRef.setInput('contextParams', convertToParamMap(queryParams));
        fixture.detectChanges();

        return { fixture, examinations };
    };

    it('muayene bağlamıyla açılınca müşteri, hayvan ve muayene dolu gelir', () => {
        const { fixture, examinations } = setup({ clientId: 'client-1', petId: 'pet-1', examinationId: 'e1' });
        const raw = fixture.componentInstance.form.getRawValue();

        expect(examinations.getExaminationById).toHaveBeenCalledTimes(1);

        expect(examinations.getExaminationById).toHaveBeenCalledWith('e1');
        expect(raw.clientId).toBe('client-1');
        expect(raw.petId).toBe('pet-1');
        expect(raw.examinationId).toBe('e1');
        expect(fixture.componentInstance.contextFromExamination()).toBe(true);
    });

    it('kesinleşmiş muayene bağlamıyla açılınca kilit uyarısı formun üstünde, Kaydet öncesinde görünür', () => {
        const { fixture } = setup({ clientId: 'client-1', petId: 'pet-1', examinationId: 'e1' }, { ...exam, status: 'Finalized' } as ExaminationDetailVm);

        fixture.detectChanges();

        const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

        expect(alert?.textContent).toContain('kesinleştirilmiş');
    });

    it('bağlamsız açılışta form boş kalır ve muayene çağrısı yapılmaz', () => {
        const { fixture, examinations } = setup({});
        const raw = fixture.componentInstance.form.getRawValue();

        expect(examinations.getExaminationById).not.toHaveBeenCalled();
        expect(raw.clientId).toBe('');
        expect(raw.examinationId).toBe('');
        expect(fixture.componentInstance.contextFromExamination()).toBe(false);
    });

    it('adres çubuğu bağlamı muayeneyle uyuşmazsa form doldurulmaz ve uyarı gösterilir', () => {
        const { fixture } = setup({ clientId: 'client-X', petId: 'pet-1', examinationId: 'e1' });

        expect(fixture.componentInstance.form.getRawValue().clientId).toBe('');
        expect(fixture.componentInstance.selectionError()).toContain('uyuşmuyor');
    });
});

/** RECORD-004 2. dilim: tedavi kopyası oluşturma formunu doldurur; kayıt normal oluşturma ucundan gider. */
describe('TreatmentFormComponent — kopya', () => {
    const source: TreatmentEditVm = {
        id: 't-src',
        clinicId: 'c',
        clientId: 'client-1',
        petId: 'pet-1',
        clientName: 'Ali Veli',
        petName: 'Pamuk',
        examinationId: 'e-old',
        treatmentDateUtc: '2026-09-01T07:00:00Z',
        title: 'Pansuman',
        description: 'Yara temizliği ve bandaj',
        notes: 'Eski not',
        followUpDateInput: '2026-09-08'
    };

    const setup = (examinations: { id: string; status: string }[]) => {
        const createTreatment = vi.fn().mockReturnValue(of({ id: 't-new' }));

        TestBed.configureTestingModule({
            imports: [TreatmentFormComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ExaminationsService, useValue: { getExaminations: () => of({ items: examinations }) } },
                { provide: TreatmentsService, useValue: { getTreatmentForEditById: () => of(source), createTreatment } },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'client-1', fullName: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }), getPetById: () => of({ id: 'pet-1', name: 'Pamuk' }) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicName: () => 'K', getClinicId: () => 'c' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(TreatmentFormComponent);

        fixture.componentRef.setInput('contextParams', convertToParamMap({ copyFrom: 't-src' }));
        fixture.detectChanges();

        return { fixture, c: fixture.componentInstance, createTreatment };
    };

    it('hasta, başlık ve açıklama kopyalanır; tarih, not ve eski muayene bağı kopyalanmaz', () => {
        const { fixture, c } = setup([{ id: 'e-old', status: 'Finalized' }]);

        expect(c.form.getRawValue()).toEqual(
            expect.objectContaining({ clientId: 'client-1', petId: 'pet-1', title: 'Pansuman', description: 'Yara temizliği ve bandaj', notes: '', treatmentDateLocal: '', followUpDate: '', examinationId: '' })
        );
        expect(c.form.controls.clientId.disabled && c.form.controls.petId.disabled).toBe(true);
        expect(c.form.controls.examinationId.enabled).toBe(true);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="treatment-copy-notice"]')?.textContent).toContain('Pansuman');
    });

    it('hastanın tek açık muayenesi hedef olarak seçili gelir', () => {
        const { c } = setup([{ id: 'e-old', status: 'Finalized' }, { id: 'e-open', status: 'Draft' }]);

        expect(c.form.controls.examinationId.value).toBe('e-open');
    });
});