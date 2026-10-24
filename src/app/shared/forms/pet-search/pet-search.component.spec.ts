import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { PetSearchComponent } from './pet-search.component';

const pet = (id: string, name: string, clientId: string | null = 'c1', status = 'Active') => ({ id, name, clientId, speciesName: 'Kedi', status });
const paged = (items: unknown[]) => of({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, PetSearchComponent],
    template: `<app-pet-search [formControl]="control" [clientId]="clientId()" [activeOnly]="activeOnly()" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
    clientId = signal('c1');
    activeOnly = signal(false);
}

describe('PetSearchComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let cmp: PetSearchComponent;
    let pets: jasmine.SpyObj<PetsService>;
    let claims: Set<string>;

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    beforeEach(async () => {
        claims = new Set(['Pets.Create']);
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets', 'getPetById']);
        pets.getPets.and.returnValue(paged([pet('p1', 'Pamuk'), pet('p2', 'Boncuk'), pet('px', 'Başkası', 'c2')]) as never);
        pets.getPetById.and.returnValue(of({ id: 'p1', name: 'Pamuk', speciesName: 'Kedi' }) as never);
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                { provide: PetsService, useValue: pets },
                { provide: SpeciesService, useValue: {} },
                { provide: BreedsService, useValue: {} },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
        cmp = fixture.debugElement.children[0].componentInstance as PetSearchComponent;
    });

    it('sahibin hayvanlarını sunucudan yükler; başka sahibin hayvanını süzer', async () => {
        cmp.onComplete({ query: '', originalEvent: new Event('x') });
        await wait(0);
        expect(pets.getPets).toHaveBeenCalledWith(jasmine.objectContaining({ clientId: 'c1', search: undefined }));
        expect(cmp.suggestions().map((s) => s.id)).toEqual(['p1', 'p2']);
        expect(cmp.suggestions()[0].label).toBe('Pamuk — Kedi');
    });

    it('varsayılan: durum süzgeci gönderilmez, vefat eden hayvan etiketle ayrışır', async () => {
        pets.getPets.and.returnValue(paged([pet('p1', 'Pamuk', 'c1', 'Deceased')]) as never);
        cmp.onComplete({ query: '', originalEvent: new Event('x') });
        await wait(0);
        expect(pets.getPets).toHaveBeenCalledWith(jasmine.objectContaining({ status: undefined }));
        expect(cmp.suggestions()[0].label).toBe('Pamuk — Kedi (vefat)');
    });

    it('activeOnly (yeni randevu/muayene): yalnız aktif hayvanlar istenir', async () => {
        host.activeOnly.set(true);
        fixture.detectChanges();
        cmp.onComplete({ query: '', originalEvent: new Event('x') });
        await wait(0);
        expect(pets.getPets).toHaveBeenCalledWith(jasmine.objectContaining({ clientId: 'c1', status: 'Active' }));
    });

    it('yazılan metin sunucu aramasına search olarak gider', async () => {
        cmp.onComplete({ query: ' bon ', originalEvent: new Event('x') });
        await wait(0);
        expect(pets.getPets).toHaveBeenCalledWith(jasmine.objectContaining({ clientId: 'c1', search: 'bon' }));
    });

    it('gerçek input: yazılan metin silinmez ve debounce sonrası arama yapılır', async () => {
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

        input.focus();
        input.value = 'b';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(500);
        fixture.detectChanges();
        expect(input.value).toBe('b');
        expect(pets.getPets).toHaveBeenCalled();
    });

    it('seçim forma hayvan kimliği yazar; yazı değişirse veya temizlenirse boşalır', () => {
        cmp.onModelChange({ id: 'p1', label: 'Pamuk — Kedi' });
        expect(host.control.value).toBe('p1');
        cmp.onModelChange('pam');
        expect(host.control.value).toBe('');
    });

    it('formdan gelen kimlik için etiket çözülür; boş değer temizler', () => {
        host.control.setValue('p1');
        expect(pets.getPetById).toHaveBeenCalledOnceWith('p1');
        expect(cmp.model()).toEqual({ id: 'p1', label: 'Pamuk — Kedi' });
        host.control.setValue('');
        expect(cmp.model()).toBeNull();
    });

    it('müşteri değişince eski önerileri atar', async () => {
        cmp.onComplete({ query: '', originalEvent: new Event('x') });
        await wait(0);
        expect(cmp.suggestions().length).toBe(2);
        host.clientId.set('c2');
        fixture.detectChanges();
        await wait(0);
        expect(cmp.suggestions()).toEqual([]);
    });

    it('müşteri yokken alan kapalı, yeni hayvan eylemi yok', () => {
        host.clientId.set('');
        fixture.detectChanges();
        expect(cmp.canCreate()).toBeFalse();
        expect((fixture.nativeElement.querySelector('input') as HTMLInputElement).disabled).toBeTrue();
    });

    it('"yeni hayvan" yalnız Pets.Create varken görünür', () => {
        expect(cmp.canCreate()).toBeTrue();
        claims.clear();
        expect(cmp.canCreate()).toBeFalse();
    });

    it('hızlı kayıtla eklenen hayvan seçilir', () => {
        cmp.onPetCreated('p1');
        expect(host.control.value).toBe('p1');
    });

    it('arama hatasında Türkçe mesaj ve boş liste', async () => {
        pets.getPets.and.returnValue(throwError(() => new Error('Hasta listesi yüklenemedi.')));
        cmp.onComplete({ query: 'x', originalEvent: new Event('x') });
        await wait(0);
        expect(cmp.suggestions()).toEqual([]);
        expect(cmp.searchError()).toBe('Hasta listesi yüklenemedi.');
    });
});
