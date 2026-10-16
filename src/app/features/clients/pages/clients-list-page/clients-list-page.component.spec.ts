import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { isRightAfterDetail, rowDangerActions, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClientsListPageComponent } from './clients-list-page.component';

/** Ortak arama davranışı (ürün kararı): yazdıkça arar, Enter anında, × listeyi geri getirir, "Ara" düğmesi yok. */
describe('ClientsListPageComponent — ortak arama davranışı', () => {
    let fixture: ComponentFixture<ClientsListPageComponent>;
    let clients: jasmine.SpyObj<ClientsService>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input#clientSearch') as HTMLInputElement;
    const searches = () => clients.getClients.calls.allArgs().map((a) => a[0].search ?? '');

    const type = async (text: string) => {
        input().value = text;
        input().dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await wait(0);
    };

    beforeEach(async () => {
        sessionStorage.clear();
        clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClients']);
        clients.getClients.and.returnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
        await TestBed.configureTestingModule({
            imports: [ClientsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClientsService, useValue: clients },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClientsListPageComponent);
        fixture.detectChanges();
        await wait(0);
        fixture.detectChanges();
    });

    afterEach(() => sessionStorage.clear());

    it('"Ara" düğmesi yoktur, "Temizle" vardır', () => {
        const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim());

        expect(buttons).not.toContain('Ara');
        expect(buttons).toContain('Temizle');
    });

    it('2+ karakter yazınca bekleme sonrası sunucu aramasına gider; tek karakterde gitmez', async () => {
        const before = clients.getClients.calls.count();

        await type('a');
        await wait(500);
        expect(clients.getClients.calls.count()).toBe(before);
        await type('ali');
        await wait(500);
        expect(searches().pop()).toBe('ali');
        expect(clients.getClients.calls.count()).toBe(before + 1);
    });

    it('Enter anında arar', async () => {
        const before = clients.getClients.calls.count();

        await type('veli');
        input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(clients.getClients.calls.count()).toBe(before + 1);
        expect(searches().pop()).toBe('veli');
    });

    it('× aramayı temizler ve tam listeyi geri getirir', async () => {
        await type('ali');
        await wait(500);
        const clear = fixture.nativeElement.querySelector('button[aria-label="Aramayı temizle"]') as HTMLButtonElement;

        clear.click();
        fixture.detectChanges();
        await wait(0);
        expect(input().value).toBe('');
        expect(searches().pop()).toBe('');
    });
});

