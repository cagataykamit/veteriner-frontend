import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, EMPTY, Subject } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { AdministrationsSectionComponent } from '@/app/entities/administration/components/administrations-section.component';
import type { AdministrationsPagedVm, AdministrationVm } from '@/app/entities/administration/models/administration-vm.model';
import { AdministrationsService } from '@/app/entities/administration/services/administrations.service';
import { StockBatchService } from '@/app/entities/inventory/services/stock-batch.service';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

const row: AdministrationVm = {
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
    expiryDate: null,
    vaccinationId: null
};

const page = (items: AdministrationVm[]): AdministrationsPagedVm => ({ items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 });

describe('AdministrationsSectionComponent', () => {
    let fixture: ComponentFixture<AdministrationsSectionComponent>;
    let service: MockedObject<AdministrationsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const setup = async (
        inputs: {
            locked?: boolean;
            treatmentId?: string;
        } = {}
    ) => {
        await TestBed.configureTestingModule({
            imports: [AdministrationsSectionComponent],
            providers: [
                provideRouter([]),
                { provide: AdministrationsService, useValue: service },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
                { provide: StockBatchService, useValue: { getByProduct: () => EMPTY } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AdministrationsSectionComponent);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.componentRef.setInput('examinationId', 'e1');

        if (inputs.treatmentId) {
            fixture.componentRef.setInput('treatmentId', inputs.treatmentId);
        }

        fixture.componentRef.setInput('locked', inputs.locked ?? false);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    /** İptal et satır eylemi simge düğmesidir (ADR-026); erişilebilir adıyla aranır. */
    const voidButton = () => (fixture.nativeElement as HTMLElement).querySelector('app-row-action-button [aria-label="İptal et"]');
    const has = (testId: string) => !!(fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        service = {
            getAdministrations: vi.fn().mockName('AdministrationsService.getAdministrations'),
            voidAdministration: vi.fn().mockName('AdministrationsService.voidAdministration')
        } as unknown as MockedObject<AdministrationsService>;
        service.getAdministrations.mockReturnValue(of(page([row])));
        claims = new Set(['Administrations.Read']);
        mutationBlocked = false;
    });

    it('okuma izni yoksa hiçbir şey çizmez ve istek atmaz', async () => {
        claims.clear();
        await setup();
        expect(has('administrations-section')).toBe(false);
        expect(service.getAdministrations).not.toHaveBeenCalled();
    });

    it('yalnız okuma izniyle liste görünür, Uygulama ekle ve İptal et görünmez', async () => {
        await setup();
        expect(text()).toContain('Serum');
        expect(has('administration-add')).toBe(false);
        expect(voidButton()).toBeNull();
    });

    it('muayene bağlamında muayeneye göre süzer; tedavi bağlamında tedaviye göre', async () => {
        await setup();
        expect(vi.mocked(service.getAdministrations).mock.lastCall![0]).toEqual(expect.objectContaining({ examinationId: 'e1', treatmentId: undefined, includeVoided: false }));
        TestBed.resetTestingModule();
        service.getAdministrations.mockClear();
        await setup({ treatmentId: 't1' });
        expect(vi.mocked(service.getAdministrations).mock.lastCall![0]).toEqual(expect.objectContaining({ treatmentId: 't1', examinationId: undefined }));
    });

    it('iptal edilenler varsayılan gizlidir; "İptal edilenleri göster" ile yeniden yüklenir', async () => {
        await setup();
        expect(vi.mocked(service.getAdministrations).mock.lastCall![0]?.includeVoided).toBe(false);
        service.getAdministrations.mockClear();
        fixture.componentInstance.setShowVoided(true);
        expect(vi.mocked(service.getAdministrations).mock.lastCall![0]?.includeVoided).toBe(true);
        fixture.detectChanges();
        expect(text()).toContain('İptal edilenleri göster');
    });

    it('süzgeç değişince liste yerinde kalır; "Yükleniyor" yalnız ilk yüklemede görünür (alttaki bölümler zıplamaz)', async () => {
        await setup();
        const pending = new Subject<AdministrationsPagedVm>();

        service.getAdministrations.mockReturnValue(pending);
        fixture.componentInstance.setShowVoided(true);
        fixture.detectChanges();

        expect(text()).toContain('Serum');
        expect(text()).not.toContain('Uygulamalar yükleniyor');
        pending.next(page([row]));
        pending.complete();
        fixture.detectChanges();
        expect(text()).toContain('Serum');
    });

    it('kayıt yokken boş durum tek satır; süzgeç ve Uygulama ekle başlık satırında kalır', async () => {
        claims.add('Administrations.Create');
        service.getAdministrations.mockReturnValue(of(page([])));
        await setup();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="administrations-empty"]')?.textContent).toContain('Bu kayıtta uygulanan ürün yok.');
        expect(el.querySelector('app-empty-state')).toBeNull();
        const header = el.querySelector('h5')!.parentElement!;

        expect(header.querySelector('[data-testid="administrations-show-voided"]')).not.toBeNull();
        expect(header.querySelector('[data-testid="administration-add"]')).not.toBeNull();
    });

    it('Create izniyle Uygulama ekle görünür; Correct izniyle İptal et görünür', async () => {
        claims.add('Administrations.Create').add('Administrations.Correct');
        await setup();
        expect(has('administration-add')).toBe(true);
        expect(voidButton()).not.toBeNull();
    });

    it('kesinleşmiş muayenede ekleme görünür (sonradan ekleme), açıklama görünür, iptal sürer', async () => {
        claims.add('Administrations.Create').add('Administrations.Correct');
        await setup({ locked: true });
        expect(has('administration-add')).toBe(true);
        expect(has('administrations-locked')).toBe(true);
        expect(text()).toContain('gerekçe yazılarak sonradan eklenebilir');
        expect(voidButton()).not.toBeNull();
    });

    it('kesinleşmiş muayenede Create izni yoksa ekleme gizli', async () => {
        await setup({ locked: true });
        expect(has('administration-add')).toBe(false);
    });

    it('sonradan eklenen satırda rozet ve gerekçe görünür; taslak satırda görünmez', async () => {
        service.getAdministrations.mockReturnValue(
            of(
                page([
                    { ...row, addedAfterFinalization: true, lateEntryReason: 'Unutulan serum' },
                    { ...row, id: 'a2' }
                ])
            )
        );
        await setup();
        expect(fixture.nativeElement.querySelectorAll('[data-testid="late-entry"]').length).toBe(1);
        expect(text()).toContain('Kesinleştirmeden sonra eklendi');
        expect(text()).toContain('Unutulan serum');
    });

    it('iptal edilmiş satırda stok sonucu görünür (iade / zarar)', async () => {
        service.getAdministrations.mockReturnValue(
            of(
                page([
                    { ...row, isVoided: true, voidReason: 'Döküldü', voidStockOutcome: 'WrittenOff' },
                    { ...row, id: 'a2', isVoided: true, voidReason: 'Yanlış', voidStockOutcome: 'StockReturned' }
                ])
            )
        );
        await setup();
        expect(text()).toContain('Zarar / imha olarak yazıldı');
        expect(text()).toContain('Stoğa iade edildi');
    });

    it('iptal bildirimi seçilen stok sonucuna göre değişir', async () => {
        await setup();
        fixture.componentInstance.onVoided('WrittenOff');
        fixture.detectChanges();
        expect(text()).toContain('stok geri artmadı');
        fixture.componentInstance.onVoided('StockReturned');
        fixture.detectChanges();
        expect(text()).toContain('stoğa geri verildi');
    });

    it('salt okunur kiracıda ekleme ve iptal gizlenir', async () => {
        claims.add('Administrations.Create').add('Administrations.Correct');
        mutationBlocked = true;
        await setup();
        expect(has('administration-add')).toBe(false);
        expect(voidButton()).toBeNull();
    });

    it('iptal edilmiş satırda İptal rozeti ve gerekçe görünür, İptal et düğmesi görünmez', async () => {
        claims.add('Administrations.Correct');
        service.getAdministrations.mockReturnValue(of(page([{ ...row, isVoided: true, voidReason: 'Yanlış ürün' }])));
        await setup();
        expect(text()).toContain('Yanlış ürün');
        expect(voidButton()).toBeNull();
    });

    it('düşük stok uyarısı bilgi olarak gösterilir', async () => {
        await setup();
        fixture.componentInstance.onSaved({
            created: true,
            administration: row,
            stock: { quantityOnHand: 4, availableQuantity: 1, minimumStockLevel: 5, isBelowMinimum: true }
        });
        fixture.detectChanges();
        expect(text()).toContain('minimum düzeyin altına indi');
        expect(text()).toContain('kalan kullanılabilir 1 ');
    });

    it('aynı requestId ile dönen kayıtta stok tekrar düşülmedi bilgisi verilir', async () => {
        await setup();
        fixture.componentInstance.onSaved({
            created: false,
            administration: row,
            stock: { quantityOnHand: 9, availableQuantity: 9, minimumStockLevel: 5, isBelowMinimum: false }
        });
        fixture.detectChanges();
        expect(text()).toContain('stok tekrar düşülmedi');
    });
});
