import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ImportsListPageComponent } from '@/app/features/imports/pages/imports-list-page.component';
import type { ImportBatchDto, ImportTableSummaryDto } from '@/app/features/imports/models/import-api.model';
import { ImportsService } from '@/app/features/imports/services/imports.service';

const zero: ImportTableSummaryDto = { total: 0, valid: 0, warning: 0, error: 0, willCreate: 0, willMatch: 0, willSkip: 0, created: 0, matched: 0, skipped: 0, failed: 0 };

const batch = (id: string, over: Partial<ImportBatchDto>): ImportBatchDto => ({
    id,
    status: 'Committed',
    name: id,
    clinicId: null,
    validationId: 'v1',
    createdAtUtc: '2026-11-16T12:37:00Z',
    updatedAtUtc: null,
    validatedAtUtc: null,
    committedAtUtc: '2026-11-16T12:37:00Z',
    rolledBackAtUtc: null,
    remindersReleasedAtUtc: null,
    payloadPurgedAtUtc: null,
    summary: { customers: { ...zero, total: 4 }, pets: zero, vaccinations: zero, clinicalRecords: zero, accountEntries: zero, appointments: zero, products: zero },
    ...over
});

describe('ImportsListPageComponent', () => {
    let fixture: ComponentFixture<ImportsListPageComponent>;
    let imports: MockedObject<ImportsService>;

    function create(items: ImportBatchDto[], claim = true): HTMLElement {
        imports.listBatches.mockReturnValue(of({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 }));
        TestBed.configureTestingModule({
            imports: [ImportsListPageComponent],
            providers: [provideRouter([]), { provide: ImportsService, useValue: imports }, { provide: AuthService, useValue: { hasOperationClaim: () => claim } }]
        });
        fixture = TestBed.createComponent(ImportsListPageComponent);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    const row = (el: HTMLElement, name: string) => Array.from(el.querySelectorAll('li')).find((li) => li.textContent?.includes(name)) as HTMLElement;
    const rollbackLink = (li: HTMLElement) => Array.from(li.querySelectorAll('a')).find((a) => a.textContent?.includes('Geri al'));

    beforeEach(() => {
        imports = {
            listBatches: vi.fn().mockName('ImportsService.listBatches'),
            discard: vi.fn().mockName('ImportsService.discard'),
            downloadTemplate: vi.fn().mockName('ImportsService.downloadTemplate')
        } as unknown as MockedObject<ImportsService>;
    });

    it('varsayılan olarak yalnız geçerli partileri ister; "Tümü" kapanmışları da getirir', () => {
        create([]);

        expect(imports.listBatches).toHaveBeenLastCalledWith(1, 20, undefined, false);

        fixture.componentInstance.statusFilter = 'All';
        fixture.componentInstance.applyFilter();
        expect(imports.listBatches).toHaveBeenLastCalledWith(1, 20, undefined, true);

        fixture.componentInstance.statusFilter = 'RolledBack';
        fixture.componentInstance.applyFilter();
        expect(imports.listBatches).toHaveBeenLastCalledWith(1, 20, 'RolledBack', false);
    });

    it('süre içindeki partide son tarihi ve "Geri al" düğmesini, dolmuşta "Kesinleşti" bilgisini gösterir', () => {
        const el = create([
            batch('Açık parti', { canRollback: true, rollbackDeadlineUtc: '2026-12-16T12:37:00Z' }),
            batch('Eski parti', { canRollback: false, rollbackDeadlineUtc: '2026-10-14T08:00:00Z' })
        ]);
        const open = row(el, 'Açık parti');
        const final = row(el, 'Eski parti');

        expect(open.querySelector('[data-testid="import-rollback-deadline"]')?.textContent).toContain('16.12.2026 15:37 tarihine kadar geri alınabilir');
        expect(rollbackLink(open)).toBeDefined();
        expect(final.querySelector('[data-testid="import-final"]')?.textContent).toContain('Kesinleşti');
        expect(rollbackLink(final)).toBeUndefined();
    });

    it('aktarma yetkisi olmayan kullanıcı da kesinleşti bilgisini görür, son tarih ve düğme görmez', () => {
        const el = create(
            [batch('Açık parti', { canRollback: true, rollbackDeadlineUtc: '2026-12-16T12:37:00Z' }), batch('Eski parti', { canRollback: false, rollbackDeadlineUtc: '2026-10-14T08:00:00Z' })],
            false
        );

        expect(row(el, 'Açık parti').querySelector('[data-testid="import-rollback-deadline"]')).toBeNull();
        expect(rollbackLink(row(el, 'Açık parti'))).toBeUndefined();
        expect(row(el, 'Eski parti').querySelector('[data-testid="import-final"]')).not.toBeNull();
    });
});
