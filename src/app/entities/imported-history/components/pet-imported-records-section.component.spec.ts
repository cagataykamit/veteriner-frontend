import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PetImportedRecordsSectionComponent } from '@/app/entities/imported-history/components/pet-imported-records-section.component';
import type { ImportedClinicalRecordDto } from '@/app/entities/imported-history/models/imported-history.model';
import { ImportedHistoryService } from '@/app/entities/imported-history/services/imported-history.service';

const record: ImportedClinicalRecordDto = {
    id: 'r1',
    recordedOn: '2024-05-03',
    recordType: 'Kontrol',
    complaint: 'İştahsızlık',
    history: null,
    findings: 'Ateş yüksek',
    diagnosis: 'Enfeksiyon',
    treatment: null,
    prescription: 'Antibiyotik 5 gün',
    labResults: null,
    notes: null,
    veterinarianName: 'Dr. Deneme',
    weightKg: 4.2,
    temperatureC: 39.8,
    clinicId: 'k1',
    importBatchId: 'b1',
    createdAtUtc: '2026-11-10T10:00:00Z'
};

describe('PetImportedRecordsSectionComponent', () => {
    let service: MockedObject<ImportedHistoryService>;
    let fixture: ComponentFixture<PetImportedRecordsSectionComponent>;

    function create(): HTMLElement {
        fixture = TestBed.createComponent(PetImportedRecordsSectionComponent);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        service = { getPetClinicalRecords: vi.fn() } as unknown as MockedObject<ImportedHistoryService>;
        TestBed.configureTestingModule({ imports: [PetImportedRecordsSectionComponent], providers: [{ provide: ImportedHistoryService, useValue: service }] });
    });

    it('kayıt yoksa bölüm hiç görünmez', () => {
        service.getPetClinicalRecords.mockReturnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));

        expect(create().querySelector('[data-testid="pet-imported-records"]')).toBeNull();
        expect(service.getPetClinicalRecords).toHaveBeenCalledWith('p1', 1, 10);
    });

    it('ilk okuma hatasında bölüm gizli kalır', () => {
        service.getPetClinicalRecords.mockReturnValue(throwError(() => new Error('x')));

        expect(create().querySelector('[data-testid="pet-imported-records"]')).toBeNull();
    });

    it('kaydı tarih, tür, hekim ve tanıyla listeler; açınca alanları gösterir', () => {
        service.getPetClinicalRecords.mockReturnValue(of({ items: [record], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        const el = create();

        expect(el.textContent).toContain('Eski program kayıtları');
        expect(el.textContent).toContain('03.05.2024');
        expect(el.textContent).toContain('Kontrol');
        expect(el.textContent).toContain('Dr. Deneme');
        expect(el.textContent).toContain('Enfeksiyon');
        expect(el.querySelector('[data-testid="imported-record-detail"]')).toBeNull();

        (el.querySelector('[data-testid="imported-record-toggle"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="imported-record-detail"]')?.textContent).toContain('Antibiyotik 5 gün');
        expect(el.textContent).toContain('Ateş 39.8 °C');
        expect(el.querySelector('[data-testid="imported-records-more"]')).toBeNull();
    });
});
