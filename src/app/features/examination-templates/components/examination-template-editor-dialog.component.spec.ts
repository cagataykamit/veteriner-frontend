import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationTemplateDto } from '@/app/features/examination-templates/models/examination-template.model';
import { ExaminationTemplateError, ExaminationTemplatesService } from '@/app/features/examination-templates/services/examination-templates.service';
import type { ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { ExaminationTemplateEditorDialogComponent } from './examination-template-editor-dialog.component';

const product = (id: string, name: string, kind: ProductListItemVm['kind']): ProductListItemVm => ({ id, name, kind, sku: '—', unit: 'Adet', isActive: true }) as ProductListItemVm;

const own: ExaminationTemplateDto = {
    id: 't1',
    name: 'Otitis paketi',
    visitReason: 'Kulak kaşıntısı',
    findings: null,
    plan: 'Kontrol: 7 gün',
    isActive: true,
    isSystem: false,
    lines: [
        { productId: 'p1', productName: 'Kulak damlası', unit: 'Şişe', productKind: 'Medicine', productIsActive: true, quantity: 2, currentUnitPrice: 90, currency: 'TRY' },
        { productId: 'old', productName: 'Eski damla', unit: 'Şişe', productKind: 'Medicine', productIsActive: false, quantity: 1, currentUnitPrice: 0, currency: 'TRY' }
    ],
    rowVersion: 'R1'
};

describe('ExaminationTemplateEditorDialogComponent', () => {
    let fixture: ComponentFixture<ExaminationTemplateEditorDialogComponent>;
    let cmp: ExaminationTemplateEditorDialogComponent;
    let templates: MockedObject<ExaminationTemplatesService>;
    let products: MockedObject<ProductService>;
    let saved: ExaminationTemplateDto[];
    let conflicts: string[];

    async function open(mode: 'create' | 'edit' | 'copy', source: ExaminationTemplateDto | null, claims = ['Products.Read']): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ExaminationTemplateEditorDialogComponent],
            providers: [
                { provide: ExaminationTemplatesService, useValue: templates },
                { provide: ProductService, useValue: products },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ExaminationTemplateEditorDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('mode', mode);
        fixture.componentRef.setInput('source', source);
        saved = [];
        conflicts = [];
        cmp.saved.subscribe((d) => saved.push(d));
        cmp.conflict.subscribe((m) => conflicts.push(m));
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    }

    beforeEach(() => {
        templates = {
            create: vi.fn().mockName('ExaminationTemplatesService.create'),
            update: vi.fn().mockName('ExaminationTemplatesService.update')
        } as unknown as MockedObject<ExaminationTemplatesService>;
        products = {
            getProducts: vi.fn().mockName('ProductService.getProducts')
        } as unknown as MockedObject<ProductService>;
        products.getProducts.mockReturnValue(
            of({
                items: [product('p1', 'Kulak damlası', 'Medicine'), product('s1', 'Kulak temizliği', 'Service'), product('v1', 'Kuduz aşısı', 'Vaccine')],
                page: 1,
                pageSize: 200,
                totalItems: 3,
                totalPages: 1
            })
        );
    });

    it('ürün seçicide aşı yok, hizmet işaretli; pasif ürüne bağlı satır şablondaki adla ve uyarıyla kalır', async () => {
        await open('edit', own);
        expect(products.getProducts).toHaveBeenCalledWith({ page: 1, pageSize: 200, isActive: true });
        const [first, second] = cmp.lines.controls;
        const labels = cmp.optionsFor(first).map((o) => o.label);

        expect(labels).toEqual(['Kulak damlası', 'Kulak temizliği · Hizmet']);
        expect(cmp.optionsFor(second)[0]).toEqual({ value: 'old', label: 'Eski damla' });
        expect(cmp.inactiveNote(second)).toContain('pasif');
        expect(cmp.unitFor(second)).toBe('Şişe');
    });

    it('düzenleme tam gövdeyi rowVersion ile PUT eder; boş metin null gider', async () => {
        templates.update.mockReturnValue(of(own));
        await open('edit', own);
        cmp.removeLine(1);
        cmp.submit();
        expect(templates.update).toHaveBeenCalledTimes(1);
        expect(templates.update).toHaveBeenCalledWith('t1', { name: 'Otitis paketi', visitReason: 'Kulak kaşıntısı', findings: null, plan: 'Kontrol: 7 gün', lines: [{ productId: 'p1', quantity: 2 }] }, 'R1');
        expect(saved).toEqual([own]);
        expect(cmp.visible()).toBe(false);
    });

    it('kopyala ve düzenle içeriği yeni adla POST eder', async () => {
        templates.create.mockReturnValue(of(own));
        const system = { ...own, id: 'sys', isSystem: true, lines: [] };

        await open('copy', system);
        expect(cmp.form.controls.name.value).toBe('Otitis paketi (kopya)');
        cmp.submit();
        expect(templates.create).toHaveBeenCalledTimes(1);
        expect(templates.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Otitis paketi (kopya)', visitReason: 'Kulak kaşıntısı', lines: [] }));
        expect(templates.update).not.toHaveBeenCalled();
    });

    it('içerik yoksa veya aynı ürün iki kez varsa kaydetmez', async () => {
        await open('create', null);
        cmp.form.controls.name.setValue('Boş');
        expect(cmp.form.hasError('contentRequired')).toBe(true);
        cmp.addLine();
        cmp.addLine();
        cmp.lines.at(0).setValue({ productId: 'p1', quantity: 1 });
        cmp.lines.at(1).setValue({ productId: 'p1', quantity: 2 });
        expect(cmp.form.hasError('duplicateProduct')).toBe(true);
        cmp.submit();
        expect(templates.create).not.toHaveBeenCalled();
    });

    it('reddedilen satır ürün adıyla bildirilir ve işaretlenir; pencere açık kalır', async () => {
        templates.create.mockReturnValue(throwError(() => new ExaminationTemplateError('Ürün pasif; satırı çıkarın.', 'ExaminationTemplates.ProductInactive', 'p1')));
        await open('create', null);
        cmp.form.controls.name.setValue('Yeni');
        cmp.addLine();
        cmp.lines.at(0).setValue({ productId: 'p1', quantity: 1 });
        cmp.submit();
        expect(cmp.submitError()).toBe('"Kulak damlası" satırı: Ürün pasif; satırı çıkarın.');
        expect(cmp.errorProductId()).toBe('p1');
        expect(cmp.visible()).toBe(true);
    });

    it('409 sürüm çakışmasında pencere kapanır ve sayfaya bildirilir', async () => {
        templates.update.mockReturnValue(throwError(() => new ExaminationTemplateError('Şablon bu arada değişmiş.', 'ExaminationTemplates.ConcurrencyConflict')));
        await open('edit', own);
        cmp.removeLine(1);
        cmp.submit();
        expect(cmp.visible()).toBe(false);
        expect(conflicts).toEqual(['Şablon bu arada değişmiş.']);
    });

    it('ürün okuma izni yoksa satır eklenemez ve ürün listesi istenmez', async () => {
        await open('create', null, []);
        expect(products.getProducts).not.toHaveBeenCalled();
        expect(document.body.querySelector('[data-testid="template-line-add"]')).toBeNull();
    });
});
