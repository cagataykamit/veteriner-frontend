import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { ClinicalSnippetError, ClinicalSnippetsService } from '@/app/entities/clinical-snippet/services/clinical-snippets.service';
import { ClinicalSnippetsPageComponent } from './clinical-snippets-page.component';

const snippet = (id: string, shortcut: string, over: Partial<ClinicalSnippetDto> = {}): ClinicalSnippetDto => ({
    id,
    shortcut,
    title: `${shortcut} başlık`,
    body: 'Kaç kez?\nİçerik?',
    isActive: true,
    createdAtUtc: '2026-11-01T10:00:00Z',
    updatedAtUtc: null,
    rowVersion: 'V1',
    ...over
});
const paged = (items: ClinicalSnippetDto[]) => of({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 });

describe('ClinicalSnippetsPageComponent', () => {
    let fixture: ComponentFixture<ClinicalSnippetsPageComponent>;
    let cmp: ClinicalSnippetsPageComponent;
    let snippets: MockedObject<ClinicalSnippetsService>;
    let claims: Set<string>;
    let blocked: boolean;

    const root = () => fixture.nativeElement as HTMLElement;
    const rowTexts = () => Array.from(root().querySelectorAll('[data-testid="snippet-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim());

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ClinicalSnippetsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClinicalSnippetsService, useValue: snippets },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicalSnippetsPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['ClinicalSnippets.Read', 'ClinicalSnippets.Create', 'ClinicalSnippets.Update', 'ClinicalSnippets.Deactivate']);
        blocked = false;
        snippets = {
            list: vi.fn().mockName('ClinicalSnippetsService.list'),
            create: vi.fn().mockName('ClinicalSnippetsService.create'),
            update: vi.fn().mockName('ClinicalSnippetsService.update'),
            setActive: vi.fn().mockName('ClinicalSnippetsService.setActive')
        } as unknown as MockedObject<ClinicalSnippetsService>;
        snippets.list.mockReturnValue(paged([snippet('s1', 'kusma'), snippet('s2', 'eski', { isActive: false })]));
    });

    it('aktif liste yüklenir; kısayol # ile, metin önizlemesi ve durum görünür', async () => {
        await create();
        expect(snippets.list).toHaveBeenCalledWith(expect.objectContaining({ includeInactive: false, page: 1 }));
        const rows = rowTexts();

        expect(rows[0]).toContain('#kusma');
        expect(rows[0]).toContain('kusma başlık');
        expect(rows[0]).toContain('Kaç kez?');
        expect(rows[0]).toContain('Aktif');
        expect(rows[0]).toContain('Düzenle');
        expect(rows[0]).toContain('Pasifleştir');
        expect(rows[1]).toContain('Pasif');
        expect(rows[1]).toContain('Etkinleştir');
    });

    it('"Pasifleri göster" ve arama listeyi yeniden ister', async () => {
        await create();
        cmp.onIncludeInactiveChange(true);
        expect(snippets.list).toHaveBeenLastCalledWith(expect.objectContaining({ includeInactive: true, page: 1 }));
        cmp.searchInput = ' kus ';
        cmp.applySearch();
        expect(snippets.list).toHaveBeenLastCalledWith(expect.objectContaining({ includeInactive: true, search: 'kus' }));
    });

    it('izin yoksa yazma düğmeleri görünmez; hekim (Deactivate yok) düzenler ama pasifleştiremez', async () => {
        claims = new Set(['ClinicalSnippets.Read', 'ClinicalSnippets.Create', 'ClinicalSnippets.Update']);
        await create();
        expect(root().querySelector('[data-testid="snippet-new"]')).not.toBeNull();
        expect(rowTexts()[0]).toContain('Düzenle');
        expect(rowTexts().join(' ')).not.toMatch(/Pasifleştir|Etkinleştir/);
    });

    it('salt okunur kiracıda ekleme ve satır işlemleri kapalıdır', async () => {
        blocked = true;
        await create();
        expect(root().querySelector('[data-testid="snippet-new"]')).toBeNull();
        expect(rowTexts().join(' ')).not.toMatch(/Düzenle|Pasifleştir|Etkinleştir/);
        cmp.openCreate();
        expect(cmp.dialogVisible()).toBe(false);
    });

    it('düzenleyici açılır; açıklama görünür; geçersiz kısayol kaydedilmez, geçerli parça eklenir', async () => {
        snippets.create.mockReturnValue(of(snippet('n1', 'ishal')));
        await create();
        cmp.openCreate();
        fixture.detectChanges();
        expect(cmp.dialogVisible()).toBe(true);
        expect(document.body.textContent).toContain('kayıt ya da ücret üretmez');

        cmp.dialogForm.setValue({ shortcut: 'kan ishal', title: 'İshal', body: 'Kaç gündür?' });
        expect(cmp.dialogForm.controls.shortcut.hasError('shortcutFormat')).toBe(true);
        cmp.submitDialog();
        expect(snippets.create).not.toHaveBeenCalled();

        cmp.dialogForm.setValue({ shortcut: ' #İshal ', title: ' İshal anamnezi ', body: 'Kaç gündür?\nKan var mı?' });
        cmp.submitDialog();
        expect(snippets.create).toHaveBeenCalledWith({ shortcut: '#İshal', title: 'İshal anamnezi', body: 'Kaç gündür?\nKan var mı?' });
        expect(cmp.dialogVisible()).toBe(false);
    });

    it('düzenleme mevcut değerlerle açılır ve rowVersion gönderir; 409 çakışmada pencere kapanır, liste yenilenir', async () => {
        snippets.update.mockReturnValue(throwError(() => new ClinicalSnippetError('Parça bu arada değişmiş; liste yenilendi, tekrar deneyin.', 'ClinicalSnippets.ConcurrencyConflict')));
        await create();
        const before = vi.mocked(snippets.list).mock.calls.length;

        cmp.openEdit(snippet('s1', 'kusma'));
        expect(cmp.dialogForm.getRawValue()).toEqual({ shortcut: '#kusma', title: 'kusma başlık', body: 'Kaç kez?\nİçerik?' });
        cmp.dialogForm.controls.title.setValue('Kusma soruları');
        cmp.submitDialog();
        expect(snippets.update).toHaveBeenCalledWith('s1', { shortcut: '#kusma', title: 'Kusma soruları', body: 'Kaç kez?\nİçerik?' }, 'V1');
        expect(cmp.dialogVisible()).toBe(false);
        expect(cmp.listActionError()).toContain('değişmiş');
        expect(vi.mocked(snippets.list).mock.calls.length).toBe(before + 1);
    });

    it('mükerrer kısayol hatası pencerede kalır', async () => {
        snippets.create.mockReturnValue(throwError(() => new ClinicalSnippetError('Bu kısayol zaten kullanılıyor.', 'ClinicalSnippets.DuplicateShortcut')));
        await create();
        cmp.openCreate();
        cmp.dialogForm.setValue({ shortcut: 'kusma', title: 'X', body: 'Y' });
        cmp.submitDialog();
        expect(cmp.dialogVisible()).toBe(true);
        expect(cmp.dialogError()).toBe('Bu kısayol zaten kullanılıyor.');
    });

    it('etkinleştir pasif parçayı açar ve listeyi yeniler', async () => {
        snippets.setActive.mockReturnValue(of(undefined));
        await create();
        cmp.setActive(snippet('s2', 'eski', { isActive: false }), true);
        expect(snippets.setActive).toHaveBeenCalledWith('s2', true);
        expect(cmp.mutatingId()).toBeNull();
    });
});
