import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { AdministrationCreateResultVm } from '@/app/features/administrations/models/administration-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { VaccineDefinitionsService } from '@/app/features/vaccine-definitions/services/vaccine-definitions.service';
import { VaccinationFormComponent, type VaccinationSavedEvent } from './vaccination-form.component';

const product = (id: string, name: string, kind: string) => ({ id, name, kind, sku: '—', categoryName: '—', unit: 'doz', unitPriceText: '—', currency: 'TRY', isActive: true, statusLabel: 'Aktif', statusSeverity: 'success' });

const stockResult = (over: Partial<AdministrationCreateResultVm['stock']> = {}, created = true): AdministrationCreateResultVm => ({
    created,
    administration: {
        id: 'a1',
        petId: 'p1',
        examinationId: null,
        treatmentId: null,
        productId: 'pr1',
        productName: 'Nobivac',
        productSku: null,
        unit: 'doz',
        quantity: 1,
        administeredAtUtc: '2026-10-14T08:00:00Z',
        notes: null,
        isVoided: false,
        voidedAtUtc: null,
        voidReason: null,
        voidStockOutcome: null,
        addedAfterFinalization: false,
        lateEntryReason: null,
        createdAtUtc: '2026-10-14T08:00:00Z',
        batchId: null,
        lotNumber: 'L1',
        expiryDate: null,
        vaccinationId: 'v1'
    },
    stock: { quantityOnHand: 9, availableQuantity: 8, minimumStockLevel: 2, isBelowMinimum: false, ...over }
});

describe('VaccinationFormComponent — aşı + stoktan düşen uygulama', () => {
    let service: MockedObject<VaccinationsService>;
    let saved: VaccinationSavedEvent[];
    let canStock: boolean;

    const create = (): VaccinationFormComponent => {
        TestBed.configureTestingModule({
            imports: [VaccinationFormComponent],
            providers: [
                provideRouter([]),
                { provide: VaccinationsService, useValue: service },
                { provide: VaccineDefinitionsService, useValue: { getVaccineDefinitions: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: { getPetById: () => of({}) } },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [product('pr1', 'Nobivac', 'Vaccine'), product('pr2', 'Serum', 'Other')], page: 1, pageSize: 200, totalItems: 2, totalPages: 1 }) } },
                { provide: StockBatchService, useValue: { getByProduct: () => of(null) } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Klinik', hasOperationClaim: () => canStock } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const cmp = TestBed.createComponent(VaccinationFormComponent).componentInstance;

        cmp.saved.subscribe((e) => saved.push(e));
        cmp.ngOnInit();
        cmp.form.patchValue({ clientId: 'cl1', vaccineDefinitionId: 'd1' }, { emitEvent: false });
        cmp.form.controls.petId.enable({ emitEvent: false });
        cmp.form.controls.petId.setValue('p1', { emitEvent: false });
        cmp.form.controls.status.setValue(1);
        cmp.form.controls.appliedAtLocal.setValue('2026-10-10T10:00');

        return cmp;
    };

    beforeEach(() => {
        localStorage.removeItem('vetinity.vaccine.lastProductId');
        canStock = true;
        saved = [];
        service = {
            createVaccination: vi.fn().mockName('VaccinationsService.createVaccination')
        } as unknown as MockedObject<VaccinationsService>;
        service.createVaccination.mockReturnValue(of({ id: 'v1', stockResult: null }));
    });

    it('yalnız aşı türündeki ürünler seçenek olur', () => {
        const cmp = create();

        expect(cmp.productOptions().map((o) => o.value)).toEqual(['pr1']);
    });

    it('stok düşme yetkisi yoksa ürün listesi yüklenmez', () => {
        canStock = false;
        const cmp = create();

        expect(cmp.productOptions()).toEqual([]);
    });

    it('ürün seçilmezse ürün/miktar/requestId gönderilmez ve form geçerlidir', () => {
        const cmp = create();

        cmp.onSubmit();
        const payload = vi.mocked(service.createVaccination).mock.lastCall![0];

        expect(payload.productId).toBeUndefined();
        expect(payload.requestId).toBeUndefined();
        expect(saved).toEqual([{ id: 'v1', stockNotice: undefined }]);
    });

    it('ürün seçilince miktar varsayılan 1 olur, zorunlu hale gelir; ürün kalkınca temizlenir', () => {
        const cmp = create();

        cmp.form.controls.productId.setValue('pr1');
        expect(cmp.form.controls.quantity.value).toBe(1);
        cmp.form.controls.quantity.setValue(0);
        expect(cmp.form.valid).toBe(false);
        cmp.form.controls.productId.setValue('');
        expect(cmp.form.controls.quantity.value).toBeNull();
        expect(cmp.form.valid).toBe(true);
    });

    it('ürünle gönderimde ürün, miktar, parti ve requestId gider; başarıda stok bildirimi detaya taşınır', () => {
        service.createVaccination.mockReturnValue(of({ id: 'v1', stockResult: stockResult() }));
        const cmp = create();

        cmp.form.controls.productId.setValue('pr1');
        cmp.form.controls.quantity.setValue(2);
        cmp.form.controls.batchId.setValue('b9');
        cmp.onSubmit();
        const payload = vi.mocked(service.createVaccination).mock.lastCall![0];

        expect(payload).toEqual(expect.objectContaining({ productId: 'pr1', quantity: 2, batchId: 'b9' }));
        expect(payload.requestId).toBeTruthy();
        expect(saved[0].stockNotice?.text).toContain('kalan kullanılabilir stok 8 doz');
        expect(localStorage.getItem('vetinity.vaccine.lastProductId')).toBe('pr1');
    });

    it('hata sonrası yeniden denemede aynı requestId kullanılır (çift düşüm yok)', () => {
        const cmp = create();

        service.createVaccination.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'Vaccinations.ConcurrencyConflict' } } }))).mockReturnValueOnce(of({ id: 'v1', stockResult: null }));
        cmp.form.controls.productId.setValue('pr1');
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('iki kez düşülmez');
        cmp.onSubmit();
        const ids = vi.mocked(service.createVaccination).mock.calls.map((c) => c[0].requestId);

        expect(ids[0]).toBe(ids[1]);
    });

    it('durum "Uygulandı" dışına çıkınca seçili ürün temizlenir ve gönderilmez', () => {
        const cmp = create();

        cmp.form.controls.productId.setValue('pr1');
        cmp.form.controls.status.setValue(0);
        expect(cmp.form.controls.productId.value).toBe('');
    });

    it('son kullanılan ürün hatırlanır ve tek tıkla seçilir', () => {
        localStorage.setItem('vetinity.vaccine.lastProductId', 'pr1');
        const cmp = create();

        expect(cmp.lastProduct()?.label).toBe('Nobivac');
        cmp.useLastProduct('pr1');
        expect(cmp.form.controls.productId.value).toBe('pr1');
    });
});
