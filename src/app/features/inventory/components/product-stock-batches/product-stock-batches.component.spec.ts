import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import type { ProductStockBatchesVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { ProductStockBatchesComponent } from './product-stock-batches.component';

const vm = (available: string): ProductStockBatchesVm => ({
    productId: 'p1',
    clinicId: 'c1',
    unit: 'adet',
    quantityOnHand: 5,
    quantityOnHandText: '5',
    availableText: available,
    expiredQuantity: 0,
    expiredText: '0',
    batchedQuantityText: '5',
    unbatchedQuantity: 0,
    unbatchedQuantityText: '0',
    batches: []
});

describe('ProductStockBatchesComponent', () => {
    let fixture: ComponentFixture<ProductStockBatchesComponent>;
    let service: jasmine.SpyObj<StockBatchService>;

    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    beforeEach(async () => {
        service = jasmine.createSpyObj<StockBatchService>('StockBatchService', ['getByProduct']);
        service.getByProduct.and.returnValue(of(vm('5')));
        await TestBed.configureTestingModule({
            imports: [ProductStockBatchesComponent],
            providers: [{ provide: StockBatchService, useValue: service }]
        }).compileComponents();
        fixture = TestBed.createComponent(ProductStockBatchesComponent);
        fixture.componentRef.setInput('productId', 'p1');
        fixture.componentRef.setInput('clinicId', 'c1');
        fixture.detectChanges();
    });

    it('stok işlemi sonrası yenilemede özet yerinde kalır; "yükleniyor" yalnız ilk yüklemede görünür (alttaki bölümler zıplamaz)', () => {
        const pending = new Subject<ProductStockBatchesVm>();

        service.getByProduct.and.returnValue(pending);
        fixture.componentRef.setInput('reloadKey', 1);
        fixture.detectChanges();

        expect(text()).toContain('Kullanılabilir');
        expect(text()).not.toContain('Partiler yükleniyor');
        pending.next(vm('7'));
        pending.complete();
        fixture.detectChanges();
        expect(text()).toContain('7 adet');
    });
});
