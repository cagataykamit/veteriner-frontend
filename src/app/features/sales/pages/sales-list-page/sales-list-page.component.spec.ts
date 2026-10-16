import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapPagedSalesToVm } from '@/app/features/sales/data/sale.mapper';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { isLastRowAction, rowDangerActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { SalesListPageComponent } from './sales-list-page.component';

const paged = (over: { voided?: boolean } = {}) =>
    mapPagedSalesToVm({
        items: [
            {
                id: 's1',
                clinicId: 'c1',
                clientId: 'w1',
                clientName: 'Peşin müşteri',
                isWalkIn: true,
                status: over.voided ? 'Voided' : 'Active',
                soldAtUtc: '2026-10-14T08:00:00Z',
                totalAmount: 91,
                paidAmount: 91,
                outstandingAmount: 0,
                lines: [{ id: 'sl1', productId: 'p1', productName: 'Mama', quantity: 2, unitPrice: 45.5, lineAmount: 91 }]
            }
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1
    });

describe('SalesListPageComponent', () => {
    let fixture: ComponentFixture<SalesListPageComponent>;
    let getSales: jasmine.Spy;
    let voidSale: jasmine.Spy;
    let claims: Set<string>;

    const el = () => fixture.nativeElement as HTMLElement;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [SalesListPageComponent],
            providers: [
                provideRouter([]),
                { provide: SalesService, useValue: { getSales, voidSale } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(SalesListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['Sales.Read', 'Sales.Create']);
        getSales = jasmine.createSpy('getSales').and.returnValue(of(paged()));
        voidSale = jasmine.createSpy('voidSale').and.returnValue(of({}));
    });

    it('satırı müşteri, ürün özeti ve toplamla listeler; iptaller varsayılan olarak istenmez', async () => {
        await setup();
        const row = el().querySelector('tbody tr')!.textContent!;

        expect(row).toContain('Peşin müşteri');
        expect(row).toContain('Mama');
        expect(row).toContain('Geçerli');
        expect(getSales.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ includeVoided: false, page: 1 }));
    });

    it('"İptal edilenleri göster" işaretlenince includeVoided ile yeniden yükler', async () => {
        await setup();
        fixture.componentInstance.includeVoided = true;
        fixture.componentInstance.applyFilters();
        expect(getSales.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ includeVoided: true, page: 1 }));
    });

    it('Hızlı satış düğmesi yalnız Sales.Create ile görünür', async () => {
        await setup();
        expect(el().textContent).toContain('Hızlı satış');
        TestBed.resetTestingModule();
        claims = new Set(['Sales.Read']);
        await setup();
        expect(el().textContent).not.toContain('Hızlı satış');
    });

    /** ADR-026 madde 7: detaydaki "İptal et" ile aynı yetki, koşul ve diyalog. */
    it('İptal simgesi Sales.Correct ile geçerli satışta Detay’dan sonra görünür; iptal edilmişte ve yetkisizken yoktur', async () => {
        claims = new Set(['Sales.Read', 'Sales.Correct']);
        await setup();
        const voids = rowDangerActions(el());

        expect(voids.length).toBe(1);
        expect(voids[0].getAttribute('aria-label')).toBe('İptal et');
        expect(isLastRowAction(voids[0])).toBeTrue();
        expect(voids[0].closest('app-row-action-button')?.previousElementSibling?.querySelector('.fa-eye')).not.toBeNull();

        TestBed.resetTestingModule();
        getSales = jasmine.createSpy('getSales').and.returnValue(of(paged({ voided: true })));
        await setup();
        expect(rowDangerActions(el()).length).toBe(0);

        TestBed.resetTestingModule();
        claims = new Set(['Sales.Read']);
        getSales = jasmine.createSpy('getSales').and.returnValue(of(paged()));
        await setup();
        expect(rowDangerActions(el()).length).toBe(0);
    });

    it('İptal tıklanınca satış iptal diyaloğu açılır, onaylanmadan servis çağrılmaz; onayda voidSale çağrılır ve liste yenilenir', async () => {
        claims = new Set(['Sales.Read', 'Sales.Correct']);
        await setup();
        rowDangerActions(el())[0].click();
        fixture.detectChanges();

        const voidDialog = fixture.debugElement.query((d) => d.name === 'app-sale-void-dialog');

        expect(voidDialog).not.toBeNull();
        const dialog = fixture.debugElement.query((d) => d.name === 'app-reason-confirm-dialog').componentInstance as ReasonConfirmDialogComponent;

        expect(dialog.visible()).toBeTrue();
        expect(dialog.summary()).toBe('Peşin müşteri · ' + paged().items[0].totalText);
        expect(voidSale).not.toHaveBeenCalled();

        getSales.calls.reset();
        dialog.form.controls.reason.setValue('Yanlış ürün okutuldu');
        dialog.onSubmit();

        expect(voidSale).toHaveBeenCalledOnceWith('s1', { reason: 'Yanlış ürün okutuldu', stockOutcome: 'StockReturned' });
        expect(getSales).toHaveBeenCalledTimes(1);
    });

    it('boş sonuçta boş durum, hatada hata durumu gösterilir', async () => {
        getSales.and.returnValue(of({ ...paged(), items: [], totalItems: 0 }));
        await setup();
        expect(el().textContent).toContain('Satış bulunamadı.');
        TestBed.resetTestingModule();
        getSales = jasmine.createSpy().and.returnValue(throwError(() => new Error('Satış listesi yüklenemedi.')));
        await setup();
        expect(el().textContent).toContain('Satış listesi yüklenemedi.');
    });
});
