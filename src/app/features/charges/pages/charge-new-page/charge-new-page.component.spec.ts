import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ChargeCreateResultVm, ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
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
    createdAtUtc: '2026-10-10T07:00:00Z'
};

const todayItem = (over: Partial<TodayItemVm>): TodayItemVm =>
    ({ key: 'v1', visitId: 'v1', petId: 'p1', petName: 'Pamuk', clientId: 'cl1', arrivedAtUtc: '2026-10-10T07:00:00Z', isVoided: false, ...over }) as TodayItemVm;

describe('ChargeNewPageComponent', () => {
    let fixture: ComponentFixture<ChargeNewPageComponent>;
    let cmp: ChargeNewPageComponent;
    let charges: jasmine.SpyObj<ChargesService>;
    let router: Router;
    let claims: Set<string>;
    let mutationBlocked: boolean;
    let queryClientId: string | null;

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [ChargeNewPageComponent],
            providers: [
                provideRouter([]),
                { provide: ChargesService, useValue: charges },
                { provide: ClientSearchService, useValue: { search: () => of([]), getById: () => of({ id: 'cl1', fullName: 'Ali Veli', phone: '—', petNames: [], label: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [{ id: 'p1', name: 'Pamuk', speciesName: 'Kedi', clientId: 'cl1' }] }) } },
                {
                    provide: ExaminationsService,
                    useValue: {
                        getExaminations: () =>
                            of({ items: [{ id: 'ex1', examinedAtUtc: '2026-10-09T08:00:00Z', petName: 'Pamuk', visitReason: 'Kontrol' }] })
                    }
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
                                    todayItem({ visitId: null, key: 'a1' })
                                ]
                            })
                    }
                },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => (k === 'clientId' ? queryClientId : null) } } } }
            ]
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(ChargeNewPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    const fill = (over: Record<string, unknown> = {}) => {
        cmp.form.patchValue({ clientId: 'cl1', description: 'Genel muayene', quantity: 1, unitPrice: 750, ...over });
        fixture.detectChanges();
    };

    beforeEach(() => {
        charges = jasmine.createSpyObj<ChargesService>('ChargesService', ['createCharge']);
        claims = new Set(['Visits.Read', 'Examinations.Read']);
        mutationBlocked = false;
        queryClientId = null;
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
        expect(cmp.amountRoundsToZero()).toBeTrue();
        cmp.onSubmit();
        expect(charges.createCharge).not.toHaveBeenCalled();
    });

    it('zorunlu alanlar ve sınırlar: müşteri/açıklama/birim fiyat boşsa, miktar 0 veya fazla ondalıksa geçersiz', async () => {
        await setup();
        expect(cmp.form.valid).toBeFalse();
        fill({ description: '   ' });
        expect(cmp.form.controls.description.invalid).toBeTrue();
        fill({ description: 'a'.repeat(501) });
        expect(cmp.form.controls.description.hasError('maxlength')).toBeTrue();
        fill({ description: 'ok', quantity: 0 });
        expect(cmp.form.controls.quantity.invalid).toBeTrue();
        fill({ quantity: 1.2345 });
        expect(cmp.form.controls.quantity.invalid).toBeTrue();
        fill({ quantity: 1, unitPrice: 10.123 });
        expect(cmp.form.controls.unitPrice.invalid).toBeTrue();
        fill({ unitPrice: 10.12 });
        expect(cmp.form.valid).toBeTrue();
    });

    it('geçersiz formda istek atılmaz', async () => {
        await setup();
        cmp.onSubmit();
        expect(charges.createCharge).not.toHaveBeenCalled();
        expect(cmp.form.controls.clientId.touched).toBeTrue();
    });

    it('geçerli formda isteği requestId ile gönderir ve listeye yönlendirir', async () => {
        charges.createCharge.and.returnValue(of({ created: true, charge: created } as ChargeCreateResultVm));
        await setup();
        fill({ description: ' Genel muayene ' });
        cmp.onSubmit();
        const req = charges.createCharge.calls.mostRecent().args[0];
        expect(req.clientId).toBe('cl1');
        expect(req.quantity).toBe(1);
        expect(req.unitPrice).toBe(750);
        expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(router.navigate).toHaveBeenCalledWith(['/panel/charges'], { queryParams: { clientId: 'cl1' } });
    });

    it('çift tıklama: istek sürerken ikinci gönderim yapılmaz ve düğme kilitlidir', async () => {
        const pending = new Subject<ChargeCreateResultVm>();
        charges.createCharge.and.returnValue(pending);
        await setup();
        fill();
        cmp.onSubmit();
        cmp.onSubmit();
        fixture.detectChanges();
        expect(charges.createCharge).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue();
    });

    it('hata sonrası mesaj gösterilir, düğme açılır ve yeniden denemede aynı requestId kullanılır', async () => {
        charges.createCharge.and.returnValue(throwError(() => new Error('Geliş kaydındaki hayvan bu müşteriye ait değil.')));
        await setup();
        fill();
        cmp.onSubmit();
        fixture.detectChanges();
        expect(cmp.submitting()).toBeFalse();
        expect(cmp.submitError()).toBe('Geliş kaydındaki hayvan bu müşteriye ait değil.');
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('bu müşteriye ait değil');
        cmp.onSubmit();
        const [first, second] = charges.createCharge.calls.allArgs().map((a) => a[0].requestId);
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
        expect(cmp.form.controls.petId.enabled).toBeTrue();
    });

    it('geliş seçenekleri: yalnız seçili müşterinin, yanlış işaretlenmemiş gelişleri; hayvan seçilince daralır', async () => {
        await setup();
        fill();
        expect(cmp.visitOptions().map((o) => o.value)).toEqual(['v1', 'v2']);
        cmp.form.controls.petId.setValue('p2');
        expect(cmp.visitOptions().map((o) => o.value)).toEqual(['v2']);
    });

    it('müşteri değişince hayvan, geliş ve muayene seçimi sıfırlanır', async () => {
        await setup();
        fill({ petId: 'p1', visitId: 'v1', examinationId: 'ex1' });
        cmp.form.controls.clientId.setValue('');
        expect(cmp.form.controls.petId.value).toBe('');
        expect(cmp.form.controls.visitId.value).toBe('');
        expect(cmp.form.controls.examinationId.value).toBe('');
        expect(cmp.form.controls.petId.disabled).toBeTrue();
    });

    it('seçilen geliş ve muayene isteğe taşınır', async () => {
        charges.createCharge.and.returnValue(of({ created: true, charge: created } as ChargeCreateResultVm));
        await setup();
        fill();
        cmp.form.patchValue({ visitId: 'v1', examinationId: 'ex1' });
        cmp.onSubmit();
        const req = charges.createCharge.calls.mostRecent().args[0];
        expect(req.visitId).toBe('v1');
        expect(req.examinationId).toBe('ex1');
    });

    it('Visits.Read / Examinations.Read yoksa ilgili seçiciler gösterilmez', async () => {
        claims = new Set();
        await setup();
        expect(fixture.nativeElement.querySelector('#chargeVisit')).toBeNull();
        expect(fixture.nativeElement.querySelector('#chargeExam')).toBeNull();
    });
});
