import type { MockedObject } from 'vitest';
import { Component, forwardRef, input, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ChargeCreateResultVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { ChargeSuggestionsPageComponent } from './charge-suggestions-page.component';

@Component({
    selector: 'app-client-search',
    standalone: true,
    template: '',
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ClientSearchStubComponent), multi: true }]
})
class ClientSearchStubComponent implements ControlValueAccessor {
    readonly inputId = input('');
    readonly placeholder = input('');
    writeValue(): void {}
    registerOnChange(): void {}
    registerOnTouched(): void {}
}

const suggestion = (over: Partial<ChargeSuggestionVm> = {}): ChargeSuggestionVm => ({
    id: 's1',
    sourceType: 'Administration',
    sourceId: 'a1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    examinationId: 'e1',
    visitId: 'v1',
    description: 'Serum fizyolojik',
    quantity: 2,
    unit: 'Adet',
    suggestedUnitPrice: 125,
    currency: 'TRY',
    occurredAtUtc: '2026-10-14T07:00:00Z',
    ...over
});

const convertedResult = (): ChargeCreateResultVm => ({
    created: true,
    charge: {
        id: 'ch1',
        clientId: 'cl1',
        clientName: 'Ali Veli',
        petId: 'p1',
        petName: 'Pamuk',
        visitId: 'v1',
        examinationId: 'e1',
        description: 'Serum fizyolojik',
        quantity: 2,
        unitPrice: 125,
        amount: 250,
        allocatedAmount: 0,
        outstandingAmount: 250,
        currency: 'TRY',
        createdAtUtc: '2026-10-14T08:00:00Z',
        lineKind: 'Product',
        vatRate: null
    }
});

