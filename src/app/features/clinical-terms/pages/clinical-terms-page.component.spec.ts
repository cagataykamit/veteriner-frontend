import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClinicalTermDto } from '@/app/features/clinical-terms/models/clinical-term.model';
import { ClinicalTermError, ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicalTermsPageComponent } from './clinical-terms-page.component';

const term = (id: string, name: string, over: Partial<ClinicalTermDto> = {}): ClinicalTermDto => ({
    id,
    kind: 'Diagnosis',
    name,
    isActive: true,
    isSystem: false,
    rowVersion: 'V1',
    ...over
});
const paged = (items: ClinicalTermDto[]) => of({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 });

describe('ClinicalTermsPageComponent', () => {
    let fixture: ComponentFixture<ClinicalTermsPageComponent>;
    let cmp: ClinicalTermsPageComponent;
    let terms: MockedObject<ClinicalTermsService>;
    let claims: Set<string>;
    let blocked: boolean;

    const root = () => fixture.nativeElement as HTMLElement;
    const rowTexts = () => Array.from(root().querySelectorAll('[data-testid="term-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim());

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ClinicalTermsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClinicalTermsService, useValue: terms },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicalTermsPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['ClinicalTerms.Read', 'ClinicalTerms.Create', 'ClinicalTerms.Update', 'ClinicalTerms.Deactivate']);
        blocked = false;
        terms = {
            list: vi.fn().mockName('ClinicalTermsService.list'),
            create: vi.fn().mockName('ClinicalTermsService.create'),
            rename: vi.fn().mockName('ClinicalTermsService.rename'),
            setActive: vi.fn().mockName('ClinicalTermsService.setActive')
        } as unknown as MockedObject<ClinicalTermsService>;
        terms.list.mockReturnValue(paged([term('s1', 'Gastroenterit', { isSystem: true }), term('c1', 'Otitis', {}), term('c2', 'Eski tanı', { isActive: false })]));
    });

    it('pasifler dahil tanı listesini yükler; sistem terimi rozetle ayrışır ve salt okunurdur', async () => {
        await create();
        expect(terms.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'Diagnosis', includeInactive: true, page: 1 }));
        const rows = rowTexts();

        expect(rows[0]).toContain('Sistem');
        expect(rows[0]).toContain('Salt okunur');
        expect(rows[0]).not.toContain('Adı düzelt');
        expect(rows[1]).toContain('Kliniğe özel');
        expect(rows[1]).toContain('Adı düzelt');
        expect(rows[1]).toContain('Pasifleştir');
        expect(rows[2]).toContain('Pasif');
        expect(rows[2]).toContain('Etkinleştir');
    });

    it('tür değişince ve aramada liste yeniden istenir', async () => {
        await create();
        cmp.onKindChange('Complaint');
        expect(terms.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'Complaint', page: 1 }));
        cmp.searchInput = ' ishal ';
        cmp.applySearch();
        expect(terms.list).toHaveBeenCalledWith(expect.objectContaining({ kind: 'Complaint', search: 'ishal' }));
    });

    it('izin yoksa yazma düğmeleri görünmez', async () => {
        claims = new Set(['ClinicalTerms.Read']);
        await create();
        expect(root().querySelector('[data-testid="term-new"]')).toBeNull();
        expect(rowTexts().join(' ')).not.toMatch(/Adı düzelt|Pasifleştir|Etkinleştir/);
    });

    it('hekim (Deactivate yok) ad düzeltir ama pasifleştiremez', async () => {
        claims = new Set(['ClinicalTerms.Read', 'ClinicalTerms.Create', 'ClinicalTerms.Update']);
        await create();
        expect(rowTexts()[1]).toContain('Adı düzelt');
        expect(rowTexts().join(' ')).not.toMatch(/Pasifleştir|Etkinleştir/);
    });

    it('yeni terim seçili türde eklenir', async () => {
        terms.create.mockReturnValue(of(term('n1', 'Kulak akıntısı')));
        await create();
        cmp.openCreate();
        cmp.dialogForm.setValue({ name: 'Kulak akıntısı' });
        cmp.submitDialog();
        expect(terms.create).toHaveBeenCalledWith('Diagnosis', 'Kulak akıntısı');
        expect(cmp.dialogVisible()).toBe(false);
    });

    it('ad düzeltme rowVersion gönderir; 409 çakışmada pencere kapanır, mesaj gösterilir ve liste yenilenir', async () => {
        terms.rename.mockReturnValue(throwError(() => new ClinicalTermError('Kayıt bu arada değişmiş; liste yenilendi, tekrar deneyin.', true)));
        await create();
        const before = vi.mocked(terms.list).mock.calls.length;

        cmp.openRename(term('c1', 'Otitis'));
        cmp.dialogForm.setValue({ name: 'Otitis externa' });
        cmp.submitDialog();
        expect(terms.rename).toHaveBeenCalledWith('c1', 'Otitis externa', 'V1');
        expect(cmp.dialogVisible()).toBe(false);
        expect(cmp.listActionError()).toContain('değişmiş');
        expect(vi.mocked(terms.list).mock.calls.length).toBe(before + 1);
    });

    it('mükerrer ad hatası pencerede kalır', async () => {
        terms.create.mockReturnValue(throwError(() => new ClinicalTermError('Bu ad sözlükte zaten var.', false)));
        await create();
        cmp.openCreate();
        cmp.dialogForm.setValue({ name: 'GASTROENTERİT' });
        cmp.submitDialog();
        expect(cmp.dialogVisible()).toBe(true);
        expect(cmp.dialogError()).toBe('Bu ad sözlükte zaten var.');
    });

    it('sistem terimi düzeltilemez ve pasifleştirilemez', async () => {
        await create();
        const system = term('s1', 'Gastroenterit', { isSystem: true });

        cmp.openRename(system);
        expect(cmp.dialogVisible()).toBe(false);
        cmp.setActive(system, false);
        expect(terms.setActive).not.toHaveBeenCalled();
    });

    it('etkinleştir pasif terimi açar ve listeyi yeniler', async () => {
        terms.setActive.mockReturnValue(of(undefined));
        await create();
        cmp.setActive(term('c2', 'Eski tanı', { isActive: false }), true);
        expect(terms.setActive).toHaveBeenCalledWith('c2', true);
        expect(cmp.mutatingId()).toBeNull();
    });

    it('salt okunur kiracıda ekleme ve satır işlemleri kapalıdır', async () => {
        blocked = true;
        await create();
        expect(root().querySelector('[data-testid="term-new"]')).toBeNull();
        expect(rowTexts().join(' ')).not.toMatch(/Adı düzelt|Pasifleştir|Etkinleştir/);
    });
});
