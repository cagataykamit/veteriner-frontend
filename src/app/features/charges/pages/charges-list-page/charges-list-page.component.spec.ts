import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargesPagedVm, ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
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
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
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
        charges = jasmine.createSpyObj<ChargesService>('ChargesService', ['getCharges']);
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

    it('yükleme hatasını gösterir', async () => {
        charges.getCharges.and.returnValue(throwError(() => new Error('Ücret listesi yüklenemedi.')));
        await setup();
        expect(fixture.nativeElement.textContent).toContain('Ücret listesi yüklenemedi.');
    });
});