describe('ChargeSuggestionsPageComponent', () => {
    let service: MockedObject<ChargeSuggestionsService>;

    const open = async (claims: string[], items: ChargeSuggestionVm[], url = '/panel/charges/pending') => {
        service = {
            getPending: vi.fn().mockName('ChargeSuggestionsService.getPending'),
            convert: vi.fn().mockName('ChargeSuggestionsService.convert'),
            waive: vi.fn().mockName('ChargeSuggestionsService.waive')
        } as unknown as MockedObject<ChargeSuggestionsService>;
        service.getPending.mockReturnValue(of({ items, page: 1, pageSize: 200, totalItems: items.length, totalPages: 1 }));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: 'panel/charges/pending', component: ChargeSuggestionsPageComponent }]),
                { provide: ChargeSuggestionsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideComponent(ChargeSuggestionsPageComponent, {
            remove: { imports: [ClientSearchComponent] },
            add: { imports: [ClientSearchStubComponent] }
        });
        const harness = await RouterTestingHarness.create();
        const cmp = await harness.navigateByUrl(url, ChargeSuggestionsPageComponent);

        harness.detectChanges();

        return { harness, cmp };
    };

    const text = (h: RouterTestingHarness) => (h.routeNativeElement as HTMLElement).textContent ?? '';
    /** Düğme ve bağlantıların erişilebilir adı: görünür metin, yalnız simgeli düğmede aria-label. */
    const labels = (h: RouterTestingHarness) => Array.from((h.routeNativeElement as HTMLElement).querySelectorAll('button, a')).map((b) => b.textContent?.trim() || b.getAttribute('aria-label') || '');

    it('hekim (yalnız Charges.Read) kalemleri görür; Çevir ve Ücretsiz say düğmesi çıkmaz', async () => {
        const { harness } = await open(['Charges.Read'], [suggestion()]);

        expect(text(harness)).toContain('Serum fizyolojik');
        expect(text(harness)).toContain('Ali Veli');
        expect(text(harness)).toContain('yalnız görüntülenir');
        expect(labels(harness).some((l) => l.includes('Ücrete çevir'))).toBe(false);
        expect(labels(harness).some((l) => l.includes('Ücretsiz say'))).toBe(false);
        expect(text(harness)).not.toContain('İşlemler');
    });

    it('resepsiyon (Charges.Create) çevir ve ücretsiz say düğmelerini görür', async () => {
        const { harness } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        expect(labels(harness).some((l) => l.includes('Ücrete çevir'))).toBe(true);
        expect(labels(harness).some((l) => l.includes('Ücretsiz say'))).toBe(true);
    });

    it('Ücretsiz say yalnız simgeyle yer tutar; erişilebilir ad ve ipucu korunur', async () => {
        const { harness } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);
        const button = (harness.routeNativeElement as HTMLElement).querySelector('button[aria-label="Ücretsiz say"]') as HTMLButtonElement;

        expect(button.textContent!.trim()).toBe('');
        expect(button.closest('app-row-action-button')).not.toBeNull();
        expect(button.querySelector('i')!.classList).toContain('fa-ban');
    });

    it('uzun müşteri, hayvan ve kalem adı tek satırda kesilir; tam metin ipucunda kalır', async () => {
        const long = suggestion({ clientName: 'Ayşe Gülizar Karamanoğlu Yılmaz', petName: 'Prenses Minnoş Pamukçuk', description: 'Serum fizyolojik 500 ml damar yolu' });
        const { harness } = await open(['Charges.Read'], [long]);

        for (const value of [long.clientName, long.petName, long.description]) {
            const el = (harness.routeNativeElement as HTMLElement).querySelector(`[title="${value}"]`) as HTMLElement;

            expect(el, value).not.toBeNull();
            expect(el.classList).toContain('truncate');
        }
    });

    it('tek tık: gövde yalnız requestId taşır, kalem listeden düşer, ücret kaydı ve Ödeme al bağlantısı çıkar', async () => {
        const { harness, cmp } = await open(['Charges.Read', 'Charges.Create', 'Payments.Create'], [suggestion()]);

        service.convert.mockReturnValue(of(convertedResult()));
        service.getPending.mockClear();
        cmp.convertQuick(suggestion());
        harness.detectChanges();

        expect(service.convert).toHaveBeenCalledTimes(1);

        expect(service.convert).toHaveBeenCalledWith('s1', { requestId: expect.any(String) });
        expect(Object.keys(vi.mocked(service.convert).mock.lastCall![1])).toEqual(['requestId']);
        expect(cmp.rows()).toEqual([]);
        expect(text(harness)).toContain('Ücrete çevrildi');
        expect(text(harness)).toContain('250');
        const pay = Array.from((harness.routeNativeElement as HTMLElement).querySelectorAll('a')).find((a) => a.textContent?.includes('Ödeme al'));

        expect(pay?.getAttribute('href')).toContain('/panel/payments/new');
        expect(pay?.getAttribute('href')).toContain('clientId=cl1');
        expect(pay?.getAttribute('href')).toContain('chargeId=ch1');
        expect(pay?.getAttribute('href')).toContain('visitId=v1');
    });

    it('Ödeme al yalnız Payments.Create olanda görünür', async () => {
        const { harness, cmp } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        service.convert.mockReturnValue(of(convertedResult()));
        cmp.convertQuick(suggestion());
        harness.detectChanges();
        expect(labels(harness).some((l) => l.includes('Ödeme al'))).toBe(false);
        expect(labels(harness).some((l) => l.includes('Ücret kaydı'))).toBe(true);
    });

    it('hata sonrası yeniden denemede aynı requestId gider (çift ücret olmaz); başarıdan sonra yenisi üretilir', async () => {
        const { cmp } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        service.convert.mockReturnValueOnce(throwError(() => new Error('Bağlantı hatası'))).mockReturnValueOnce(of(convertedResult()));
        cmp.convertQuick(suggestion());
        expect(cmp.actionError()).toBe('Bağlantı hatası');
        cmp.convertQuick(suggestion());

        const [first, second] = vi.mocked(service.convert).mock.calls.map((a) => a[1].requestId);

        expect(first).toBe(second);
        expect(cmp.actionError()).toBeNull();
    });

    it('çevirme hatasında liste sunucudan yenilenir', async () => {
        const { cmp } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        service.convert.mockReturnValue(throwError(() => new Error('Bu kalem zaten ücrete çevrilmiş.')));
        service.getPending.mockClear();
        cmp.convertQuick(suggestion());
        expect(service.getPending).toHaveBeenCalledTimes(1);
        expect(cmp.actionError()).toContain('zaten ücrete çevrilmiş');
    });

    it('fiyatı olmayan kalemde tek tık yok; Fiyat gir ve çevir var', async () => {
        const { harness } = await open(['Charges.Read', 'Charges.Create'], [suggestion({ suggestedUnitPrice: null })]);

        expect(labels(harness).some((l) => l === 'Ücrete çevir')).toBe(false);
        expect(labels(harness).some((l) => l.includes('Fiyat gir ve çevir'))).toBe(true);
        expect(text(harness)).toContain('Fiyat yok');
    });

    it('düzenleyerek çevirme: yalnız değişen alanlar ve aynı deneme için aynı requestId', async () => {
        const { cmp } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        service.convert.mockReturnValue(of(convertedResult()));
        cmp.target.set(suggestion());
        cmp.convertEdited({ unitPrice: 130 }).subscribe();
        expect(service.convert).toHaveBeenCalledTimes(1);
        expect(service.convert).toHaveBeenCalledWith('s1', { unitPrice: 130, requestId: expect.any(String) });
    });

    it('ücretsiz say: gerekçe servise gider', async () => {
        const { cmp } = await open(['Charges.Read', 'Charges.Create'], [suggestion()]);

        service.waive.mockReturnValue(of(suggestion()));
        cmp.target.set(suggestion());
        cmp.waive('Müşteriye bedelsiz verildi').subscribe();
        expect(service.waive).toHaveBeenCalledTimes(1);
        expect(service.waive).toHaveBeenCalledWith('s1', 'Müşteriye bedelsiz verildi');
    });

    it('ziyaret bağlamı sorguya taşınır ve süzgeç çipi görünür', async () => {
        const { harness } = await open(['Charges.Read'], [suggestion()], '/panel/charges/pending?visitId=v1');

        expect(service.getPending).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1', pageSize: 200 }));
        expect(text(harness)).toContain('Seçili ziyaretin kalemleri');
    });

    it('kalem yoksa boş durum', async () => {
        const { harness } = await open(['Charges.Read'], []);

        expect(text(harness)).toContain('Ücret bekleyen kalem yok');
    });
});
