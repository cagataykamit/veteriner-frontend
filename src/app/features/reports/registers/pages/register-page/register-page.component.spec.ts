import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { RegisterPageComponent } from './register-page.component';

describe('RegisterPageComponent', () => {
    let api: jasmine.SpyObj<ApiClient>;
    let claims: Set<string>;

    function create(register: string): ComponentFixture<RegisterPageComponent> {
        TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { data: { register } } } });
        const fixture = TestBed.createComponent(RegisterPageComponent);

        fixture.detectChanges();

        return fixture;
    }

    beforeEach(() => {
        sessionStorage.clear();
        claims = new Set(['Examinations.Read', 'Prescriptions.Read', 'StockMovements.Read', 'Administrations.Read', 'Vaccinations.Read', 'Products.Read']);
        api = jasmine.createSpyObj<ApiClient>('ApiClient', ['get', 'getBlob']);
        api.get.and.callFake(((path: string) =>
            of(
                path.endsWith('/controlled-substances')
                    ? {
                          totalCount: 1,
                          items: [
                              {
                                  rowNumber: 1,
                                  direction: 'Received',
                                  productName: 'Ketamin',
                                  quantity: 5,
                                  receivedFrom: 'Vet Depo',
                                  receivedDate: '2026-10-01',
                                  receivedDocumentNumber: 'F-1'
                              }
                          ]
                      }
                    : path.endsWith('/vaccine-info')
                      ? {
                            totalCount: 1,
                            items: [
                                {
                                    rowNumber: 1,
                                    administeredAtUtc: '2026-10-05T09:00:00Z',
                                    ownerName: 'Ayşe',
                                    petName: 'Pamuk',
                                    species: 'Kedi',
                                    productName: 'Karma Aşı',
                                    unit: 'doz',
                                    quantity: 1,
                                    unitPrice: 150,
                                    totalPrice: 150,
                                    currency: 'TRY',
                                    addedAfterFinalization: false,
                                    isVoided: false
                                }
                            ]
                        }
                      : path.endsWith('/prescriptions')
                    ? {
                          totalCount: 1,
                          items: [
                              {
                                  rowNumber: 1,
                                  prescriptionId: 'p1',
                                  prescribedAtUtc: '2026-10-05T09:00:00Z',
                                  ownerName: 'Ali',
                                  species: 'İnek',
                                  animalCount: 1,
                                  items: [{ name: 'Dectomax', quantity: 1 }]
                              }
                          ]
                      }
                    : {
                          totalCount: 1,
                          items: [
                              {
                                  rowNumber: 1,
                                  examinedAtUtc: '2026-10-05T09:00:00Z',
                                  ownerName: 'Ayşe',
                                  petName: 'Pamuk',
                                  species: 'Kedi',
                                  complaint: 'Kusma',
                                  treatments: [],
                                  prescriptions: [],
                                  administrations: []
                              }
                          ]
                      }
            )) as never
        );
        api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob(['x']), headers: new HttpHeaders() })));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ProductService, useValue: { getProducts: () => of({ items: [{ id: 'pr1', name: 'Karma Aşı', kind: 'Vaccine' }, { id: 'pr2', name: 'Serum', kind: 'Medicine' }] }) } },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([{ userId: 'u1', name: 'Dr. Veli' }]) } },
                { provide: ApiClient, useValue: api },
                {
                    provide: AuthService,
                    useValue: {
                        hasOperationClaim: (c: string) => claims.has(c),
                        getMyClinics: () => of([{ id: 'c1', name: 'Klinik 1' }]),
                        getJwtClinicId: () => null,
                        getClinicId: () => 'c1'
                    }
                }
            ]
        });
    });

    afterEach(() => document.body.classList.remove('register-page-active'));

    it('reçete defteri: defter başlığı, gruplu üst başlıklar, sıra no ve tek hücrede ilaçlar', () => {
        const el: HTMLElement = create('prescriptions').nativeElement;

        expect(el.querySelector('.register-print-title')!.textContent).toContain('Reçete Kayıt Defteri');
        const groups = Array.from(el.querySelectorAll('.register-head-row')[0].querySelectorAll('th')).map((th) => th.textContent!.trim());

        expect(groups).toEqual(['Sıra No', 'REÇETENİN', 'VETERİNER HEKİMİN', 'HAYVAN SAHİBİNİN', 'HAYVANIN', 'İlacın Adı, Farmakolojik Şekli, Ambalajı, Adedi']);
        const cells = Array.from(el.querySelectorAll('tbody tr td')).map((td) => td.textContent!.trim());

        expect(cells[0]).toBe('1');
        expect(cells[cells.length - 1]).toBe('Dectomax ×1');
    });

    it('tek süzgeç tarih aralığı + klinik: arama, müşteri ve hayvan yok; Filtrele var', () => {
        const el: HTMLElement = create('prescriptions').nativeElement;
        const text = el.textContent!;

        expect(text).toContain('Başlangıç tarihi');
        expect(text).toContain('Bitiş tarihi');
        expect(text).toContain('Filtrele');
        expect(el.querySelector('app-search-input, app-client-search, app-pet-search')).toBeNull();
    });

    it('liste ve dışa aktarma aynı süzgeçle çağrılır (from/to yyyy-MM-dd)', () => {
        const fixture = create('prescriptions');
        const listParams = api.get.calls.mostRecent().args[1] as HttpParams;

        expect(listParams.get('from')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        fixture.componentInstance.state.exportCsv();
        fixture.componentInstance.state.exportXlsx();

        for (const call of api.getBlob.calls.all()) {
            const p = call.args[1] as HttpParams;

            expect(p.get('from')).toBe(listParams.get('from'));
            expect(p.get('to')).toBe(listParams.get('to'));
            expect(p.has('page')).toBeFalse();
        }

        expect(api.getBlob.calls.count()).toBe(2);
    });

    it('yazdırma görünümü: sade başlık, tekrar eden thead, imza alanı ve ekran-dışı sınıflar; gövde sınıfı sayfayla yaşar', () => {
        const fixture = create('examinations');
        const el: HTMLElement = fixture.nativeElement;

        expect(document.body.classList).toContain('register-page-active');
        expect(el.querySelector('.register-print-title')).not.toBeNull();
        expect(el.querySelector('.register-meta')!.textContent).toContain('Tarih aralığı');
        expect(el.querySelector('.register-signature-box')!.textContent).toContain('Veteriner Hekim imza/kaşe');
        expect(el.querySelector('.register-signature-note')!.textContent).toContain('doğrulanmamıştır');
        expect(el.querySelector('app-report-filter-bar')!.classList).toContain('register-screen-only');
        expect(el.querySelector('.report-summary')).toBeNull();
        expect(el.querySelector('.register-meta')!.textContent).toContain('1 kayıt');
        fixture.destroy();
        expect(document.body.classList).not.toContain('register-page-active');
    });

    it('Yazdır düğmesi tarayıcı yazdırmasını açar', () => {
        const fixture = create('examinations');
        const print = spyOn(window, 'print');

        fixture.componentInstance.print();
        expect(print).toHaveBeenCalled();
    });

    it('narkotik defteri: iki gruplu başlık, ek süzgeç yok, çıktı tüm sütunlar ayrı', () => {
        const el: HTMLElement = create('controlled-substances').nativeElement;

        expect(el.querySelector('.register-print-title')!.textContent).toContain('Narkotik ve Psikotropik Ürünler Stok ve Sarf Defteri');
        const top = Array.from(el.querySelectorAll('.register-head-row')[0].querySelectorAll('th')).map((th) => th.textContent!.trim());

        expect(top).toContain('SATIN/İADE/DEVİR ALINAN ÜRÜNÜN');
        expect(top).toContain('SATILAN/İADE VEYA DEVREDİLEN ÜRÜNÜN');
        expect(el.querySelector('#registerRepVoided')).toBeNull();
        expect(el.querySelector('.register-print-table tbody tr')!.querySelectorAll('td').length).toBe(11);
        expect(el.querySelector('.register-signature-note')!.textContent).toContain('doğrulanmamıştır');
    });

    it('aşı bilgi raporu: ürün, veteriner ve iptal süzgeçleri; seçim uca gider; fiyat ipucu görünür', () => {
        const fixture = create('vaccine-info');
        const el: HTMLElement = fixture.nativeElement;

        expect(el.textContent).toContain('katalog fiyatı');
        expect(el.querySelector('#registerRepVoided')).not.toBeNull();
        expect(fixture.componentInstance.productOptions()).toEqual([{ label: 'Karma Aşı', value: 'pr1' }]);
        expect(fixture.componentInstance.veterinarianOptions()).toEqual([{ label: 'Dr. Veli', value: 'u1' }]);

        fixture.componentInstance.setExtra('productId', 'pr1');
        fixture.componentInstance.setExtra('includeVoided', 'true');
        fixture.componentInstance.state.applyFilters();
        const params = api.get.calls.mostRecent().args[1] as HttpParams;

        expect(params.get('productId')).toBe('pr1');
        expect(params.get('includeVoided')).toBe('true');
        expect(params.has('veterinarianId')).toBeFalse();
    });

    it('aşı kayıt defterinde yalnız iptal edilen girişleri göster süzgeci vardır', () => {
        const fixture = create('vaccines');

        expect(fixture.nativeElement.querySelector('#registerRepVoided')).not.toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('katalog fiyatı');
        expect(fixture.componentInstance.productOptions()).toEqual([]);
    });

    it('izin yoksa dışa aktarma düğmeleri görünmez', () => {
        claims.delete('Examinations.Read');
        const text = (create('examinations').nativeElement as HTMLElement).textContent!;

        expect(text).not.toContain('CSV indir');
        expect(text).not.toContain('Excel indir');
    });
});