/** Sekmeli liste sayfası: ayrı sayfa başlığı yok; kart başlığı tek h1, birincil eylem arama ve Temizle'nin yanında. */
describe('ClientsListPageComponent — tek başlık', () => {
    function create(response: ReturnType<ClientsService['getClients']> = of({ items: [], page: 1, pageSize: 10, totalItems: 16, totalPages: 2 })): HTMLElement {
        sessionStorage.clear();
        const clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClients']);

        clients.getClients.and.returnValue(response);
        TestBed.configureTestingModule({
            imports: [ClientsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClientsService, useValue: clients },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(ClientsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    afterEach(() => sessionStorage.clear());

    it('sayfa başlığı ve kategori satırı yoktur; tek h1 kart başlığıdır ve kayıt sayısı yanında', () => {
        const el = create();

        expect(el.querySelector('app-page-header')).toBeNull();
        const headings = Array.from(el.querySelectorAll('h1, h2, h3, h4, h5'));

        expect(headings.map((h) => [h.tagName, h.textContent?.trim()])).toEqual([['H1', 'Müşteriler']]);
        expect(el.querySelector('app-list-header')!.textContent).toContain('16 kayıt');
    });

    it('"Yeni Müşteri" Temizle ile aynı eylem grubunda, aramanın sağındadır', () => {
        const el = create();
        const createLink = el.querySelector('a[href="/panel/clients/new"]')!;
        const clear = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Temizle')!;

        expect(createLink.parentElement).toBe(clear.closest('p-button')!.parentElement);
        expect(el.querySelector('input#clientSearch')!.compareDocumentPosition(createLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('ilk yükleme sürerken de başlık ve birincil eylem görünür', () => {
        const el = create(new Subject<never>());

        expect(el.querySelector('app-loading-state')).not.toBeNull();
        expect(el.querySelector('h1')?.textContent?.trim()).toBe('Müşteriler');
        expect(el.querySelector('a[href="/panel/clients/new"]')).not.toBeNull();
    });
});

/** Satır eylemi (ADR-026): "Detay" yazısı yerine göz simgesi; masaüstü tablo ve mobil kartta aynı ortak bileşen. */
describe('ClientsListPageComponent — satır eylemleri', () => {
    let fixture: ComponentFixture<ClientsListPageComponent>;

    beforeEach(async () => {
        sessionStorage.clear();
        const clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClients']);

        clients.getClients.and.returnValue(
            of({ items: [{ id: 'c1', fullName: 'Ali Veli', phone: '5551112233', email: 'ali@example.com', createdAtUtc: '2026-10-10T07:00:00Z' }], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })
        );
        await TestBed.configureTestingModule({
            imports: [ClientsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClientsService, useValue: clients },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClientsListPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    afterEach(() => sessionStorage.clear());

    it('"Detay" yazısı yoktur; satırda müşteri kartına giden göz simgesi bağlantısı vardır', () => {
        const el = fixture.nativeElement as HTMLElement;
        const details = Array.from(el.querySelectorAll<HTMLAnchorElement>('app-row-action-button a[aria-label="Detay"]'));

        expect(el.textContent).not.toContain('Detay');
        expect(details.length).withContext('tablo + mobil kart').toBe(2);

        for (const link of details) {
            expect(link.getAttribute('href')).toBe('/panel/clients/c1');
            expect(link.querySelector('i')!.classList).toContain('fa-eye');
            expect(link.textContent!.trim()).toBe('');
        }
    });
});

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('ClientsListPageComponent — satırda Düzenle', () => {
    const create = async (claims: string[], mutationBlocked = false): Promise<HTMLElement> => {
        sessionStorage.clear();
        const clients = jasmine.createSpyObj<ClientsService>('ClientsService', ['getClients']);

        clients.getClients.and.returnValue(
            of({ items: [{ id: 'c1', fullName: 'Ali Veli', phone: '5551112233', email: 'ali@example.com', createdAtUtc: '2026-10-10T07:00:00Z' }], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })
        );
        TestBed.configureTestingModule({
            imports: [ClientsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClientsService, useValue: clients },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(ClientsListPageComponent);

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => sessionStorage.clear());

    it("Clients.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", async () => {
        const edits = rowEditActions(await create([CLIENTS_UPDATE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/clients/c1/edit');
            expect(edit.getAttribute('aria-label')).toBe('Düzenle');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa Düzenle görünmez', async () => {
        expect(rowEditActions(await create([])).length).toBe(0);
    });

    it('salt okunur kiracıda Düzenle pasif düğmedir, bağlantı değildir', async () => {
        const edits = rowEditActions(await create([CLIENTS_UPDATE_CLAIM], true));

        expect(edits.length).toBe(2);

        for (const edit of edits) {
            expect(edit.tagName).toBe('BUTTON');
            expect(edit.getAttribute('aria-disabled')).toBe('true');
            expect(edit.getAttribute('aria-label')).toBe('Düzenle (salt okunur)');
        }
    });


    /** ADR-026 madde 7: müşterinin silme akışı yok (KVKK ayrı süreç); tüm yetkilerle bile Sil/İptal simgesi konmaz. */
    it('silme akışı olmadığı için satırda Sil/İptal simgesi yoktur', async () => {
        expect(rowDangerActions(await create([CLIENTS_UPDATE_CLAIM, 'Clients.Delete', 'Clients.Create'])).length).toBe(0);
    });
});
