import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdministrationVoidDialogComponent } from '@/app/features/administrations/components/administration-void-dialog.component';
import type { AdministrationStockOutcome, AdministrationVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';

const target: AdministrationVm = {
    id: 'a1',
    petId: 'p1',
    examinationId: 'e1',
    treatmentId: null,
    productId: 'pr1',
    productName: 'Serum',
    productSku: null,
    unit: 'şişe',
    quantity: 0.5,
    administeredAtUtc: '2026-10-13T08:00:00Z',
    notes: null,
    isVoided: false,
    voidedAtUtc: null,
    voidReason: null,
    voidStockOutcome: null,
    addedAfterFinalization: false,
    lateEntryReason: null,
    createdAtUtc: '2026-10-13T08:00:00Z',
    batchId: null,
    lotNumber: null,
    expiryDate: null
};

describe('AdministrationVoidDialogComponent', () => {
    let fixture: ComponentFixture<AdministrationVoidDialogComponent>;
    let cmp: AdministrationVoidDialogComponent;
    let service: jasmine.SpyObj<AdministrationsService>;
    let voided: AdministrationStockOutcome[];

    const reasonDialog = () => fixture.debugElement.children[0].componentInstance as ReasonConfirmDialogComponent;
    const open = () => {
        cmp.visible.set(true);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        service = jasmine.createSpyObj<AdministrationsService>('AdministrationsService', ['voidAdministration']);
        service.voidAdministration.and.returnValue(of({ ...target, isVoided: true }));
        await TestBed.configureTestingModule({
            imports: [AdministrationVoidDialogComponent],
            providers: [{ provide: AdministrationsService, useValue: service }]
        }).compileComponents();
        fixture = TestBed.createComponent(AdministrationVoidDialogComponent);
        cmp = fixture.componentInstance;
        voided = [];
        cmp.voided.subscribe((o) => voided.push(o));
        fixture.componentRef.setInput('target', target);
        fixture.detectChanges();
    });

    it('varsayılan sonuç stoğa iadedir; gerekçeyle birlikte StockReturned gider ve voided yayılır', () => {
        open();
        expect(cmp.outcome()).toBe('StockReturned');
        reasonDialog().form.controls.reason.setValue('Yanlış ürün seçildi');
        reasonDialog().onSubmit();
        expect(service.voidAdministration).toHaveBeenCalledWith('a1', 'Yanlış ürün seçildi', 'StockReturned');
        expect(voided).toEqual(['StockReturned']);
    });

    it('zarar/imha seçilince WrittenOff gider ve açıklama stok geri artmayacağını söyler', () => {
        open();
        cmp.outcome.set('WrittenOff');
        expect(cmp.description()).toContain('stoğa geri verilmez');
        reasonDialog().form.controls.reason.setValue('Şişe kırıldı');
        reasonDialog().onSubmit();
        expect(service.voidAdministration).toHaveBeenCalledWith('a1', 'Şişe kırıldı', 'WrittenOff');
        expect(voided).toEqual(['WrittenOff']);
    });

    it('diyalog her açılışta seçimi stoğa iadeye döndürür', () => {
        open();
        cmp.outcome.set('WrittenOff');
        cmp.visible.set(false);
        fixture.detectChanges();
        open();
        expect(cmp.outcome()).toBe('StockReturned');
    });
});
