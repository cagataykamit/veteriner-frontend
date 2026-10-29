import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import type { PetTimelinePageVm, PetTimelineQuery } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { PetTimelinePageComponent } from './pet-timeline-page.component';

const item = (type: string, id: string, over: Record<string, unknown> = {}) => ({
    key: `${type}:${id}`,
    type,
    sourceId: id,
    eventAtUtc: '2026-10-10T10:00:00Z',
    clinicName: 'Merkez',
    title: `${type} ${id}`,
    summary: null,
    status: null,
    isVoided: false,
    linkType: type,
    linkId: id,
    relatedExaminationId: null,
    addedAfterFinalization: false,
    ...over
});

const page = (items: ReturnType<typeof item>[], nextCursor: string | null = null, omittedTypes: string[] = []): PetTimelinePageVm => ({
    items,
    nextCursor,
    omittedTypes
});

describe('PetTimelinePageComponent', () => {
    let fixture: ComponentFixture<PetTimelinePageComponent>;
    let calls: PetTimelineQuery[];
    let responder: (q: PetTimelineQuery) => ReturnType<PetsService['getPetTimeline']>;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = () => {
        fixture = TestBed.createComponent(PetTimelinePageComponent);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        calls = [];
        responder = () => of(page([]));
        await TestBed.configureTestingModule({
            imports: [PetTimelinePageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })) } },
                {
                    provide: PetsService,
                    useValue: {
                        getPetById: () => of({ name: 'Pamuk' }),
                        getPetTimeline: (_id: string, q: PetTimelineQuery) => {
                            calls.push(q);

                            return responder(q);
                        }
                    }
                }
            ]
        }).compileComponents();
    });

    it('ilk sayfada varsayılan olarak iptal edilmişleri istemez; olayları tür simgesi ve bağlantıyla çizer', () => {
        responder = () => of(page([item('Examination', 'e1'), item('Treatment', 't1', { relatedExaminationId: 'e1' }), item('Visit', 'v1')]));
        create();

        expect(calls[0]).toEqual(expect.objectContaining({ includeVoided: false, types: [], cursor: null, limit: 20 }));
        expect(el().querySelectorAll('[data-testid="type-icon"]').length).toBe(3);
        expect(el().querySelectorAll('[data-testid="event-link"]').length).toBe(2);
        expect(el().querySelectorAll('[data-testid="examination-link"]').length).toBe(1);
        expect(el().textContent).toContain('Pamuk');
    });

    it('uygulama satırı: miktar özeti kırmızı değil, sonradan eklendi rozeti yalnız işaretli satırda', () => {
        responder = () => of(page([item('Administration', 'a1', { summary: '1.5 şişe', addedAfterFinalization: true, relatedExaminationId: 'e1' }), item('Administration', 'a2', { summary: '1 şişe' }), item('Visit', 'v1', { summary: 'Acil' })]));
        create();

        expect(el().querySelectorAll('[data-testid="late-entry"]').length).toBe(1);
        expect(el().textContent).toContain('Kesinleştirmeden sonra eklendi');
        const summaries = Array.from(el().querySelectorAll('[data-testid="summary"]'));

        expect(summaries[0].className).toContain('text-muted-color');
        expect(summaries[2].className).toContain('text-red-600');
        expect(el().querySelectorAll('[data-testid="event-link"]').length).toBe(0);
        expect(el().querySelectorAll('[data-testid="examination-link"]').length).toBe(1);
    });

    it('geliş satırında relatedExaminationId doluysa "Bağlı muayene" bağlantısı çıkar; null ise çıkmaz', () => {
        responder = () => of(page([item('Visit', 'v1', { relatedExaminationId: 'e7' }), item('Visit', 'v2')]));
        create();

        const links = el().querySelectorAll('[data-testid="examination-link"]');

        expect(links.length).toBe(1);
        expect(links[0].getAttribute('href')).toContain('/panel/examinations/e7');
    });

    it('"Daha fazla yükle" aynı süzgeçle son imleci gönderir, sonucu ekler ve imleç bitince düğme kalkar', () => {
        responder = (q) => (q.cursor ? of(page([item('Visit', 'v2')])) : of(page([item('Visit', 'v1')], 'CUR1')));
        create();

        (el().querySelector('[data-testid="load-more"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(calls[1]).toEqual(expect.objectContaining({ cursor: 'CUR1', includeVoided: false }));
        expect(fixture.componentInstance.items().map((i) => i.key)).toEqual(['Visit:v1', 'Visit:v2']);
        expect(el().querySelector('[data-testid="load-more"]')).toBeNull();
    });

    it('yükleme sürerken tekrar tıklama ikinci istek atmaz (çift tıklama kilidi)', () => {
        const pending = new Subject<PetTimelinePageVm>();

        responder = (q) => (q.cursor ? pending : of(page([item('Visit', 'v1')], 'CUR1')));
        create();

        fixture.componentInstance.loadMore();
        fixture.componentInstance.loadMore();

        expect(calls.filter((c) => c.cursor === 'CUR1').length).toBe(1);
    });

    it('daha fazla yükleme hatasında mevcut liste korunur ve hata gösterilir', () => {
        responder = (q) => (q.cursor ? throwError(() => new Error('Ağ hatası')) : of(page([item('Visit', 'v1')], 'CUR1')));
        create();

        fixture.componentInstance.loadMore();
        fixture.detectChanges();

        expect(fixture.componentInstance.items().length).toBe(1);
        expect(el().querySelector('[data-testid="load-more-error"]')?.textContent).toContain('Ağ hatası');
        expect(el().querySelector('[data-testid="load-more"]')).not.toBeNull();
    });

    it('iptal/yanlış işaretli süzgeci açılınca liste baştan, imleçsiz ve includeVoided=true ile istenir; işaretli satır etiketlenir', () => {
        responder = (q) => of(page(q.includeVoided ? [item('Vaccination', 'a1', { isVoided: true, status: 'Cancelled' })] : [item('Visit', 'v1')], q.includeVoided ? null : 'CUR1'));
        create();

        fixture.componentInstance.setIncludeVoided(true);
        fixture.detectChanges();

        expect(calls[1]).toEqual(expect.objectContaining({ includeVoided: true, cursor: null }));
        expect(el().querySelector('[data-testid="voided"]')?.textContent).toContain('İptal / yanlış işaretli');
        expect(fixture.componentInstance.items().length).toBe(1);
    });

    it('tarih aralığı filtresi listeyi baştan ve aynı aralıkla yükler; ters aralık yer değiştirir; değişmeyen aralık istek atmaz', () => {
        create();

        fixture.componentInstance.setDateRange('2026-10-12', '2026-10-10');
        fixture.componentInstance.setDateRange('2026-10-10', '2026-10-12');

        expect(calls.length).toBe(2);
        expect(calls[1]).toEqual(expect.objectContaining({ fromDate: '2026-10-10', toDate: '2026-10-12', cursor: null }));
    });

    it('tür seçimi sözleşme sırasıyla types olarak gönderilir', () => {
        create();

        fixture.componentInstance.toggleType('Treatment', true);
        fixture.componentInstance.toggleType('Visit', true);

        expect(calls[2].types).toEqual(['Visit', 'Treatment']);
    });

    it('omittedTypes varsa yetki notu gösterilir; yoksa gösterilmez; boş liste "kayıt yok" der', () => {
        responder = () => of(page([], null, ['LabResult']));
        create();

        expect(el().querySelector('[data-testid="omitted-note"]')?.textContent).toContain('yetkiniz olmadığı için gösterilmiyor');
        expect(el().querySelector('[data-testid="omitted-note"]')?.textContent).toContain('Laboratuvar');
        expect(el().textContent).toContain('Henüz kayıt yok');

        responder = () => of(page([item('Visit', 'v1')]));
        fixture.componentInstance.reload();
        fixture.detectChanges();

        expect(el().querySelector('[data-testid="omitted-note"]')).toBeNull();
    });

    it('ilk sayfa hatasında hata durumu ve yeniden deneme gösterilir', () => {
        responder = () => throwError(() => new Error('Zaman çizelgesi yüklenemedi.'));
        create();

        expect(el().textContent).toContain('Zaman çizelgesi yüklenemedi.');
        expect(el().querySelector('[data-testid="timeline-list"]')).toBeNull();
    });
});

