import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
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
