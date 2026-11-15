import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchService } from '@/app/entities/client/services/client-search.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TreatmentFormComponent } from '@/app/entities/procedure/components/treatment-form.component';
import type { TreatmentEditVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { TreatmentNewPageComponent } from './treatment-new-page.component';

const source: TreatmentEditVm = {
    id: 't-src',
    clinicId: 'c',
    clientId: 'client-1',
    petId: 'pet-1',
    clientName: 'Ali Veli',
    petName: 'Pamuk',
    examinationId: '',
    treatmentDateUtc: '2026-09-01T07:00:00Z',
    title: 'Pansuman',
    description: 'Yara temizliği ve bandaj',
    notes: '',
    followUpDateInput: '',
    rowVersion: '',
    isCancelled: false
};

describe('TreatmentNewPageComponent kaydedilmemiş değişiklik (O2)', () => {
    let fixture: ComponentFixture<TreatmentNewPageComponent>;
    let router: Router;

    const embeddedForm = () => fixture.debugElement.query(By.directive(TreatmentFormComponent)).componentInstance as TreatmentFormComponent;

    // Kopya bağlamı formu geçerli doldurur; kayıt normal oluşturma ucundan gider.
    const render = () => {
        TestBed.configureTestingModule({
            imports: [TreatmentNewPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ copyFrom: 't-src' }) } } },
                { provide: ExaminationsService, useValue: { getExaminations: () => of({ items: [] }) } },
                { provide: TreatmentsService, useValue: { getTreatmentForEditById: () => of(source), createTreatment: vi.fn().mockReturnValue(of({ id: 't-new' })) } },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'client-1', fullName: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }), getPetById: () => of({ id: 'pet-1', name: 'Pamuk' }) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicName: () => 'K', getClinicId: () => 'c' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(TreatmentNewPageComponent);
        fixture.detectChanges();
    };

    afterEach(() => fixture?.destroy());

    it('bağlamla dolan form temizdir', () => {
        render();

        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('gömülü form kirlenince sayfa kaydedilmemiş değişiklik bildirir', () => {
        render();
        embeddedForm().form.controls.notes.markAsDirty();

        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });

    it('kayıt başarılıysa detaya yönlenmeden önce temiz sayılır', () => {
        render();
        let dirtyAtNavigate: boolean | undefined;

        vi.mocked(router.navigate).mockImplementation(() => {
            dirtyAtNavigate = fixture.componentInstance.hasUnsavedChanges();

            return Promise.resolve(true);
        });
        embeddedForm().form.controls.notes.setValue('Yeni not');
        embeddedForm().form.controls.notes.markAsDirty();
        embeddedForm().onSubmit();

        expect(router.navigate).toHaveBeenCalledWith(['/panel/treatments', 't-new'], { queryParams: { saved: '1' } });
        expect(dirtyAtNavigate).toBe(false);
    });
});
