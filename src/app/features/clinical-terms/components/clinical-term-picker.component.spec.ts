import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClinicalTermDto } from '@/app/features/clinical-terms/models/clinical-term.model';
import { ClinicalTermError, ClinicalTermsService } from '@/app/features/clinical-terms/services/clinical-terms.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClinicalTermPickerComponent } from './clinical-term-picker.component';

const term = (name: string, over: Partial<ClinicalTermDto> = {}): ClinicalTermDto => ({
    id: name,
    kind: 'Complaint',
    name,
    isActive: true,
    isSystem: true,
    rowVersion: 'AA==',
    ...over
});
const paged = (items: ClinicalTermDto[]) => of({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

@Component({
    standalone: true,
    imports: [ClinicalTermPickerComponent],
    template: `<app-clinical-term-picker kind="Complaint" inputId="t" [control]="control" />`
})
class HostComponent {
    control = new FormControl<string>('Kusma', { nonNullable: true });
}

describe('ClinicalTermPickerComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let terms: jasmine.SpyObj<ClinicalTermsService>;
    let claims: Set<string>;
    let blocked: boolean;

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const picker = () => fixture.debugElement.children[0].componentInstance as ClinicalTermPickerComponent;
    const root = () => fixture.nativeElement as HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                { provide: ClinicalTermsService, useValue: terms },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['ClinicalTerms.Read', 'ClinicalTerms.Create']);
        blocked = false;
        terms = jasmine.createSpyObj<ClinicalTermsService>('ClinicalTermsService', ['list', 'create']);
        terms.list.and.returnValue(paged([term('İshal'), term('Kanlı ishal')]));
    });

    it('okuma izni yoksa hiçbir şey çizilmez (alan eskisi gibi düz metin)', async () => {
        claims = new Set();
        await create();
        expect(root().querySelector('[data-testid="clinical-term-picker"]')).toBeNull();
    });

    it('alan kilitliyse (kesinleşmiş muayene) seçici gizlenir', async () => {
        await create();
        expect(root().querySelector('[data-testid="clinical-term-picker"]')).not.toBeNull();
        host.control.disable();
        fixture.detectChanges();
        expect(root().querySelector('[data-testid="clinical-term-picker"]')).toBeNull();
    });

    it('arama aktif terimleri türe göre sunucudan ister', async () => {
        await create();
        picker().onComplete({ query: 'ishal', originalEvent: new Event('x') });
        await wait(0);
        expect(terms.list).toHaveBeenCalledWith(jasmine.objectContaining({ kind: 'Complaint', search: 'ishal', page: 1 }));
        expect(terms.list.calls.mostRecent().args[0].includeInactive).toBeUndefined();
        expect(picker().suggestions().map((t) => t.name)).toEqual(['İshal', 'Kanlı ishal']);
    });

    it('gerçek input: yazınca debounce sonrası tek arama yapılır', async () => {
        await create();
        const input = root().querySelector('input') as HTMLInputElement;
        input.focus();
        for (const v of ['i', 'is', 'ish']) {
            input.value = v;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        await wait(500);
        expect(terms.list).toHaveBeenCalledTimes(1);
        expect(terms.list.calls.mostRecent().args[0].search).toBe('ish');
    });

    it('seçilen terimin adı serbest metne eklenir, arama kutusu boşalır', async () => {
        await create();
        picker().onSelect({ value: term('İshal'), originalEvent: new Event('x') });
        expect(host.control.value).toBe('Kusma, İshal');
        expect(host.control.dirty).toBeTrue();
        expect(picker().query()).toBeNull();
    });

    it('bulunamayan terim "Sözlüğe ekle" ile eklenir ve alana yazılır', async () => {
        terms.create.and.returnValue(of(term('Kulak akıntısı', { isSystem: false })));
        await create();
        picker().onComplete({ query: ' kulak akıntısı ', originalEvent: new Event('x') });
        expect(picker().canAdd()).toBeTrue();
        picker().addLastQuery();
        expect(terms.create).toHaveBeenCalledWith('Complaint', ' kulak akıntısı ');
        expect(host.control.value).toBe('Kusma, Kulak akıntısı');
    });

    it('ekleme hatası gösterilir, alan değişmez', async () => {
        terms.create.and.returnValue(throwError(() => new ClinicalTermError('Bu ad sözlükte zaten var.', false)));
        await create();
        picker().onComplete({ query: 'İshal', originalEvent: new Event('x') });
        picker().addLastQuery();
        fixture.detectChanges();
        expect(host.control.value).toBe('Kusma');
        expect(picker().addError()).toBe('Bu ad sözlükte zaten var.');
    });

    it('ekleme izni yoksa veya kiracı salt okunursa "Sözlüğe ekle" sunulmaz', async () => {
        claims = new Set(['ClinicalTerms.Read']);
        await create();
        picker().onComplete({ query: 'yeni', originalEvent: new Event('x') });
        expect(picker().canAdd()).toBeFalse();
    });

    it('salt okunur kiracıda ekleme kapalıdır', async () => {
        blocked = true;
        await create();
        picker().onComplete({ query: 'yeni', originalEvent: new Event('x') });
        expect(picker().canAdd()).toBeFalse();
        picker().addLastQuery();
        expect(terms.create).not.toHaveBeenCalled();
    });
});
