import type { MockedObject } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ReportPreferencesService, type ReportSavedFilterDto } from '../services/report-preferences.service';
import { ReportSavedFiltersComponent, type SavedFilterSource } from './report-saved-filters.component';

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

    function create(inputs: Record<string, string> = {}) {
        const fixture = TestBed.createComponent(ReportSavedFiltersComponent);

        fixture.componentRef.setInput('state', state as unknown as SavedFilterSource);
        Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
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

    it('ekrandaki filtreler uygulanan kayıttan ayrılınca seçim bırakılır; aynı kayıt yeniden seçilip uygulanabilir', () => {
        // Ekran filtreleri sinyalden okunur (takvim, rapor listesi); "Filtreleri temizle" kayıtlı seti ekrandan kaldırır.
        const current = signal<Record<string, string>>({ method: 'Cash' });

        state.savedFilterValues.mockImplementation(() => current());
        state.applySavedFilterValues.mockImplementation((values: Record<string, string>) => current.set({ ...values }));
        const fixture = create();
        const c = fixture.componentInstance;

        c.apply('f1');
        fixture.detectChanges();
        expect(c.selected()?.name).toBe('Kartlı');

        current.set({});
        fixture.detectChanges();
        expect(c.selectedId()).toBeNull();

        c.apply('f1');
        fixture.detectChanges();
        expect(state.applySavedFilterValues).toHaveBeenCalledTimes(2);
        expect(current()).toEqual({ method: 'Card' });
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

    it('kaydet penceresi gövdeye eklenir; açılır panel içinde kullanılsa da karartma menüyü kaplar', async () => {
        const fixture = create();

        fixture.componentInstance.openSave();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const dialog = document.body.querySelector('[role="dialog"]');

        expect(dialog).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).contains(dialog)).toBe(false);
        fixture.destroy();
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

    it('ekran anahtarı verilince Rapor Merkezi dışında da o anahtarla listeler ve kaydeder (APPT-026)', () => {
        url = '/panel/appointments/calendar?types=asi';
        preferences.createSavedFilter.mockReturnValue(of(saved('f2', 'Aşılar', { types: 'asi' })));
        state.savedFilterValues.mockReturnValue({ types: 'asi' });
        const fixture = create({ filterKey: 'screens.appointments-calendar', dialogHint: 'Ekran ipucu' });
        const c = fixture.componentInstance;

        expect(preferences.listSavedFilters).toHaveBeenCalledWith('screens.appointments-calendar');
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="report-saved-filters"]')).not.toBeNull();

        c.openSave();
        c.nameInput.set('Aşılar');
        c.save();

        expect(preferences.createSavedFilter).toHaveBeenCalledWith('screens.appointments-calendar', 'Aşılar', { types: 'asi' });
        expect(c.dialogHint()).toBe('Ekran ipucu');
    });
});
