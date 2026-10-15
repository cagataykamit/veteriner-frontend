import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import { ImportReviewStepComponent } from '@/app/features/imports/components/import-review-step.component';
import type { ImportBatchDto, ImportPreviewDto, ImportRowDto, ImportRowPageDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { PetColorsService } from '@/app/features/pets/services/pet-colors.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/features/vaccine-definitions/services/vaccine-definitions.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const batch = { id: 'b1', status: 'Validated', summary: { customers: zero, pets: { ...zero, total: 1, error: 1 }, vaccinations: { ...zero, total: 1, error: 1 } } } as unknown as ImportBatchDto;

const preview = {
    validationId: 'v1',
    status: 'Validated',
    canCommit: false,
    blockers: [],
    summary: batch.summary,
    unmappedValues: [],
    issueCounts: [],
    reminderImpact: { vaccinationsWithDueDate: 0, vaccinationsWithFutureDueDate: 0, vaccinationsWithPastDueDate: 0, emailsWithinReminderWindow: 0, reminderWindowDays: 30, tenantRemindersEnabled: true },
    payloadPurged: false
} as unknown as ImportPreviewDto;

const row = (table: ImportRowDto['table'], field: string): ImportRowDto => ({
    table,
    rowNumber: 2,
    validation: { status: 'Error', action: null },
    apply: { status: 'Pending', targetId: null },
    issues: [{ severity: 'Error', code: 'Imports.RequiredMissing', field, message: 'Zorunlu alan boş.' }],
    source: {}
}) as unknown as ImportRowDto;

describe('ImportReviewStepComponent', () => {
    let fixture: ComponentFixture<ImportReviewStepComponent>;
    let imports: jasmine.SpyObj<ImportsService>;

    beforeEach(() => {
        imports = jasmine.createSpyObj<ImportsService>('ImportsService', ['getRows', 'downloadErrorReport']);
        TestBed.configureTestingModule({
            imports: [ImportReviewStepComponent],
            providers: [
                { provide: ImportsService, useValue: imports },
                { provide: SpeciesService, useValue: {} },
                { provide: VaccineDefinitionsService, useValue: {} },
                { provide: BreedsService, useValue: {} },
                { provide: PetColorsService, useValue: {} }
            ]
        });
    });

    it('satır sorununun alanını API anahtarı yerine etiketle gösterir (ADR-022: hasta)', () => {
        imports.getRows.and.returnValue(of({ items: [row('pets', 'HayvanAdi'), row('vaccinations', 'HayvanNo')], totalItems: 2 } as unknown as ImportRowPageDto));
        fixture = TestBed.createComponent(ImportReviewStepComponent);
        fixture.componentRef.setInput('batch', batch);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('choices', {});
        fixture.detectChanges();
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text).toContain('(Hasta adı)');
        expect(text).toContain('(Hasta no)');
        expect(text).not.toContain('HayvanAdi');
        expect(text).not.toContain('HayvanNo');
    });
});
