import type { MockedObject } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { AnyReportListState } from './report-list-state';
import { ReportPreferencesService, type ReportSavedFilterDto } from './report-preferences.service';
import { ReportSavedFiltersComponent } from './report-saved-filters.component';

describe('ReportSavedFiltersComponent — kayıtlı filtreler (REPORT-004)', () => {
    let preferences: MockedObject<ReportPreferencesService>;
    let state: { savedFilterValues: ReturnType<typeof vi.fn>; applySavedFilterValues: ReturnType<typeof vi.fn> };
    let url: string;
    let blocked: ReturnType<typeof signal<boolean>>;

    const saved = (id: string, name: string, filters: Record<string, string>): ReportSavedFilterDto => ({
        id,
        reportKey: 'payments',
        name,
        filters,
        createdAtUtc: '2026-10-30T08:00:00Z'
    });

    function create() {
        const fixture = TestBed.createComponent(ReportSavedFiltersComponent);

        fixture.componentRef.setInput('state', state as unknown as AnyReportListState);
        fixture.detectChanges();

        return fixture;
    }

    beforeEach(() => {
        url = '/panel/reports/payments?x=1';
        blocked = signal(false);
        state = { savedFilterValues: vi.fn(() => ({ method: 'Cash', clinicId: 'c1' })), applySavedFilterValues: vi.fn() };
        preferences = {
            listSavedFilters: vi.fn().mockName('listSavedFilters'),
            createSavedFilter: vi.fn().mockName('createSavedFilter'),
            deleteSavedFilter: vi.fn().mockName('deleteSavedFilter')
        } as unknown as MockedObject<ReportPreferencesService>;
        preferences.listSavedFilters.mockReturnValue(of([saved('f1', 'Kartlı', { method: 'Card' })]));
        TestBed.configureTestingModule({
            providers: [
                { provide: ReportPreferencesService, useValue: preferences },
                { provide: Router, useValue: { get url() { return url; } } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: blocked } }
            ]
        });
    });

    it('rapor anahtarını adresten alır ve kayıtları listeler; seçilen kayıt uygulanır', () => {
        const fixture = create();
        const c = fixture.componentInstance;

        expect(preferences.listSavedFilters).toHaveBeenCalledWith('payments');
        expect(c.savedFilters().map((f) => f.name)).toEqual(['Kartlı']);

        c.apply('f1');

        expect(state.applySavedFilterValues).toHaveBeenCalledWith({ method: 'Card' });
        expect(c.selected()?.name).toBe('Kartlı');
    });

    it('Rapor Merkezi dışında hiçbir şey göstermez ve istek atmaz', () => {
        url = '/panel/clients';
        const fixture = create();

        expect(preferences.listSavedFilters).not.toHaveBeenCalled();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="report-saved-filters"]')).toBeNull();
    });

    it('kaydet: diyalog açılırken alınan filtre seti adla gönderilir, liste ada göre sıralanır', () => {
        preferences.createSavedFilter.mockReturnValue(of(saved('f2', 'Ankara nakit', { method: 'Cash', clinicId: 'c1' })));
        const c = create().componentInstance;

        c.openSave();
        c.nameInput.set('  Ankara nakit ');
        c.save();

        expect(preferences.createSavedFilter).toHaveBeenCalledWith('payments', 'Ankara nakit', { method: 'Cash', clinicId: 'c1' });
        expect(c.savedFilters().map((f) => f.name)).toEqual(['Ankara nakit', 'Kartlı']);
        expect(c.selectedId()).toBe('f2');
        expect(c.dialogVisible()).toBe(false);
    });

    it('boş filtre setinde, adsızken veya salt okunur kiracıda kaydetmez', () => {
        const c = create().componentInstance;

        state.savedFilterValues.mockReturnValue({});
        c.openSave();
        c.nameInput.set('Boş');
        expect(c.pendingIsEmpty()).toBe(true);
        expect(c.canSave()).toBe(false);

        state.savedFilterValues.mockReturnValue({ method: 'Cash' });
        c.openSave();
        c.nameInput.set('   ');
        expect(c.canSave()).toBe(false);

        c.nameInput.set('Nakit');
        blocked.set(true);
        expect(c.canSave()).toBe(false);

        c.save();
        expect(preferences.createSavedFilter).not.toHaveBeenCalled();
    });

    it('kaydetme hatası (ör. aynı ad 409) diyalogda gösterilir, diyalog açık kalır', () => {
        preferences.createSavedFilter.mockReturnValue(throwError(() => new Error('Bu raporda aynı adla kayıtlı bir filtre var; başka bir ad seçin.')));
        const c = create().componentInstance;

        c.openSave();
        c.nameInput.set('Kartlı');
        c.save();

        expect(c.dialogError()).toContain('aynı adla');
        expect(c.dialogVisible()).toBe(true);
    });

    it('sil: kayıt listeden çıkar ve seçim temizlenir', () => {
        preferences.deleteSavedFilter.mockReturnValue(of(undefined));
        const c = create().componentInstance;

        c.apply('f1');
        c.delete(c.selected()!);

        expect(preferences.deleteSavedFilter).toHaveBeenCalledWith('f1');
        expect(c.savedFilters()).toEqual([]);
        expect(c.selectedId()).toBeNull();
    });
});
