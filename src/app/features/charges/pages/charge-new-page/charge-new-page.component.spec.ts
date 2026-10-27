import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { type Observable, of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargeCreateResultVm, ChargeVm } from '@/app/entities/charge/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ClientSearchService } from '@/app/entities/client/services/client-search.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { BreedsService } from '@/app/entities/breed/services/breeds.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { ChargeNewPageComponent } from './charge-new-page.component';

const created: ChargeVm = {
    id: 'ch1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: null,
    visitId: null,
    examinationId: null,
    description: 'Genel muayene',
    quantity: 1,
    unitPrice: 750,
    amount: 750,
    allocatedAmount: 0,
    outstandingAmount: 750,
    currency: 'TRY',
    createdAtUtc: '2026-10-10T07:00:00Z',
    lineKind: 'Service',
    vatRate: null
};

const todayItem = (over: Partial<TodayItemVm>): TodayItemVm => ({ key: 'v1', visitId: 'v1', petId: 'p1', petName: 'Pamuk', clientId: 'cl1', arrivedAtUtc: '2026-10-10T07:00:00Z', isVoided: false, ...over }) as TodayItemVm;

interface ExamQuery {
    clientId: string;
    petId?: string;
}

interface ExamItem {
    id: string;
    examinedAtUtc: string;
    petName: string;
    visitReason: string;
}

const exam = (id: string, petName: string): ExamItem => ({ id, examinedAtUtc: '2026-10-09T08:00:00Z', petName, visitReason: 'Kontrol' });

