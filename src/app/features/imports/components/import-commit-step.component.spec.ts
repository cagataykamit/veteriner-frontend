import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { ImportCommitStepComponent } from '@/app/features/imports/components/import-commit-step.component';
import type { ImportBatchDto, ImportPreviewDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };
const customers: ImportTableSummaryDto = { ...zero, total: 5, valid: 5, willCreate: 5 };

const batch = (status: ImportBatchDto['status']): ImportBatchDto => ({
    id: 'b1',
    status,
    name: null,
    clinicId: null,
    validationId: 'v1',
    createdAtUtc: '2026-10-14T08:00:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: null,
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers, pets: zero, vaccinations: zero }
});

const preview = { validationId: 'v1', canCommit: true, blockers: [] } as unknown as ImportPreviewDto;

describe('ImportCommitStepComponent', () => {
    let fixture: ComponentFixture<ImportCommitStepComponent>;
    let imports: jasmine.SpyObj<ImportsService>;

    function create(b: ImportBatchDto): HTMLElement {
        fixture = TestBed.createComponent(ImportCommitStepComponent);
        fixture.componentRef.setInput('batch', b);
        fixture.componentRef.setInput('preview', preview);
        fixture.componentRef.setInput('canCommitClaim', true);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        imports = jasmine.createSpyObj<ImportsService>('ImportsService', ['commit', 'releaseReminders']);
        TestBed.configureTestingModule({ imports: [ImportCommitStepComponent], providers: [{ provide: ImportsService, useValue: imports }] });
    });

    it('uç yayında değilken (404 gövdesiz) nazik mesaj gösterir ve başarı bildirmez', () => {
        imports.commit.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
        const emitted: ImportBatchDto[] = [];
        create(batch('Validated'));
        fixture.componentInstance.batchChange.subscribe((b) => emitted.push(b));
        const cmp = fixture.componentInstance as unknown as { confirmed: boolean; commit(): void };
        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        expect(imports.commit).toHaveBeenCalledWith('b1', { validationId: 'v1', onErrors: 'SkipErrorRows' });
        expect(emitted).toEqual([]);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Uygulama henüz etkin değil');
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Aktarma tamamlandı');
    });

    it('gerçek hata kodunu "henüz etkin değil" saymaz', () => {
        imports.commit.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'Imports.ValidationStale' } })));
        create(batch('Validated'));
        const cmp = fixture.componentInstance as unknown as { confirmed: boolean; commit(): void };
        cmp.confirmed = true;
        cmp.commit();
        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).not.toContain('Uygulama henüz etkin değil');
        expect(text).toContain('Yeniden doğrulayın');
    });

    it('onay işaretlenmeden aktarmayı başlatmaz', () => {
        create(batch('Validated'));
        (fixture.componentInstance as unknown as { commit(): void }).commit();
        expect(imports.commit).not.toHaveBeenCalled();
    });

    it('aktarma sürerken ilerleme gösterir', () => {
        const el = create({ ...batch('Committing'), progress: { phase: 'Committing', processed: 50, total: 200 } });
        expect(el.textContent).toContain('50 / 200');
    });
});
