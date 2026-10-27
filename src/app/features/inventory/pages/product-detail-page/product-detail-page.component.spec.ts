import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { MockedObject } from 'vitest';
import { NEVER, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_DEACTIVATE_CLAIM, PRODUCTS_UPDATE_CLAIM, STOCK_MOVEMENTS_CREATE_CLAIM, STOCK_MOVEMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import type { ProductDetailVm } from '@/app/entities/inventory/models/product-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { StockBatchService } from '@/app/entities/inventory/services/stock-batch.service';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { ProductDetailPageComponent } from './product-detail-page.component';

const ALL_CLAIMS = [PRODUCTS_UPDATE_CLAIM, PRODUCTS_DEACTIVATE_CLAIM, STOCK_MOVEMENTS_READ_CLAIM, STOCK_MOVEMENTS_CREATE_CLAIM];

const product = (over: Partial<ProductDetailVm> = {}): ProductDetailVm => ({
    id: 'p1',
    name: 'Amoksisilin 250 mg',
    sku: 'AMX-250',
    barcode: '8690000000001',
    description: '—',
    kind: 'Medicine',
    kindLabel: 'İlaç',
    controlledClass: 'None',
    controlledClassLabel: 'Yok',
    requiresLotAndExpiry: false,
    pharmacologicalForm: 'Tablet',
    presentationForm: 'Kutu',
    packaging: '20 tablet',
    categoryName: 'Antibiyotik',
    unit: 'Adet',
    unitPriceText: '₺120,00',
    currency: 'TRY',
    isActive: true,
    statusLabel: 'Aktif',
    statusSeverity: 'success',
    ...over
});

const stock = (over: Partial<ProductStockVm> = {}): ProductStockVm => ({
    id: 's1',
    productId: 'p1',
    productName: 'Amoksisilin 250 mg',
    productSkuText: 'AMX-250',
    productCategoryName: 'Antibiyotik',
    clinicId: 'c1',
    clinicName: 'Merkez Klinik',
    quantityOnHand: 12,
    quantityText: '12',
    availableQuantity: 10,
    availableText: '10 Adet',
    expiredQuantity: 2,
    expiredText: '2 Adet',
    hasExpired: true,
    minimumStockLevel: 5,
    minimumStockLevelText: '5 Adet',
    isBelowMinimum: false,
    statusLabel: 'Yeterli',
    statusSeverity: 'success',
    updatedAtText: '20.10.2026 10:00',
    ...over
});

describe('ProductDetailPageComponent', () => {
    let fixture: ComponentFixture<ProductDetailPageComponent>;
    let products: MockedObject<ProductService>;
    let movements: MockedObject<StockMovementService>;
    let claims: string[];
    let clinicId: string | null;
    let routeId: string | null;
    const readOnly = signal(false);

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';
    const dialog = () => document.querySelector('.p-dialog') as HTMLElement | null;
    const dialogText = () => dialog()?.textContent ?? '';
    const buttonsIn = (root: ParentNode) => Array.from(root.querySelectorAll('button, a')) as HTMLElement[];
    const labels = (root: ParentNode = el()) => buttonsIn(root).map((b) => b.textContent?.trim() ?? '');
    const findButton = (root: ParentNode, label: string) => {
        const b = buttonsIn(root).find((x) => x.textContent?.trim() === label);

        if (!b) {
            throw new Error(`Düğme yok: ${label}; mevcut: ${labels(root).join(' | ')}`);
        }

        return b as HTMLButtonElement;
    };
    const click = (root: ParentNode, label: string) => {
        findButton(root, label).click();
        fixture.detectChanges();
    };
    const type = (selector: string, value: string) => {
        const input = document.querySelector(selector) as HTMLInputElement;

        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };
    const chooseOperation = (label: string) => {
        const option = Array.from(document.querySelectorAll('.p-dialog p-selectbutton p-togglebutton')).find((x) => x.textContent?.trim() === label) as HTMLElement;

        option.click();
        fixture.detectChanges();
    };
    const submitDialog = () => {
        (dialog()!.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        fixture.detectChanges();
    };

    const render = () => {
        TestBed.configureTestingModule({
            imports: [ProductDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ProductService, useValue: products },
                { provide: StockMovementService, useValue: movements },
                { provide: StockBatchService, useValue: { getByProduct: () => NEVER } },
                {
                    provide: AuthService,
                    useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => clinicId, getClinicName: () => (clinicId ? 'Aktif Klinik' : null) }
                },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: readOnly } },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(routeId ? { id: routeId } : {})) } }
            ]
        });
        fixture = TestBed.createComponent(ProductDetailPageComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = [...ALL_CLAIMS];
        clinicId = 'c1';
        routeId = 'p1';
        readOnly.set(false);
        products = {
            getById: vi.fn().mockName('ProductService.getById'),
            getStocksByProductId: vi.fn().mockName('ProductService.getStocksByProductId'),
            updateProductStockMinimumLevel: vi.fn().mockName('ProductService.updateProductStockMinimumLevel'),
            deactivate: vi.fn().mockName('ProductService.deactivate'),
            activate: vi.fn().mockName('ProductService.activate')
        } as unknown as MockedObject<ProductService>;
        movements = { create: vi.fn().mockName('StockMovementService.create') } as unknown as MockedObject<StockMovementService>;
        products.getById.mockReturnValue(of(product()));
        products.getStocksByProductId.mockReturnValue(of([stock()]));
    });

    afterEach(() => {
        fixture?.destroy();
        document.querySelectorAll('.p-dialog-mask, .p-dialog').forEach((n) => n.remove());
    });

    describe('yükleme, hata ve boş durumlar', () => {
        it('ürün gelene kadar yükleniyor durumu', () => {
            products.getById.mockReturnValue(NEVER);
            render();

            expect(text()).toContain('Ürün yükleniyor…');
            expect(products.getById).toHaveBeenCalledWith('p1');
        });

        it('rota kimliği yoksa Geçersiz ürün', () => {
            routeId = null;
            render();

            expect(text()).toContain('Geçersiz ürün.');
            expect(products.getById).not.toHaveBeenCalled();
        });

        it('ürün alınamazsa hata durumu; Tekrar dene ürünü ve stokları yeniden çeker', () => {
            products.getById.mockReturnValue(throwError(() => new Error('Ürün bulunamadı.')));
            render();

            expect(text()).toContain('Ürün bulunamadı.');
            expect(products.getStocksByProductId).not.toHaveBeenCalled();

            products.getById.mockReturnValue(of(product()));
            click(el(), 'Tekrar dene');

            expect(products.getById).toHaveBeenCalledTimes(2);
            expect(products.getStocksByProductId).toHaveBeenCalledWith('p1');
            expect(text()).toContain('Genel bilgiler');
        });

        it('stok kaydı yoksa boş durum; parti kartı çıkmaz', () => {
            products.getStocksByProductId.mockReturnValue(of([]));
            render();

            expect(text()).toContain('Bu ürün için henüz stok kaydı yok.');
            expect(el().querySelector('[data-testid="product-batches-card"]')).toBeNull();
        });

        it('stoklar yüklenirken ve alınamazsa ayrı durum', () => {
            products.getStocksByProductId.mockReturnValue(NEVER);
            render();

            expect(text()).toContain('Stok bilgileri yükleniyor…');

            fixture.destroy();
            TestBed.resetTestingModule();
            products.getStocksByProductId.mockReturnValue(throwError(() => new Error('Stoklar alınamadı.')));
            render();

            expect(text()).toContain('Stoklar alınamadı.');
            expect(text()).toContain('Genel bilgiler');
        });
    });

    describe('görünür metin ve düğmeler', () => {
        it('genel bilgiler, açıklama ve üst düğmeler', () => {
            render();
            const t = text();

            for (const s of ['Ürün detayı', 'Amoksisilin 250 mg · AMX-250', 'Genel bilgiler', 'Barkod', '8690000000001', 'Antibiyotik', 'İlaç', 'Tablet', '₺120,00', 'Aktif', 'Açıklama', 'Açıklama yok.']) {
                expect(t).toContain(s);
            }

            const l = labels();

            expect(l).toContain('Düzenle');
            expect(l).toContain('Pasifleştir');
            expect(l).not.toContain('Aktifleştir');
            expect(l.filter((x) => x === 'Stok işlemi').length).toBe(3);
        });

        it('klinik stok tablosu ve parti kartı', () => {
            render();
            const t = text();

            for (const s of ['Klinik stokları', 'Stok hareketleri →', 'Stok hareketi ekle →', 'Kullanılabilir', 'Süresi geçmiş', 'Minimum stok', 'Son güncelleme', 'Merkez Klinik', '10 Adet', '5 Adet', 'Yeterli', '20.10.2026 10:00', 'Partiler']) {
                expect(t).toContain(s);
            }

            expect(el().querySelectorAll('[data-testid="expired-qty"]').length).toBe(2);
            expect(el().querySelectorAll('app-product-stock-batches').length).toBe(1);
        });

        it('hizmet türünde stok bölümü yok', () => {
            products.getById.mockReturnValue(of(product({ kind: 'Service', kindLabel: 'Hizmet' })));
            render();

            expect(text()).not.toContain('Klinik stokları');
            expect(labels()).not.toContain('Stok işlemi');
        });

        it('pasif üründe Aktifleştir düğmesi', () => {
            products.getById.mockReturnValue(of(product({ isActive: false, statusLabel: 'Pasif', statusSeverity: 'secondary' })));
            render();

            expect(labels()).toContain('Aktifleştir');
            expect(labels()).not.toContain('Pasifleştir');
        });

        it('salt okunur modda düzenleme kilitli, stok işlemi yok', () => {
            readOnly.set(true);
            render();

            expect(labels()).toContain('Düzenle (salt okunur)');
            expect(labels()).not.toContain('Stok işlemi');
            expect(labels()).not.toContain('Stok hareketi ekle →');
            expect(text()).toContain('Salt okunur modda stok girişi, stok çıkışı ve minimum stok güncellenemez');
        });

        it('stok hareketi okuma yetkisi yoksa parti kartı ve hareket bağlantısı yok', () => {
            claims = [PRODUCTS_UPDATE_CLAIM];
            render();

            expect(el().querySelector('[data-testid="product-batches-card"]')).toBeNull();
            expect(labels()).not.toContain('Stok hareketleri →');
        });
    });

    describe('stok işlemi diyaloğu', () => {
        it('satırdan açılır; klinik özeti ve işlem tipleri gösterilir', () => {
            render();

            click(el().querySelector('.hidden.md\\:block')!, 'Stok işlemi');
            const t = dialogText();

            expect(t).toContain('Stok işlemi');
            expect(t).toContain('Merkez Klinik');
            expect(t).toContain('Kullanılabilir stok');
            expect(t).toContain('+ 2 Adet süresi geçmiş');
            expect(t).toContain('Stok girişi');
            expect(t).toContain('Stok çıkışı');
            expect(t).toContain('Minimum stok ayarla');
            expect(t).toContain('Giriş miktarı *');
            expect(t).toContain('Birim maliyet');
            expect(t).toContain('Seri / lot no');
            expect(labels(dialog()!)).toContain('İptal');
            expect(findButton(dialog()!, 'Kaydet').disabled).toBe(true);
        });

        it('stok girişi kaydedilir, diyalog kapanır ve stoklar yenilenir', () => {
            movements.create.mockReturnValue(of(undefined));
            render();
            click(el().querySelector('.hidden.md\\:block')!, 'Stok işlemi');

            type('#soAmountIn', '5');
            type('#soUnitCost', '12.5');
            submitDialog();

            expect(movements.create).toHaveBeenCalledWith(
                expect.objectContaining({ clinicId: 'c1', productId: 'p1', movementType: 1, quantity: 5, unitCost: 12.5, reason: 'Stok girişi', notes: null, referenceType: null, referenceId: null })
            );
            expect(products.getStocksByProductId).toHaveBeenCalledTimes(2);
            expect(dialog()?.textContent ?? '').not.toContain('Giriş miktarı *');
        });

        it('stok çıkışı açıklamayla kaydedilir; hata diyalogda gösterilir', () => {
            movements.create.mockReturnValue(throwError(() => new Error('Yetersiz stok.')));
            render();
            click(el().querySelector('.hidden.md\\:block')!, 'Stok işlemi');

            chooseOperation('Stok çıkışı');
            expect(dialogText()).toContain('Çıkış miktarı *');
            type('#soAmountOut', '3');
            const notes = document.querySelector('#soNotesOut') as HTMLTextAreaElement;

            notes.value = 'Kırık ambalaj';
            notes.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            submitDialog();

            expect(movements.create).toHaveBeenCalledWith(expect.objectContaining({ movementType: 2, quantity: 3, unitCost: null, reason: 'Kırık ambalaj', notes: 'Kırık ambalaj' }));
            expect(dialogText()).toContain('Yetersiz stok.');
        });

        it('minimum stok güncellenir', () => {
            products.updateProductStockMinimumLevel.mockReturnValue(of(undefined));
            render();
            click(el().querySelector('.hidden.md\\:block')!, 'Stok işlemi');

            chooseOperation('Minimum stok ayarla');
            expect((document.querySelector('#soMinLevel') as HTMLInputElement).value).toBe('5');
            type('#soMinLevel', '8');
            submitDialog();

            expect(products.updateProductStockMinimumLevel).toHaveBeenCalledWith('s1', 8);
            expect(products.getStocksByProductId).toHaveBeenCalledTimes(2);
        });

        it('üst düğmeden birden çok klinikte önce klinik seçimi istenir', () => {
            products.getStocksByProductId.mockReturnValue(of([stock(), stock({ id: 's2', clinicId: 'c2', clinicName: 'Şube Klinik' })]));
            render();

            click(el().querySelector('app-page-header')!, 'Stok işlemi');

            expect(dialogText()).toContain('Klinik *');
            expect(dialogText()).not.toContain('Giriş miktarı *');
            expect(findButton(dialog()!, 'Kaydet').disabled).toBe(true);
        });

        it('üst düğmeden stok kaydı yokken aktif klinikle giriş yapılır', () => {
            products.getStocksByProductId.mockReturnValue(of([]));
            movements.create.mockReturnValue(of(undefined));
            render();

            click(el().querySelector('app-page-header')!, 'Stok işlemi');

            expect(dialogText()).toContain('Aktif Klinik');
            expect(dialogText()).toContain('Bu ürün için seçili klinikte henüz stok kaydı yok');
            expect(dialogText()).not.toContain('Minimum stok ayarla');

            type('#soAmountIn', '4');
            submitDialog();

            expect(movements.create).toHaveBeenCalledWith(expect.objectContaining({ clinicId: 'c1', movementType: 1, quantity: 4 }));
        });

        it('stok kaydı ve aktif klinik yoksa üst düğme kapalı', () => {
            products.getStocksByProductId.mockReturnValue(of([]));
            clinicId = null;
            render();

            const header = findButton(el().querySelector('app-page-header')!, 'Stok işlemi');

            expect(header.disabled).toBe(true);
            expect(header.title).toBe('Bu ürün için henüz klinik stok kaydı yok. İlk stok kaydı oluşturmak için klinik bilgisi gereklidir.');
        });

        it('İptal diyaloğu kapatır', () => {
            render();
            click(el().querySelector('.hidden.md\\:block')!, 'Stok işlemi');

            click(dialog()!, 'İptal');

            expect(dialog()?.textContent ?? '').not.toContain('Giriş miktarı *');
            expect(movements.create).not.toHaveBeenCalled();
        });
    });

    describe('pasifleştirme ve aktifleştirme', () => {
        const acceptConfirm = () => {
            const confirm = fixture.debugElement.injector.get(ConfirmationService);

            vi.spyOn(confirm, 'confirm').mockImplementation((c) => {
                c.accept?.();

                return confirm;
            });
        };

        it('Pasifleştir onaylanınca servis çağrılır ve ürün yeniden yüklenir', () => {
            products.deactivate.mockReturnValue(of(undefined));
            render();
            acceptConfirm();

            click(el(), 'Pasifleştir');

            expect(products.deactivate).toHaveBeenCalledWith('p1');
            expect(products.getById).toHaveBeenCalledTimes(2);
        });

        it('Aktifleştir hatası sayfada gösterilir', () => {
            products.getById.mockReturnValue(of(product({ isActive: false })));
            products.activate.mockReturnValue(throwError(() => new Error('Aktifleştirilemedi.')));
            render();
            acceptConfirm();

            click(el(), 'Aktifleştir');

            expect(products.activate).toHaveBeenCalledWith('p1');
            expect(text()).toContain('Aktifleştirilemedi.');
        });
    });
});