describe('ChargeNewPageComponent', () => {
    let fixture: ComponentFixture<ChargeNewPageComponent>;
    let cmp: ChargeNewPageComponent;
    let charges: MockedObject<ChargesService>;
    let router: Router;
    let claims: Set<string>;
    let mutationBlocked: boolean;
    let queryClientId: string | null;
    let queryVisitId: string | null = null;
    let queryPetId: string | null = null;
    let queryExaminationId: string | null = null;
    let getExaminations: (q: ExamQuery) => Observable<{
        items: ExamItem[];
    }>;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [ChargeNewPageComponent],
            providers: [
                provideRouter([]),
                { provide: ChargesService, useValue: charges },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'cl1', fullName: 'Ali Veli', phone: '—', petNames: [], label: 'Ali Veli' }) } },
                { provide: SpeciesService, useValue: {} }, // hızlı hayvan diyaloğunun bağımlılıkları; bu testlerde çağrılmaz
                { provide: BreedsService, useValue: {} },
                { provide: PetsService, useValue: { getPetById: () => of({ id: 'p1', name: 'Pamuk', speciesName: 'Kedi' }), getPets: () => of({ items: [{ id: 'p1', name: 'Pamuk', speciesName: 'Kedi', clientId: 'cl1' }] }) } },
                {
                    provide: ExaminationsService,
                    useValue: { getExaminations: (q: ExamQuery) => getExaminations(q) }
                },
                {
                    provide: VisitsService,
                    useValue: {
                        getToday: () =>
                            of({
                                date: '2026-10-10',
                                items: [
                                    todayItem({}),
                                    todayItem({ visitId: 'v2', petId: 'p2', petName: 'Boncuk' }),
                                    todayItem({ visitId: 'v3', isVoided: true }),
                                    todayItem({ visitId: 'v4', clientId: 'cl2' }),
                                    todayItem({ visitId: 'v5', arrivedAtUtc: '2026-10-08T07:00:00Z' }), // önceki günden süren geliş
                                    todayItem({ visitId: null, key: 'a1' })
                                ]
                            })
                    }
                },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParamMap: {
                                get: (k: string) => (k === 'clientId' ? queryClientId : k === 'visitId' ? queryVisitId : k === 'petId' ? queryPetId : k === 'examinationId' ? queryExaminationId : null)
                            }
                        }
                    }
                }
            ]
        }).compileComponents();
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ChargeNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    const fill = (over: Record<string, unknown> = {}) => {
        cmp.form.patchValue({ clientId: 'cl1', description: 'Genel muayene', quantity: 1, unitPrice: 750, ...over });
        fixture.detectChanges();
    };

    beforeEach(() => {
        charges = {
            createCharge: vi.fn().mockName('ChargesService.createCharge')
        } as unknown as MockedObject<ChargesService>;
        claims = new Set(['Visits.Read', 'Examinations.Read']);
        mutationBlocked = false;
        queryVisitId = null;
        queryPetId = null;
        queryExaminationId = null;
        queryClientId = null;
        getExaminations = () => of({ items: [exam('ex1', 'Pamuk')] });
    });

    it('tutar önizlemesi miktar × birim fiyattan hesaplanır ve 2 haneye yuvarlanır', async () => {
        await setup();
        fill({ quantity: 2.5, unitPrice: 19.99 });
        expect(cmp.amountPreview()).toBe(49.98);
        expect(fixture.nativeElement.textContent).toContain('49,98');
    });

    it('tutar sıfıra yuvarlanıyorsa uyarı gösterir ve kaydetmeye izin vermez', async () => {
        await setup();
        fill({ quantity: 0.001, unitPrice: 1 });
        expect(cmp.amountPreview()).toBeNull();
        expect(cmp.amountRoundsToZero()).toBe(true);
        cmp.onSubmit();
        expect(charges.createCharge).not.toHaveBeenCalled();
    });

    it('zorunlu alanlar ve sınırlar: müşteri/açıklama/birim fiyat boşsa, miktar 0 veya fazla ondalıksa geçersiz', async () => {
        await setup();
        expect(cmp.form.valid).toBe(false);
        fill({ description: '   ' });
        expect(cmp.form.controls.description.invalid).toBe(true);
        fill({ description: 'a'.repeat(501) });
        expect(cmp.form.controls.description.hasError('maxlength')).toBe(true);
        fill({ description: 'ok', quantity: 0 });
        expect(cmp.form.controls.quantity.invalid).toBe(true);
        fill({ quantity: 1.2345 });
        expect(cmp.form.controls.quantity.invalid).toBe(true);
        fill({ quantity: 1, unitPrice: 10.123 });
        expect(cmp.form.controls.unitPrice.invalid).toBe(true);
        fill({ unitPrice: 10.12 });
        expect(cmp.form.valid).toBe(true);
    });

    it('geçersiz formda istek atılmaz', async () => {
        await setup();
        cmp.onSubmit();
        expect(charges.createCharge).not.toHaveBeenCalled();
        expect(cmp.form.controls.clientId.touched).toBe(true);
    });

    it('geçerli formda isteği requestId ile gönderir ve listeye yönlendirir', async () => {
        charges.createCharge.mockReturnValue(of({ created: true, charge: created } as ChargeCreateResultVm));
        await setup();
        fill({ description: ' Genel muayene ' });
        cmp.onSubmit();
        const req = vi.mocked(charges.createCharge).mock.lastCall![0];

        expect(req.clientId).toBe('cl1');
        expect(req.quantity).toBe(1);
        expect(req.unitPrice).toBe(750);
        expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(router.navigate).toHaveBeenCalledWith(['/panel/charges'], { queryParams: { clientId: 'cl1' } });
    });

    it('Payments.Create varsa ücret kaydından sonra ödeme formuna müşteri, ücret ve geliş bağlamıyla geçer', async () => {
        claims.add('Payments.Create');
        const withVisit = { ...created, visitId: 'v1', examinationId: 'ex1' };

        charges.createCharge.mockReturnValue(of({ created: true, charge: withVisit } as ChargeCreateResultVm));
        await setup();
        fill();
        cmp.onSubmit(cmp.canCollectPayment);
        expect(router.navigate).toHaveBeenCalledWith(['/panel/payments/new'], {
            queryParams: { clientId: 'cl1', chargeId: 'ch1', visitId: 'v1', examinationId: 'ex1' }
        });
    });

    it('Payments.Create varsa birincil düğme "Kaydet ve ödemeyi şimdi al", ikincil "Kaydet" listeye döner; yoksa tek "Kaydet"', async () => {
        claims.add('Payments.Create');
        await setup();
        const labels = () => Array.from(fixture.nativeElement.querySelectorAll('form button[pButton]')).map((b) => (b as HTMLElement).textContent?.trim());

        expect(labels()).toContain('Kaydet ve ödemeyi şimdi al');
        expect(labels()).toContain('Kaydet');
        TestBed.resetTestingModule();
        claims = new Set();
        await setup();
        expect(labels()).not.toContain('Kaydet ve ödemeyi şimdi al');
        expect(labels()).toContain('Kaydet');
    });

    it('çift tıklama: istek sürerken ikinci gönderim yapılmaz ve düğme kilitlidir', async () => {
        const pending = new Subject<ChargeCreateResultVm>();

        charges.createCharge.mockReturnValue(pending);
        await setup();
        fill();
        cmp.onSubmit();
        cmp.onSubmit();
        fixture.detectChanges();
        expect(charges.createCharge).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBe(true);
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    });

    it('hata sonrası mesaj gösterilir, düğme açılır ve yeniden denemede aynı requestId kullanılır', async () => {
        charges.createCharge.mockReturnValue(throwError(() => new Error('Geliş kaydındaki hasta bu müşteriye ait değil.')));
        await setup();
        fill();
        cmp.onSubmit();
        fixture.detectChanges();
        expect(cmp.submitting()).toBe(false);
        expect(cmp.submitError()).toBe('Geliş kaydındaki hasta bu müşteriye ait değil.');
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('bu müşteriye ait değil');
        cmp.onSubmit();
        const [first, second] = vi.mocked(charges.createCharge).mock.calls.map((a) => a[0].requestId);

        expect(second).toBe(first);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('salt okunur kiracıda gönderilmez', async () => {
        mutationBlocked = true;
        await setup();
        fill();
        cmp.onSubmit();
        expect(charges.createCharge).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('salt okunur');
    });

    it('query clientId ile müşteri önceden seçilir', async () => {
        queryClientId = 'cl1';
        await setup();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
    });

    it('geliş seçenekleri: yalnız seçili müşterinin, yanlış işaretlenmemiş gelişleri; hayvan seçilince daralır', async () => {
        await setup();
        fill();
        expect(cmp.visitOptions().map((o) => o.value)).toEqual(['v1', 'v2']);
        cmp.form.controls.petId.setValue('p2');
        expect(cmp.visitOptions().map((o) => o.value)).toEqual(['v2']);
    });

    it('query visitId ile bugünkü geliş ve hayvanı önceden seçilir; önceki günün gelişi seçilmez', async () => {
        queryClientId = 'cl1';
        queryVisitId = 'v2';
        await setup();
        expect(cmp.form.controls.petId.value).toBe('p2');
        expect(cmp.form.controls.visitId.value).toBe('v2');
        TestBed.resetTestingModule();
        queryVisitId = 'v5';
        await setup();
        expect(cmp.form.controls.visitId.value).toBe('');
    });

    it('hayvan eylem çubuğundan gelen clientId ve petId ile müşteri ve hayvan önceden seçilir', async () => {
        queryClientId = 'cl1';
        queryPetId = 'p2';
        await setup();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
        expect(cmp.form.controls.petId.value).toBe('p2');
    });

    it('Bugün satırından gelen clientId + petId + visitId ile müşteri, hayvan ve geliş önceden seçilir', async () => {
        queryClientId = 'cl1';
        queryPetId = 'p2';
        queryVisitId = 'v2';
        await setup();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
        expect(cmp.form.controls.petId.value).toBe('p2');
        expect(cmp.form.controls.visitId.value).toBe('v2');
    });

    it('muayene ekranından gelen clientId + petId + examinationId ile hayvan ve (listedeyse) muayene önceden seçilir; muayene seçenekleri hayvana göre süzülür', async () => {
        const queries: ExamQuery[] = [];

        getExaminations = (q) => {
            queries.push(q);

            return of({ items: [exam('ex1', 'Pamuk'), exam('ex2', 'Boncuk')] });
        };

        queryClientId = 'cl1';
        queryPetId = 'p2';
        queryExaminationId = 'ex2';
        await setup();
        expect(cmp.form.controls.clientId.value).toBe('cl1');
        expect(cmp.form.controls.petId.value).toBe('p2');
        expect(cmp.form.controls.examinationId.value).toBe('ex2');
        expect(queries[queries.length - 1]).toEqual(expect.objectContaining({ clientId: 'cl1', petId: 'p2' }));
    });

    it('kullanıcı hayvanı değiştirince adresten gelen muayene ön ayarı düşer', async () => {
        queryClientId = 'cl1';
        queryPetId = 'p2';
        queryExaminationId = 'ex1';
        await setup();
        expect(cmp.form.controls.examinationId.value).toBe('ex1');
        cmp.form.controls.petId.setValue('p1');
        expect(cmp.form.controls.examinationId.value).toBe('');
    });

    it('query examinationId yüklenen muayene listesinde yoksa seçilmez', async () => {
        queryClientId = 'cl1';
        queryExaminationId = 'ex-yok';
        await setup();
        expect(cmp.form.controls.examinationId.value).toBe('');
    });

    it('müşteri değişince hayvan, geliş ve muayene seçimi sıfırlanır', async () => {
        await setup();
        fill({ petId: 'p1', visitId: 'v1', examinationId: 'ex1' });
        cmp.form.controls.clientId.setValue('');
        expect(cmp.form.controls.petId.value).toBe('');
        expect(cmp.form.controls.visitId.value).toBe('');
        expect(cmp.form.controls.examinationId.value).toBe('');
    });

    describe('muayene seçenekleri yarışı', () => {
        let pending: Map<
            string,
            Subject<{
                items: ExamItem[];
            }>
        >;
        const key = (q: ExamQuery) => `${q.clientId}|${q.petId ?? ''}`;

        const respond = (k: string, items: ExamItem[]) => {
            pending.get(k)!.next({ items });
            pending.get(k)!.complete();
        };

        const optionIds = () => cmp.examinationOptions().map((o) => o.value);

        beforeEach(() => {
            pending = new Map();

            getExaminations = (q) => {
                const s = new Subject<{
                    items: ExamItem[];
                }>();

                pending.set(key(q), s);

                return s;
            };
        });

        it('hasta hızlı değişince geç gelen eski hasta yanıtı yok sayılır', async () => {
            await setup();
            cmp.form.controls.clientId.setValue('cl1');
            cmp.form.controls.petId.setValue('p1');
            cmp.form.controls.petId.setValue('p2');

            respond('cl1|p2', [exam('ex2', 'Boncuk')]);
            respond('cl1|p1', [exam('ex1', 'Pamuk')]);
            respond('cl1|', [exam('ex1', 'Pamuk'), exam('ex2', 'Boncuk')]);

            expect(optionIds()).toEqual(['ex2']);
            expect(cmp.loadingExaminations()).toBe(false);
        });

        it('adresten müşteri ve hasta birlikte dolunca geç gelen yalnız-müşteri yanıtı hasta listesini ezmez', async () => {
            queryClientId = 'cl1';
            queryPetId = 'p1';
            await setup();
            expect([...pending.keys()]).toEqual(['cl1|', 'cl1|p1']);

            respond('cl1|p1', [exam('ex1', 'Pamuk')]);
            respond('cl1|', [exam('ex1', 'Pamuk'), exam('ex2', 'Boncuk')]);

            expect(optionIds()).toEqual(['ex1']);
            expect(cmp.loadingExaminations()).toBe(false);
        });

        it('bekleyen istek varken müşteri temizlenirse yükleniyor durumu kapanır ve eski yanıt yok sayılır', async () => {
            await setup();
            cmp.form.controls.clientId.setValue('cl1');
            cmp.form.controls.clientId.setValue('');

            respond('cl1|', [exam('ex1', 'Pamuk')]);

            expect(optionIds()).toEqual([]);
            expect(cmp.loadingExaminations()).toBe(false);
        });
    });

    it('seçilen geliş ve muayene isteğe taşınır', async () => {
        charges.createCharge.mockReturnValue(of({ created: true, charge: created } as ChargeCreateResultVm));
        await setup();
        fill();
        cmp.form.patchValue({ visitId: 'v1', examinationId: 'ex1' });
        cmp.onSubmit();
        const req = vi.mocked(charges.createCharge).mock.lastCall![0];

        expect(req.visitId).toBe('v1');
        expect(req.examinationId).toBe('ex1');
    });

    it('müşteri seçilince ve Pets.Create varken "yeni hayvan ekle" görünür; müşteri yokken veya yetkisiz görünmez', async () => {
        claims.add('Pets.Create');
        await setup();
        expect(fixture.nativeElement.textContent).not.toContain('yeni hasta');
        fill();
        expect(fixture.nativeElement.textContent).toContain('Bu müşteri için yeni hasta');
    });

    it('Pets.Create yoksa "yeni hayvan ekle" görünmez', async () => {
        await setup();
        fill();
        expect(fixture.nativeElement.textContent).not.toContain('yeni hasta');
    });

    it('Visits.Read / Examinations.Read yoksa ilgili seçiciler gösterilmez', async () => {
        claims = new Set();
        await setup();
        expect(fixture.nativeElement.querySelector('#chargeVisit')).toBeNull();
        expect(fixture.nativeElement.querySelector('#chargeExam')).toBeNull();
    });
});
