import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BreedsService } from '@/app/entities/breed/services/breeds.service';
import { ImportReviewStepComponent } from '@/app/features/imports/components/import-review-step.component';
import type { ImportBatchDto, ImportPreviewDto, ImportRowDto, ImportRowPageDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';
import { PetColorsService } from '@/app/entities/pet/services/pet-colors.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/entities/vaccine-definition/services/vaccine-definitions.service';

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

const row = (table: ImportRowDto['table'], field: string): ImportRowDto =>
    ({
        table,
        rowNumber: 2,
        validation: { status: 'Error', action: null },
        apply: { status: 'Pending', targetId: null },
        issues: [{ severity: 'Error', code: 'Imports.RequiredMissing', field, message: 'Zorunlu alan boş.' }],
        source: {}
    }) as unknown as ImportRowDto;

describe('ImportReviewStepComponent', () => {
    let fixture: ComponentFixture<ImportReviewStepComponent>;
    let imports: MockedObject<ImportsService>;

    beforeEach(() => {
        imports = {
            getRows: vi.fn().mockName('ImportsService.getRows'),
            downloadErrorReport: vi.fn().mockName('ImportsService.downloadErrorReport')
        } as unknown as MockedObject<ImportsService>;
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
        imports.getRows.mockReturnValue(of({ items: [row('pets', 'HayvanAdi'), row('vaccinations', 'HayvanNo')], totalItems: 2 } as unknown as ImportRowPageDto));
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

    it('süzgeç değişince satırlar yerinde kalır; "yükleniyor" yalnız ilk yüklemede görünür (alttaki düğmeler zıplamaz)', () => {
        imports.getRows.mockReturnValue(of({ items: [row('pets', 'HayvanAdi')], totalItems: 1 } as unknown as ImportRowPageDto));
        fixture = TestBed.createComponent(ImportReviewStepComponent);
        fixture.componentRef.setInput('batch', batch);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('choices', {});
        fixture.detectChanges();
        fixture.detectChanges();

        const pending = new Subject<ImportRowPageDto>();

        imports.getRows.mockReturnValue(pending);
        fixture.componentInstance['setStatus']('Error');
        fixture.detectChanges();

        const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

        expect(text()).toContain('(Hasta adı)');
        expect(text()).not.toContain('Satırlar yükleniyor');
        pending.next({ items: [row('pets', 'HayvanAdi')], totalItems: 1 } as unknown as ImportRowPageDto);
        pending.complete();
        fixture.detectChanges();
        expect(text()).toContain('(Hasta adı)');
    });
});
