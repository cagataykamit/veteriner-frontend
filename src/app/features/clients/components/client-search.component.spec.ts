import type { MockedObject } from 'vitest';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import type { ClientSearchResultVm } from '@/app/features/clients/services/client-search.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from './client-search.component';

const ali: ClientSearchResultVm = { id: 'c1', fullName: 'Ali Veli', phone: '+90 532 123 45 67', petNames: ['Pamuk'], label: 'Ali Veli — +90 532 123 45 67' };

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, ClientSearchComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<app-client-search [formControl]="control" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
}

describe('ClientSearchComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let cmp: ClientSearchComponent;
    let search: MockedObject<ClientSearchService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    beforeEach(async () => {
        claims = new Set(['Clients.Create']);
        mutationBlocked = false;
        search = {
            search: vi.fn().mockName('ClientSearchService.search'),
            getById: vi.fn().mockName('ClientSearchService.getById')
        } as unknown as MockedObject<ClientSearchService>;
        search.search.mockReturnValue(of([ali]));
        search.getById.mockReturnValue(of(ali));
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                { provide: ClientSearchService, useValue: search },
                { provide: ClientsService, useValue: {} }, // hızlı kayıt diyaloğunun bağımlılığı; bu testlerde çağrılmaz
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
        cmp = fixture.debugElement.children[0].componentInstance as ClientSearchComponent;
    });
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const typeInto = (text: string) => {
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

        input.focus();
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        return input;
    };

    it('gerçek input: tek karakter (min. uzunluğun altı) yazılınca metin silinmez, arama tetiklenmez', async () => {
        const input = typeInto('m');

        await wait(1000);
        fixture.detectChanges();
        expect(input.value).toBe('m');
        expect(search.search).not.toHaveBeenCalled();
    });

    it('gerçek input: aralıklı yazılan metin korunur ve debounce sonrası tek sunucu araması yapılır', async () => {
        typeInto('m');
        await wait(500);
        const input = typeInto('ma');

        await wait(100);
        typeInto('mak');
        await wait(500);
        fixture.detectChanges();
        expect(input.value).toBe('mak');
        expect(search.search).toHaveBeenCalledTimes(1);
        expect(search.search).toHaveBeenCalledWith('mak');
        expect(cmp.suggestions()).toEqual([ali]);
        expect(host.control.value).toBe('');
    });

    it('arama sunucuya gider ve sonuçlar listelenir', () => {
        cmp.onComplete({ query: 'ali', originalEvent: new Event('x') });
        expect(search.search).toHaveBeenCalledTimes(1);
        expect(search.search).toHaveBeenCalledWith('ali');
        expect(cmp.suggestions()).toEqual([ali]);
    });

    it('arama hatası boş liste ve Türkçe mesaj olur', () => {
        search.search.mockReturnValue(throwError(() => new Error('Müşteri listesi yüklenemedi.')));
        cmp.onComplete({ query: 'ali', originalEvent: new Event('x') });
        expect(cmp.suggestions()).toEqual([]);
        expect(cmp.searchError()).toBe('Müşteri listesi yüklenemedi.');
        cmp.onComplete({ query: 'ali', originalEvent: new Event('x') });
        search.search.mockReturnValue(of([]));
        cmp.onComplete({ query: 'veli', originalEvent: new Event('x') });
        expect(cmp.searchError()).toBeNull();
    });

    it('sonuç seçilince forma müşteri kimliği yazılır', () => {
        cmp.onModelChange(ali);
        expect(host.control.value).toBe('c1');
    });

    it('seçimden sonra yazı değişir veya temizlenirse kimlik boşalır', () => {
        cmp.onModelChange(ali);
        cmp.onModelChange('ali ve');
        expect(host.control.value).toBe('');
        cmp.onModelChange(ali);
        cmp.onModelChange(null);
        expect(host.control.value).toBe('');
    });

    it('formdan gelen kimlik için etiket sunucudan çözülür; boş değer seçimi temizler', () => {
        host.control.setValue('c1');
        expect(search.getById).toHaveBeenCalledTimes(1);
        expect(search.getById).toHaveBeenCalledWith('c1');
        expect(cmp.model()).toEqual(ali);
        host.control.setValue('');
        expect(cmp.model()).toBeNull();
    });

    it('"Yeni müşteri ekle" yalnız Clients.Create varken ve salt okunur değilken görünür', () => {
        expect(cmp.canCreate()).toBe(true);
        claims.clear();
        expect(cmp.canCreate()).toBe(false);
        claims.add('Clients.Create');
        mutationBlocked = true;
        expect(cmp.canCreate()).toBe(false);
    });

    it('hızlı kayıtla oluşan müşteri otomatik seçilir', () => {
        cmp.onClientCreated('c1');
        expect(host.control.value).toBe('c1');
        expect(cmp.model()).toEqual(ali);
    });

    it('devre dışı bırakılabilir', () => {
        host.control.disable();
        expect(cmp.disabled()).toBe(true);
    });
});
