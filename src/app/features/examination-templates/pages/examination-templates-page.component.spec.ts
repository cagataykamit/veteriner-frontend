import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationTemplateDto } from '@/app/features/examination-templates/models/examination-template.model';
import { ExaminationTemplatesService } from '@/app/features/examination-templates/services/examination-templates.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ExaminationTemplatesPageComponent } from './examination-templates-page.component';

const tpl = (id: string, name: string, over: Partial<ExaminationTemplateDto> = {}): ExaminationTemplateDto => ({
    id,
    name,
    visitReason: 'Şikâyet',
    findings: null,
    plan: null,
    isActive: true,
    isSystem: false,
    lines: [],
    rowVersion: 'V1',
    ...over
});
const paged = (items: ExaminationTemplateDto[]) => of({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 });

describe('ExaminationTemplatesPageComponent', () => {
    let fixture: ComponentFixture<ExaminationTemplatesPageComponent>;
    let cmp: ExaminationTemplatesPageComponent;
    let templates: jasmine.SpyObj<ExaminationTemplatesService>;
    let claims: Set<string>;
    let blocked: boolean;

    const root = () => fixture.nativeElement as HTMLElement;
    const rowTexts = () => Array.from(root().querySelectorAll('[data-testid="template-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' ').trim());

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ExaminationTemplatesPageComponent],
            providers: [
                provideRouter([]),
                { provide: ExaminationTemplatesService, useValue: templates },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ExaminationTemplatesPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set([
            'ExaminationTemplates.Read',
            'ExaminationTemplates.Create',
            'ExaminationTemplates.Update',
            'ExaminationTemplates.Deactivate',
            'Products.Read'
        ]);
        blocked = false;
        templates = jasmine.createSpyObj<ExaminationTemplatesService>('ExaminationTemplatesService', ['list', 'create', 'update', 'setActive']);
        templates.list.and.returnValue(
            paged([
                tpl('s1', 'Rutin muayene', { isSystem: true }),
                tpl('c1', 'Otitis paketi', {
                    lines: [
                        { productId: 'p1', productName: 'Damla', unit: 'Şişe', productKind: 'Medicine', productIsActive: false, quantity: 1, currentUnitPrice: 0, currency: 'TRY' }
                    ]
                }),
                tpl('c2', 'Eski paket', { isActive: false })
            ])
        );
    });

    it('pasifler dahil listeler; sistem şablonu rozetli, salt okunur ve kopyalanabilir', async () => {
        await create();
        expect(templates.list).toHaveBeenCalledWith(jasmine.objectContaining({ includeInactive: true, page: 1 }));
        const rows = rowTexts();

        expect(rows[0]).toContain('Sistem');
        expect(rows[0]).toContain('Salt okunur');
        expect(rows[0]).toContain('Kopyala ve düzenle');
        expect(rows[0]).not.toMatch(/Düzenle Kopyala|Pasifleştir/);
        expect(rows[1]).toContain('Metin + 1 satır');
        expect(rows[1]).toContain('Pasif ürün var');
        expect(rows[1]).toContain('Düzenle');
        expect(rows[1]).toContain('Pasifleştir');
        expect(rows[2]).toContain('Etkinleştir');
    });

    it('arama listeyi yeniden ister', async () => {
        await create();
        cmp.searchInput = ' otitis ';
        cmp.applySearch();
        expect(templates.list).toHaveBeenCalledWith(jasmine.objectContaining({ search: 'otitis', page: 1 }));
    });

    it('izin yoksa yazma düğmeleri görünmez', async () => {
        claims = new Set(['ExaminationTemplates.Read']);
        await create();
        expect(root().querySelector('[data-testid="template-new"]')).toBeNull();
        expect(rowTexts().join(' ')).not.toMatch(/Düzenle|Kopyala|Pasifleştir|Etkinleştir/);
    });

    it('hekim (Deactivate yok) düzenler ve kopyalar ama pasifleştiremez', async () => {
        claims.delete('ExaminationTemplates.Deactivate');
        await create();
        expect(rowTexts()[1]).toContain('Düzenle');
        expect(rowTexts().join(' ')).not.toMatch(/Pasifleştir|Etkinleştir/);
    });

    it('sistem şablonu düzenlenemez ve pasifleştirilemez; kopyalama düzenleyiciyi copy kipinde açar', async () => {
        await create();
        const system = tpl('s1', 'Rutin muayene', { isSystem: true });

        cmp.openEditor('edit', system);
        expect(cmp.editorVisible()).toBeFalse();
        cmp.setActive(system, false);
        expect(templates.setActive).not.toHaveBeenCalled();
        cmp.openEditor('copy', system);
        expect(cmp.editorVisible()).toBeTrue();
        expect(cmp.editorMode()).toBe('copy');
        expect(cmp.editorSource()).toBe(system);
    });

    it('düzenleyici çakışması mesaj gösterir ve listeyi yeniler', async () => {
        await create();
        const before = templates.list.calls.count();

        cmp.onEditorConflict('Şablon bu arada değişmiş; liste yenilendi, tekrar deneyin.');
        expect(cmp.listActionError()).toContain('değişmiş');
        expect(templates.list.calls.count()).toBe(before + 1);
    });

    it('etkinleştir pasif şablonu açar ve listeyi yeniler', async () => {
        templates.setActive.and.returnValue(of(undefined));
        await create();
        cmp.setActive(tpl('c2', 'Eski paket', { isActive: false }), true);
        expect(templates.setActive).toHaveBeenCalledWith('c2', true);
        expect(cmp.mutatingId()).toBeNull();
    });

    it('salt okunur kiracıda ekleme ve satır işlemleri kapalıdır', async () => {
        blocked = true;
        await create();
        expect(root().querySelector('[data-testid="template-new"]')).toBeNull();
        expect(rowTexts().join(' ')).not.toMatch(/Düzenle|Kopyala|Pasifleştir|Etkinleştir/);
    });
});
