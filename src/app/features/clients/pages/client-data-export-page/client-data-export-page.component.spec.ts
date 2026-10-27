import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { ClientDataExportDto } from '@/app/entities/client/models/client-data-export-api.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ClientDataExportPageComponent } from './client-data-export-page.component';

const empty = { items: [], isTruncated: false };

const dto = (): ClientDataExportDto => ({
    generatedAtUtc: '2026-10-16T09:30:00Z',
    clinicId: null,
    maxRowsPerSection: 1000,
    client: {
        id: 'c1',
        fullName: 'Ali Veli',
        phone: null,
        email: null,
        address: null,
        createdAtUtc: '2025-03-01T10:00:00Z',
        preferredContactChannel: 'None',
        remindersOptedOut: false
    },
    kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null },
    pets: {
        items: [
            {
                id: 'p1',
                name: 'Pamuk',
                speciesName: 'Kedi',
                breed: null,
                gender: null,
                birthDate: null,
                isNeutered: false,
                microchipNumber: null,
                passportOrTagNumber: null,
                status: 'Active',
                deceasedOn: null
            }
        ],
        isTruncated: false
    },
    appointments: { items: [], isTruncated: true },
    examinations: empty,
    vaccinations: empty,
    treatments: empty,
    prescriptions: empty,
    charges: empty,
    payments: empty,
    balance: { currency: 'TRY', chargedAmount: 0, allocatedAmount: 0, outstandingAmount: 0, unallocatedPaymentAmount: 0 }
});

describe('ClientDataExportPageComponent', () => {
    let fixture: ComponentFixture<ClientDataExportPageComponent>;
    let getClientDataExport: Mock;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [ClientDataExportPageComponent],
            providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } } }, { provide: ClientsService, useValue: { getClientDataExport } }]
        });
        fixture = TestBed.createComponent(ClientDataExportPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        getClientDataExport = vi.fn().mockName('getClientDataExport').mockReturnValue(of(dto()));
    });

    it('başlık müşteri adıyla, üretim tarihi, bölümler tablo; boş bölüm ve kesilme notu', () => {
        create();

        expect(getClientDataExport).toHaveBeenCalledTimes(1);

        expect(getClientDataExport).toHaveBeenCalledWith('c1');
        expect(el().querySelector('[data-testid="data-export-title"]')?.textContent).toBe('Veri kopyası — Ali Veli');
        expect(el().querySelector('[data-testid="data-export-generated"]')?.textContent).toContain('Üretim tarihi:');
        expect(el().querySelector('[data-testid="data-export-pets"] table')?.textContent).toContain('Pamuk');
        expect(el().querySelector('[data-testid="data-export-pets"] h3')?.textContent).toContain('Hastalar (1)');
        expect(el().querySelector('[data-testid="data-export-charges"]')?.textContent).toContain('Kayıt yok.');
        expect(el().querySelector('[data-testid="data-export-appointments"] [data-testid="data-export-truncated"]')?.textContent).toContain('1000');
        expect(el().querySelector('[data-testid="data-export-pets"] [data-testid="data-export-truncated"]')).toBeNull();
        expect(el().textContent).toContain('KVKK açık rıza');
        expect(el().textContent).toContain('Bakiye');
    });

    it('JSON indir yüklenen yanıtı indirir, sunucuya yeni istek atmaz', () => {
        create();
        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');

        vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue(undefined);

        (el().querySelector('button[data-testid="data-export-json"]') as HTMLButtonElement).click();

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect((vi.mocked(createObjectURL).mock.lastCall![0] as Blob).type).toBe('application/json');
        expect(getClientDataExport).toHaveBeenCalledTimes(1);
    });

    it('Yazdır KVKK belge yazdırma düzenini kullanır', () => {
        create();
        const print = vi.spyOn(window, 'print').mockReturnValue(undefined);

        (el().querySelector('button[data-testid="data-export-print"]') as HTMLButtonElement).click();

        expect(print).toHaveBeenCalledTimes(1);
        expect(document.body.classList).toContain('kvkk-form-print-active');
        window.dispatchEvent(new Event('afterprint'));
        expect(document.body.classList).not.toContain('kvkk-form-print-active');
    });

    it('hata durumunda mesaj gösterilir', () => {
        getClientDataExport.mockReturnValue(throwError(() => new Error('Müşteri bulunamadı.')));
        create();

        expect(el().textContent).toContain('Müşteri bulunamadı.');
        expect(el().querySelector('[data-testid="data-export-title"]')).toBeNull();
    });
});
