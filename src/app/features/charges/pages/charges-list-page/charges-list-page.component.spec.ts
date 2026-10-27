import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargesPagedVm, ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ClientSearchService } from '@/app/entities/client/services/client-search.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
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
    createdAtUtc: '2026-10-10T07:00:00Z',
    lineKind: 'Service',
    vatRate: null
};

const page = (items: ChargeVm[]): ChargesPagedVm => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

describe('ChargesListPageComponent', () => {
    let fixture: ComponentFixture<ChargesListPageComponent>;
    let charges: MockedObject<ChargesService>;
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
        charges = {
            getCharges: vi.fn().mockName('ChargesService.getCharges'),
            voidCharge: vi.fn().mockName('ChargesService.voidCharge')
        } as unknown as MockedObject<ChargesService>;
        charges.getCharges.mockReturnValue(of(page([row])));
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
        charges.getCharges.mockReturnValue(of(page([{ ...row, allocatedAmount: 751, outstandingAmount: 0 }])));
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
        expect(vi.mocked(charges.getCharges).mock.calls[0][0]).toEqual(expect.objectContaining({ page: 1, clientId: 'cl1' }));
    });

    it('boş liste ve hata durumları gösterilir', async () => {
        charges.getCharges.mockReturnValue(of(page([])));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ücret kaydı yok');
    });

    const actionButton = (label: string) => fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement | null;

    it('Charges.Correct yoksa Düzelt/İptal et eylemleri görünmez', async () => {
        await setup();
        expect(actionButton('Düzelt')).toBeNull();
        expect(actionButton('İptal et')).toBeNull();
    });

    it('Charges.Correct varsa Düzelt ve İptal et ortak satır eylemi simgesi olarak görünür (ADR-026)', async () => {
        claims.add('Charges.Correct');
        await setup();

        for (const [label, icon, danger] of [
            ['Düzelt', 'fa-pen-to-square', false],
            ['İptal et', 'fa-ban', true]
        ] as const) {
            const button = actionButton(label);

            expect(button, label).not.toBeNull();
            expect(button!.textContent!.trim()).toBe('');
            expect(button!.closest('app-row-action-button'), label).not.toBeNull();
            expect(button!.querySelector('i')!.classList).toContain('fa-solid');
            expect(button!.querySelector('i')!.classList).toContain(icon);
            expect(button!.classList.contains('row-action-button--danger'), label).toBe(danger);
        }
    });

    it('"Ödeme al" metinli birincil düğme olarak kalır, simge düğmesine dönmez', async () => {
        claims.add('Payments.Create');
        await setup();
        const pay = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).find((a) => a.textContent?.includes('Ödeme al'));

        expect(pay, 'Ödeme al').toBeDefined();
        expect(pay!.closest('app-row-action-button')).toBeNull();
    });

    it('Düzelt ve İptal et ilgili diyaloğu satırla açar', async () => {
        claims.add('Charges.Correct');
        await setup();
        const cmp = fixture.componentInstance;

        actionButton('Düzelt')!.click();
        expect(cmp.correctionVisible).toBe(true);
        expect(cmp.actionTarget()).toEqual(row);
        actionButton('İptal et')!.click();
        expect(cmp.voidVisible).toBe(true);
    });

    it('salt okunur kiracıda eylemler yerine bilgi gösterilir', async () => {
        claims.add('Charges.Correct');
        mutationBlocked = true;
        await setup();
        expect(actionButton('Düzelt')).toBeNull();
        expect(actionButton('İptal et')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Salt okunur');
    });

    it('uzun müşteri, hayvan ve açıklama tek satırda kesilir; tam metin ipucunda kalır', async () => {
        const long = { ...row, clientName: 'Ayşe Gülizar Karamanoğlu Yılmaz', petName: 'Prenses Minnoş Pamukçuk', description: 'Kapsamlı genel muayene ve kan tahlili' };

        charges.getCharges.mockReturnValue(of(page([long])));
        await setup();

        for (const text of [long.clientName, long.petName, long.description]) {
            const el = fixture.nativeElement.querySelector(`[title="${text}"]`) as HTMLElement;

            expect(el, text).not.toBeNull();
            expect(el.classList).toContain('truncate');
            expect(el.textContent!.trim()).toBe(text);
        }
    });

    it('müşteri süzgeci kısa yer tutucuyla ortak süzgeç alanında gösterilir', async () => {
        await setup();
        const input = fixture.nativeElement.querySelector('#chargeClientFilter') as HTMLInputElement;

        expect(input.getAttribute('placeholder')).toBe('Müşteri ara…');
        expect(input.closest('app-filter-field')).not.toBeNull();
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
        charges.getCharges.mockReturnValue(of(page([{ ...row, allocatedAmount: 751, outstandingAmount: 0 }])));
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Ödeme al');
        TestBed.resetTestingModule();
        charges.getCharges.mockReturnValue(of(page([row])));
        mutationBlocked = true;
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('Ödeme al');
    });

    it('iptal diyaloğu satırın ücretini iptal eder ve listeyi yeniden okur', async () => {
        claims.add('Charges.Correct');
        charges.voidCharge.mockReturnValue(of(void 0));
        await setup();
        const cmp = fixture.componentInstance;

        cmp.openVoid(row);
        await firstValueFrom(cmp.voidCharge('Yanlış girildi'));
        expect(charges.voidCharge).toHaveBeenCalledTimes(1);
        expect(charges.voidCharge).toHaveBeenCalledWith('ch1', 'Yanlış girildi');
        const before = vi.mocked(charges.getCharges).mock.calls.length;

        cmp.reload();
        expect(vi.mocked(charges.getCharges).mock.calls.length).toBe(before + 1);
    });

    it('son sayfadaki son kayıt kalkınca boş sayfa yerine önceki sayfa yüklenir', async () => {
        await setup();
        charges.getCharges.mockClear();
        charges.getCharges.mockReturnValueOnce(of({ items: [], page: 2, pageSize: 20, totalItems: 20, totalPages: 1 })).mockReturnValueOnce(of(page([row])));
        fixture.componentInstance.onLazyLoad({ first: 20, rows: 20 });
        expect(vi.mocked(charges.getCharges).mock.calls.map((a) => a[0]?.page)).toEqual([2, 1]);
        expect(fixture.componentInstance.rows()).toEqual([row]);
    });

    it('yükleme hatasını gösterir', async () => {
        charges.getCharges.mockReturnValue(throwError(() => new Error('Ücret listesi yüklenemedi.')));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ücret listesi yüklenemedi.');
    });
});