describe('PetTimelinePageComponent — tarih aralığı filtresi (gerçek tarih alanı, servis ve HTTP)', () => {
    let fixture: ComponentFixture<PetTimelinePageComponent>;
    let http: HttpTestingController;

    /** Filtre değişince uçuştaki istek iptal edilir; yalnız açık (iptal edilmemiş) istekler döner. */
    const timelineRequests = () => http.match((r) => r.url === 'http://api.test/api/v1/pets/p1/timeline').filter((r) => !r.cancelled);
    const flushTimeline = () => timelineRequests().forEach((r) => r.flush({ items: [], nextCursor: null, omittedTypes: [] }));
    const dateInputs = () => fixture.debugElement.queryAll(By.directive(DateInputComponent)).map((d) => d.componentInstance as DateInputComponent);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PetTimelinePageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })) } }
            ]
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(PetTimelinePageComponent);
        fixture.detectChanges();
        http.match('http://api.test/api/v1/pets/p1').forEach((r) => r.flush({ id: 'p1', name: 'Pamuk' }));
        flushTimeline();
    });

    afterEach(() => http.verify());

    it('takvimden seçilen günler İstanbul gün sınırıyla yarı açık fromUtc/toUtc olarak gider; bitiş günü dahildir', () => {
        const [from, to] = dateInputs();

        from.onPickerChange(new Date(2026, 9, 10));
        flushTimeline();
        to.onPickerChange(new Date(2026, 9, 12));
        fixture.detectChanges();

        const [req] = timelineRequests();

        expect(req.request.params.get('fromUtc')).toBe('2026-10-09T21:00:00.000Z');
        expect(req.request.params.get('toUtc')).toBe('2026-10-12T21:00:00.000Z');
        expect(req.request.params.has('cursor')).toBe(false);
        req.flush({ items: [], nextCursor: null, omittedTypes: [] });
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Seçili filtrelere uyan kayıt yok.');
    });

    it('sonraki sayfa aynı tarih aralığıyla ve imleçle istenir', () => {
        dateInputs()[0].onPickerChange(new Date(2026, 9, 10));
        timelineRequests()[0].flush({
            items: [{ type: 'Visit', sourceId: 'v1', eventAtUtc: '2026-10-11T08:00:00Z', clinicId: 'c1', clinicName: 'Merkez', title: 'Geliş', linkRef: { type: 'Visit', id: 'v1' } }],
            nextCursor: 'CUR1',
            omittedTypes: []
        });
        fixture.detectChanges();

        fixture.componentInstance.loadMore();
        const [req] = timelineRequests();

        expect(req.request.params.get('fromUtc')).toBe('2026-10-09T21:00:00.000Z');
        expect(req.request.params.get('cursor')).toBe('CUR1');
        req.flush({ items: [], nextCursor: null, omittedTypes: [] });
    });

    it('takvimdeki temizleme tarihi kaldırır; "Filtreleri temizle" tüm filtreleri sıfırlayıp parametresiz ister', () => {
        const [from] = dateInputs();

        from.onPickerChange(new Date(2026, 9, 10));
        flushTimeline();
        from.onPickerChange(null);

        expect(timelineRequests()[0].request.params.has('fromUtc')).toBe(false);
        flushTimeline();

        fixture.componentInstance.setIncludeVoided(true);
        fixture.componentInstance.setDateRange('2026-10-01', '');
        flushTimeline();
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('[data-testid="clear-filters"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        const [req] = timelineRequests();

        expect(req.request.params.keys()).toEqual(['limit']);
        req.flush({ items: [], nextCursor: null, omittedTypes: [] });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[data-testid="clear-filters"]')).toBeNull();
    });
});
