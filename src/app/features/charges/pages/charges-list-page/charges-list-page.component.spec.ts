import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargesPagedVm, ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ChargesListPageComponent } from './charges-list-page.component';

const row: ChargeVm = {
    id: 'ch1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    visitId: null,
    examinationId: null,
    description: 'Genel muayene',
    quantity: 2,
    unitPrice: 375.5,
    amount: 751,
    allocatedAmount: 200,
    outstandingAmount: 551,
    currency: 'TRY',
    createdAtUtc: '2026-10-10T07:00:00Z'
};

const page = (items: ChargeVm[]): ChargesPagedVm => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

describe('ChargesListPageComponent', () => {
    let fixture: ComponentFixture<ChargesListPageComponent>;
    let charges: jasmine.SpyObj<ChargesService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;
    let queryClientId: string | null;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [ChargesListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ChargesService, useValue: charges },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'cl1', fullName: 'Ali Veli', phone: '—', petNames: [], label: 'Ali Veli' }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => (k === 'clientId' ? queryClientId : null) } } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ChargesListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    beforeEach(() => {
        charges = jasmine.createSpyObj<ChargesService>('ChargesService', ['getCharges', 'voidCharge']);
        charges.getCharges.and.returnValue(of(page([row])));
        claims = new Set(['Charges.Read']);
        mutationBlocked = false;
        queryClientId = null;
    });

    it('satırı TRY biçimiyle gösterir (birim fiyat ve tutar)', async () => {
        await setup();
        const text = fixture.nativeElement.textContent as string;
        expect(text).toContain('Genel muayene');
        expect(text).toContain('Ali Veli');
        expect(text).toContain('375,50');
        expect(text).toContain('751,00');
    });

    it('Ödenen ve Kalan sütunları: kısmi ödemede kalan tutar gösterilir', async () => {
        await setup();
        const text = fixture.nativeElement.textContent as string;
        expect(text).toContain('Ödenen');
        expect(text).toContain('Kalan');
        expect(text).toContain('₺200,00');
        expect(text).toContain('₺551,00');
        expect(text).not.toContain('Ödendi');
    });

    it('kalan 0 ise sade "Ödendi" gösterilir', async () => {
        charges.getCharges.and.returnValue(of(page([{ ...row, allocatedAmount: 751, outstandingAmount: 0 }])));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ödendi');
    });

    it('Charges.Create yoksa (Veteriner) "Yeni Ücret" düğmesi görünmez', async () => {
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Yeni Ücret');
    });

    it('Charges.Create varsa "Yeni Ücret" bağlantısı görünür', async () => {
        claims.add('Charges.Create');
        await setup();
        const link = fixture.nativeElement.querySelector('a[href="/panel/charges/new"]');
        expect(link).not.toBeNull();
    });

    it('salt okunur kiracıda ekleme düğmesi kilitli gösterilir', async () => {
        claims.add('Charges.Create');
        mutationBlocked = true;
        await setup();
        expect(fixture.nativeElement.querySelector('a[href="/panel/charges/new"]')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('salt okunur');
    });

    it('query clientId ile müşteri filtresi uygulanır', async () => {
        queryClientId = 'cl1';
        await setup();
        expect(charges.getCharges.calls.first().args[0]).toEqual(jasmine.objectContaining({ page: 1, clientId: 'cl1' }));
    });

    it('boş liste ve hata durumları gösterilir', async () => {
        charges.getCharges.and.returnValue(of(page([])));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ücret kaydı yok');
    });

    it('Charges.Correct yoksa Düzelt/İptal et eylemleri görünmez', async () => {
        await setup();
        const text = fixture.nativeElement.textContent as string;
        expect(text).not.toContain('Düzelt');
        expect(text).not.toContain('İptal et');
    });

    it('Charges.Correct varsa Düzelt ve İptal et görünür; salt okunur kiracıda gizlenir', async () => {
        claims.add('Charges.Correct');
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Düzelt');
        expect(fixture.nativeElement.textContent).toContain('İptal et');
    });

    it('salt okunur kiracıda eylemler yerine bilgi gösterilir', async () => {
        claims.add('Charges.Correct');
        mutationBlocked = true;
        await setup();
        const text = fixture.nativeElement.textContent as string;
        expect(text).not.toContain('Düzelt');
        expect(text).toContain('Salt okunur');
    });

    it('Payments.Create varsa açık bakiyeli satırda "Ödeme al" müşteri ve ücret bağlamıyla ödeme formuna gider', async () => {
        claims.add('Payments.Create');
        await setup();
        const link = fixture.nativeElement.querySelector('a[href^="/panel/payments/new"]') as HTMLAnchorElement;
        expect(link.textContent).toContain('Ödeme al');
        expect(link.getAttribute('href')).toContain('clientId=cl1');
        expect(link.getAttribute('href')).toContain('chargeId=ch1');
    });

    it('"Ödeme al" kalan 0 olan, yetkisiz veya salt okunur durumda görünmez', async () => {
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Ödeme al');
        TestBed.resetTestingModule();
        claims.add('Payments.Create');
        charges.getCharges.and.returnValue(of(page([{ ...row, allocatedAmount: 751, outstandingAmount: 0 }])));
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Ödeme al');
        TestBed.resetTestingModule();
        charges.getCharges.and.returnValue(of(page([row])));
        mutationBlocked = true;
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Ödeme al');
    });

    it('iptal diyaloğu satırın ücretini iptal eder ve listeyi yeniden okur', async () => {
        claims.add('Charges.Correct');
        charges.voidCharge.and.returnValue(of(void 0));
        await setup();
        const cmp = fixture.componentInstance;
        cmp.openVoid(row);
        await firstValueFrom(cmp.voidCharge('Yanlış girildi'));
        expect(charges.voidCharge).toHaveBeenCalledOnceWith('ch1', 'Yanlış girildi');
        const before = charges.getCharges.calls.count();
        cmp.reload();
        expect(charges.getCharges.calls.count()).toBe(before + 1);
    });

    it('son sayfadaki son kayıt kalkınca boş sayfa yerine önceki sayfa yüklenir', async () => {
        await setup();
        charges.getCharges.calls.reset();
        charges.getCharges.and.returnValues(of({ items: [], page: 2, pageSize: 20, totalItems: 20, totalPages: 1 }), of(page([row])));
        fixture.componentInstance.onLazyLoad({ first: 20, rows: 20 });
        expect(charges.getCharges.calls.allArgs().map((a) => a[0]?.page)).toEqual([2, 1]);
        expect(fixture.componentInstance.rows()).toEqual([row]);
    });

    it('yükleme hatasını gösterir', async () => {
        charges.getCharges.and.returnValue(throwError(() => new Error('Ücret listesi yüklenemedi.')));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ücret listesi yüklenemedi.');
    });
});
