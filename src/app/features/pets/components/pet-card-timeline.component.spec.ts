import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { PetTimelinePageVm, PetTimelineQuery } from '@/app/entities/pet/models/pet-timeline-vm.model';
import type { PetHistoryPaymentItemVm } from '@/app/entities/pet/models/pet-vm.model';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import type { PetCardSection } from '@/app/entities/patient/utils/pet-card.utils';
import { PET_CARD_TIMELINE_LIMIT, PetCardTimelineComponent } from './pet-card-timeline.component';

const event = (type: string, id: string, eventAtUtc: string) => ({
    key: `${type}:${id}`,
    type,
    sourceId: id,
    eventAtUtc,
    clinicName: null,
    title: `${type} ${id}`,
    summary: null,
    status: null,
    isVoided: false,
    linkType: type,
    linkId: id,
    relatedExaminationId: null,
    relatedAppointmentId: null,
    relatedTreatmentId: null,
    addedAfterFinalization: false
});

const payment = (id: string, paidAtUtc: string): PetHistoryPaymentItemVm => ({ id, paidAtUtc, amount: 500, currency: 'TRY', method: 'Cash', clinicName: null });

describe('PetCardTimelineComponent', () => {
    let fixture: ComponentFixture<PetCardTimelineComponent>;
    let calls: PetTimelineQuery[];
    let responder: () => ReturnType<PetsService['getPetTimeline']>;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = (payments: PetCardSection<PetHistoryPaymentItemVm[]>) => {
        fixture = TestBed.createComponent(PetCardTimelineComponent);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.componentRef.setInput('payments', payments);
        fixture.detectChanges();
    };

    const select = (value: Parameters<PetCardTimelineComponent['filter']['set']>[0]) => {
        fixture.componentInstance.filter.set(value);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        calls = [];
        responder = () => of<PetTimelinePageVm>({ items: [event('Examination', 'e1', '2026-10-12T10:00:00Z')], nextCursor: null, omittedTypes: [] });
        await TestBed.configureTestingModule({
            imports: [PetCardTimelineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: PetsService,
                    useValue: {
                        getPetTimeline: (_id: string, q: PetTimelineQuery) => {
                            calls.push(q);

                            return responder();
                        }
                    }
                }
            ]
        }).compileComponents();
    });

    it('"Tümü" yetkili tüm türleri sınırlı ister ve geçmiş özetindeki ödemeleri tarihe göre karıştırır', () => {
        create({ state: 'ok', data: [payment('pay1', '2026-10-13T10:00:00Z')] });

        expect(calls[0]).toEqual({ types: [], limit: PET_CARD_TIMELINE_LIMIT });
        const titles = Array.from(el().querySelectorAll('[data-testid="event-link"]')).map((a) => a.getAttribute('href'));

        expect(titles).toEqual(['/panel/payments/pay1', '/panel/examinations/e1']);
    });

    it('tür süzgeci uca türleri gönderir; Tedavi tedavi, reçete ve uygulamayı kapsar; ödeme listeye karışmaz', () => {
        create({ state: 'ok', data: [payment('pay1', '2026-10-13T10:00:00Z')] });

        select('treatment');
        expect(calls[1].types).toEqual(['Treatment', 'Prescription', 'Administration']);
        select('lab');
        expect(calls[2].types).toEqual(['LabResult']);
        expect(el().querySelector('a[href="/panel/payments/pay1"]')).toBeNull();
    });

    it('"Ödeme" süzgeci uca istek atmaz; yetki yoksa yetki notu, Tümü\'nde de Ödeme yetki notuna girer', () => {
        create(null);
        expect(el().querySelector('[data-testid="omitted-note"]')?.textContent).toContain('Ödeme');

        select('payment');
        expect(calls.length).toBe(1);
        expect(el().querySelector('[data-testid="payments-forbidden"]')).not.toBeNull();
    });

    it('uç hatasında hata ve "Tekrar dene"; tekrar dene aynı süzgeçle yeniden ister', () => {
        responder = () => throwError(() => new Error('Zaman çizelgesi yüklenemedi.'));
        create({ state: 'ok', data: [] });

        expect(el().querySelector('[data-testid="timeline-error"]')?.textContent).toContain('yüklenemedi');
        responder = () => of<PetTimelinePageVm>({ items: [], nextCursor: null, omittedTypes: [] });
        (el().querySelector('[data-testid="timeline-error"] button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(calls.length).toBe(2);
        expect(el().querySelector('[data-testid="timeline-empty"]')).not.toBeNull();
    });

    it('süzgeç değişince liste yerinde kalır; "Yükleniyor" yalnız ilk yüklemede görünür (alttaki bölümler zıplamaz)', () => {
        create({ state: 'ok', data: [] });
        const pending = new Subject<PetTimelinePageVm>();

        responder = () => pending;
        select('lab');

        expect(el().querySelector('[data-testid="timeline-list"]')).not.toBeNull();
        expect(el().textContent).not.toContain('Yükleniyor');
        pending.next({ items: [event('LabResult', 'l1', '2026-10-12T10:00:00Z')], nextCursor: null, omittedTypes: [] });
        pending.complete();
        fixture.detectChanges();
        expect(el().querySelector('a[href="/panel/lab-results/l1"]')).not.toBeNull();
    });
});
