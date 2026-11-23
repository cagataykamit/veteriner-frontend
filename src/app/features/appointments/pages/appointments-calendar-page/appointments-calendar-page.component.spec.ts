import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM, VACCINATIONS_CREATE_CLAIM, VACCINATIONS_READ_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { VaccinationsService } from '@/app/entities/vaccination/services/vaccinations.service';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { AppointmentReasonsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { ReportPreferencesService } from '@/app/entities/report-preference/services/report-preferences.service';
import { AppointmentsCalendarPageComponent } from './appointments-calendar-page.component';
import type { AppointmentResourceVm } from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { AppointmentResourcesService } from '@/app/entities/appointment-resource/services/appointment-resources.service';

/** İstanbul 16.11.2026 (pazartesi) hh:mm. */
const at = (hm: string, day = 16): string => {
    const [h, m] = hm.split(':').map(Number);

    return new Date(Date.UTC(2026, 10, day, h - 3, m)).toISOString();
};

const appt = (id: string, hm: string, vet: string | null, extra: Partial<AppointmentCalendarItemVm> = {}): AppointmentCalendarItemVm => ({
    id,
    clinicId: 'c1',
    petId: `pet-${id}`,
    clientId: null,
    scheduledAtUtc: at(hm),
    scheduledEndUtc: null,
    durationMinutes: 30,
    durationLabel: '30 dk',
    localDateLabel: '',
    timeLabel: hm,
    timeRangeLabel: hm,
    status: 0,
    statusLabel: 'Planlandı',
    statusSeverity: 'info',
    appointmentTypeLabel: 'Muayene',
    petName: `Hasta-${id}`,
    clientName: 'Sahip',
    veterinarianUserId: vet,
    veterinarianName: vet ? `Dr. ${vet}` : '',
    reasonName: null,
    notes: null,
    state: 'DueToday',
    roomResourceId: null,
    roomResourceName: null,
    equipmentResourceId: null,
    equipmentResourceName: null,
    ...extra
});

const week = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, dayLabel: '', isClosed: false, opensAt: '09:00', closesAt: '19:00', breakStartsAt: '12:30', breakEndsAt: '13:30' }));

const vaccine = (id: string, dateKey: string, state: VaccinationCalendarItemVm['state'], kind: VaccinationCalendarItemVm['kind'] = 'NextDue', timeSpecified = false): VaccinationCalendarItemVm => ({
    key: `${id}:${kind}`,
    vaccinationId: id,
    kind,
    state,
    dateKey,
    atUtc: `${dateKey}T09:00:00Z`,
    petId: `pet-${id}`,
    petName: `Aşılı-${id}`,
    clientId: `client-${id}`,
    clientName: 'Sahip',
    vaccineDefinitionId: 'def-karma',
    vaccineName: 'Karma',
    notes: null,
    timeSpecified
});

describe('AppointmentsCalendarPageComponent — klinik panosu, hafta, doluluk haritası', () => {
    let getCalendarAppointments: Mock;
    let getCalendarVaccinations: Mock;
    let getCalendarSummary: Mock;
    let getVaccineSummary: Mock;
    let getCalendarCapacity: Mock;
    let todayVisits: unknown[];
    let navigate: Mock;
    let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let claims: Set<string>;
    let myClinics: { id: string; name: string }[];
    let selectClinic: Mock;
    let listSavedFilters: Mock;
    let resources: AppointmentResourceVm[];

    beforeEach(() => {
        claims = new Set([APPOINTMENTS_CREATE_CLAIM]);
        myClinics = [{ id: 'c1', name: 'Merkez' }];
        // Başarıda sayfa yeniden yüklenir; testte yanıt gelmez.
        selectClinic = vi.fn().mockReturnValue(NEVER);
        todayVisits = [];
        resources = [];
        localStorage.removeItem('vetinity.calendar.filters');
        localStorage.removeItem('vetinity.calendar.dayVets');
        ['railOpen', 'inClinicOpen', 'freeSlotOpen'].forEach((k) => localStorage.removeItem('vetinity.calendar.' + k));
    });

    afterEach(() => vi.useRealTimers());

    const create = (items: AppointmentCalendarItemVm[], query: Record<string, string> = {}, vaccines: VaccinationCalendarItemVm[] = [], enforceWorkingHours = true) => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-11-16T10:40:00+03:00'));
        getCalendarAppointments = vi.fn().mockReturnValue(of(items));
        getCalendarVaccinations = vi.fn().mockReturnValue(of(vaccines));
        getCalendarSummary = vi.fn().mockReturnValue(of(new Map([['2026-11-16', { dateKey: '2026-11-16', total: 3, dueToday: 3, upcoming: 0, overdue: 0, completed: 0 }]])));
        getVaccineSummary = vi.fn().mockReturnValue(of(new Map()));
        getCalendarCapacity = vi.fn().mockReturnValue(of(new Map([['2026-11-16', 6], ['2026-11-22', 0]])));
        listSavedFilters = vi.fn().mockReturnValue(of([]));
        params = new BehaviorSubject(convertToParamMap(query));
        TestBed.configureTestingModule({
            imports: [AppointmentsCalendarPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable(), snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AppointmentsService, useValue: { getCalendarAppointments, getCalendarSummary, getCalendarCapacity } },
                { provide: ClinicsService, useValue: { getWorkingHours: () => of(week), getAppointmentSettings: () => of({ slotIntervalMinutes: 15, enforceWorkingHours }) } },
                {
                    provide: VisitsService,
                    useValue: {
                        getVeterinarians: () =>
                            of([
                                { userId: 'v1', name: 'Dr. Ayşe' },
                                { userId: 'v2', name: 'Dr. Mert' }
                            ]),
                        getToday: () => of({ date: '2026-11-16', items: todayVisits, activeHospitalizations: [] })
                    }
                },
                { provide: AppointmentReasonsService, useValue: { list: () => of([]) } },
                { provide: AppointmentResourcesService, useValue: { list: () => of(resources) } },
                { provide: OnlineBookingService, useValue: { availability: () => of([]) } },
                { provide: VaccinationsService, useValue: { getCalendarVaccinations, getCalendarSummary: getVaccineSummary } },
                {
                    provide: AuthService,
                    useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', getUserId: () => 'v1', hasOperationClaim: (c: string) => claims.has(c), getMyClinics: () => of(myClinics), selectClinic }
                },
                { provide: ReportPreferencesService, useValue: { listSavedFilters } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as Mock;
        const fixture = TestBed.createComponent(AppointmentsCalendarPageComponent);

        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    };

    it('gün görünümü: gün adı başlıkta, hekim başına sütun, hekimsiz randevu için ayrı sütun; hafta aralığı tek istekte yüklenir', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1'), appt('b', '10:00', 'v2'), appt('c', '11:00', null)]);

        expect(el.querySelector('[data-testid="calendar-range-title"]')?.textContent).toContain('Bugün · Pazartesi');
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Ayşe', 'Mert', 'Hekim seçilmedi']);
        expect(el.querySelector('[data-testid="calendar-block-a"]')?.textContent).toContain('Hasta-a');
        expect(getCalendarAppointments).toHaveBeenCalledWith(
            expect.objectContaining({ dateFromUtc: '2026-11-15T21:00:00.000Z', dateToUtc: '2026-11-22T21:00:00.000Z', status: undefined, appointmentTypes: [], states: [], withoutVeterinarian: false })
        );
    });

    it('oda ve cihaz: kaynak yoksa sütun seçimi görünmez; seçilince sütunlar kaynaklar, kaynaksız randevu ayrı sütunda, boş hücre odayla yeni randevu', () => {
        const items = [appt('a', '09:00', 'v1', { roomResourceId: 'r1', roomResourceName: 'Ameliyathane', equipmentResourceId: 'e1' }), appt('b', '10:00', 'v2')];

        expect(create(items).el.querySelector('[data-testid="calendar-column-mode"]')).toBeNull();
        TestBed.resetTestingModule();

        resources = [
            { id: 'r1', clinicId: 'c1', name: 'Ameliyathane', type: 'Room', capacity: 1, sortOrder: 0, isActive: true },
            { id: 'e1', clinicId: 'c1', name: 'Ultrason', type: 'Equipment', capacity: 1, sortOrder: 0, isActive: true },
            { id: 'r2', clinicId: 'c1', name: 'Eski oda', type: 'Room', capacity: 1, sortOrder: 1, isActive: false }
        ];
        const { el, cmp } = create(items, { columns: 'resources' });

        expect(el.querySelector('[data-testid="calendar-column-mode"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="calendar-vet-bar"]')).toBeNull();
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Ameliyathane', 'Ultrason', 'Oda/cihaz yok']);
        expect(cmp.dayColumns()[0].blocks.map((b) => b.item.id)).toEqual(['a']);
        expect(cmp.dayColumns()[1].blocks.map((b) => b.item.id)).toEqual(['a']);

        el.querySelector<HTMLButtonElement>('[aria-label="Yeni randevu Ameliyathane 14:00"]')!.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '14:00', room: 'r1' } });

        cmp.changeColumnMode('vets');
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ columns: undefined }) });
    });

    it('oda ve cihaz: kapasitesi 1 olan kaynakta üst üste binen randevular çakışma; kapasite 2 iken değil', () => {
        resources = [
            { id: 'r1', clinicId: 'c1', name: 'Ameliyathane', type: 'Room', capacity: 1, sortOrder: 0, isActive: true },
            { id: 'r2', clinicId: 'c1', name: 'Serum', type: 'Room', capacity: 2, sortOrder: 1, isActive: true }
        ];
        const { cmp } = create([
            appt('a', '14:00', 'v1', { roomResourceId: 'r1' }),
            appt('b', '14:15', 'v2', { roomResourceId: 'r1' }),
            appt('c', '15:00', 'v1', { roomResourceId: 'r2' }),
            appt('d', '15:15', 'v2', { roomResourceId: 'r2' })
        ]);

        expect([...cmp.conflicts()].sort()).toEqual(['a', 'b']);
    });

    it('aynı hekimde üst üste binen randevular çakışma olarak işaretlenir; farklı hekimler işaretlenmez', () => {
        const { el, cmp } = create([appt('a', '14:00', 'v1'), appt('b', '14:15', 'v1'), appt('c', '14:00', 'v2')]);

        expect([...cmp.conflicts()].sort()).toEqual(['a', 'b']);
        expect(el.textContent).toContain('1 çakışma');
        expect(el.querySelector('[data-testid="calendar-block-c"]')?.textContent).not.toContain('Çakışma');
    });

    it('boş hücreye tıklayınca tarih, saat ve sütunun hekimi dolu Yeni randevu açılır', () => {
        const { el } = create([]);
        const cell = el.querySelector<HTMLButtonElement>('[aria-label="Yeni randevu Mert 14:00"]');

        cell!.click();

        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '14:00', vet: 'v2' } });
        expect(el.querySelector('[aria-label="Yeni randevu Mert 13:00"]')).toBeNull();
    });

    it('hafta görünümü: yedi gün sütunu, kartlar saat sırasıyla, gün başında aşı sayısı; kapalı gün; başlık o güne geçer', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, cmp } = create([appt('b', '15:00', 'v2'), appt('a', '09:00', 'v1')], { view: 'week' }, [vaccine('x', '2026-11-16', 'Overdue', 'Planned'), vaccine('y', '2026-11-16', 'DueToday')]);
        const days = cmp.weekDays();

        expect(days.map((d) => d.dateKey)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
        expect(days[6].closed).toBe(true);
        expect(days[0].vaccines).toEqual({ total: 2, overdue: 1 });
        expect(el.querySelector('[data-testid="calendar-week-vaccines-2026-11-16"]')?.getAttribute('aria-label')).toContain('1 gecikmiş');
        // Saat sırası: 09:00 önce; şimdi (10:40) ayracı arada.
        const week = el.querySelector('[data-testid="calendar-week"]')!.textContent!;

        expect(week.indexOf('Hasta-a')).toBeLessThan(week.indexOf('10:40'));
        expect(week.indexOf('10:40')).toBeLessThan(week.indexOf('Hasta-b'));
        el.querySelector<HTMLButtonElement>('[data-testid="calendar-column-2026-11-18"]')!.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/calendar'], { queryParams: { view: undefined, date: '2026-11-18' } });
    });

    it('çalışma saati kısıtı kapalıyken kapalı gün ve mola yok; gün ızgarası 00-24, bugün ilk çizimde şimdiden bir saat öncesi (09:00) görünür; telefonda boşluklar 08-20 penceresinde', async () => {
        const scrollIntoView = vi.fn();

        // jsdom kaydırma yapmaz; çağrı ve hedef saat sayılır.
        Element.prototype.scrollIntoView = scrollIntoView;
        const { fixture, cmp } = create([appt('a', '22:00', 'v1')], {}, [], false);

        await fixture.whenStable();

        expect(cmp.bounds()).toEqual({ start: 0, end: 1440 });
        expect(cmp.selectedWorking()).toEqual({ open: 0, close: 1439, breakStart: null, breakEnd: null });
        expect(cmp.weekDays().some((d) => d.closed)).toBe(false);
        expect(cmp.agendaGaps()).toEqual([{ start: 480, end: 1200 }]);
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect((scrollIntoView.mock.contexts[0] as HTMLElement).dataset['minute']).toBe('540');
        delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    /** R-01: mesai öncesine düşen bir randevu ızgarayı geceye uzatsa da görünüm mesai başlangıcından açılır. */
    it('başka günde mesai öncesi randevu varken ızgara ilk çizimde mesai başlangıcına (09:00) kayar', async () => {
        const scrollIntoView = vi.fn();

        Element.prototype.scrollIntoView = scrollIntoView;
        const { fixture, cmp } = create([appt('a', '06:00', 'v1', { scheduledAtUtc: '2026-11-17T03:00:00Z' })], { date: '2026-11-17' });

        await fixture.whenStable();

        expect(cmp.bounds().start).toBe(360);
        expect((scrollIntoView.mock.contexts[0] as HTMLElement).dataset['minute']).toBe('540');
        delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    it('telefon ajandası: randevular saat sırasıyla, herkesin boş olduğu aralıklar satır olarak', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1'), appt('b', '09:00', 'v2')]);

        expect(el.querySelector('[data-testid="agenda-item-a"]')).not.toBeNull();
        expect(cmp.agendaGaps()[0]).toEqual({ start: 570, end: 750 });
        el.querySelector<HTMLButtonElement>('[data-testid="agenda-gap"]')!.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], { queryParams: { date: '2026-11-16', time: '09:30', vet: 'v1' } });
    });

    it('aşı katmanı: saatli aşı "Aşılar" sütununda saatiyle, saatsiz başlıktaki listede; randevu sayılmaz', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, cmp } = create([appt('a', '09:00', 'v1')], {}, [
            vaccine('x', '2026-11-16', 'DueToday', 'NextDue', true),
            vaccine('y', '2026-11-16', 'Overdue', 'Planned'),
            vaccine('z', '2026-11-18', 'Upcoming', 'NextDue', true)
        ]);

        expect(getCalendarVaccinations).toHaveBeenCalledWith({ dateFromUtc: '2026-11-15T21:00:00.000Z', dateToUtc: '2026-11-22T21:00:00.000Z', states: [] });
        expect(el.querySelector('[data-testid="calendar-vaccine-column"]')?.textContent).toContain('1 saatsiz');
        // 09:00Z = 12:00 İstanbul.
        expect(el.querySelector('[data-testid="calendar-vaccine-x:NextDue"]')?.textContent).toContain('12:00');
        expect(el.querySelector('[data-testid="calendar-vaccine-z:NextDue"]')).toBeNull();
        expect(cmp.dayVaccines()!.untimed.map((v) => v.vaccinationId)).toEqual(['y']);
        // Bugün randevusu olmayan hekim gizli; aşı sütunu hekim sütunu değildir.
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Ayşe']);
        expect(cmp.hiddenIdleCount()).toBe(1);
        expect(cmp.conflicts().size).toBe(0);
        expect(cmp.summary().find((k) => k.key === 'vax')).toEqual(expect.objectContaining({ value: '2', label: 'aşı bekliyor', title: '0 uygulandı · 1 saatsiz' }));
        expect(el.querySelector('[data-testid="agenda-vaccines"]')?.textContent).toContain('Aşılı-x');
    });

    it('hekim seçici: "Yalnız benim" ve çipler sütunları süzer, seçim hatırlanır; "+N hekim" boş hekimi açar', () => {
        const { cmp } = create([appt('a', '09:00', 'v1'), appt('b', '10:00', 'v2'), appt('c', '11:00', null)]);

        cmp.toggleOnlyMine();
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Ayşe']);
        expect(JSON.parse(localStorage.getItem('vetinity.calendar.dayVets')!)).toEqual({ onlyMine: true, hidden: [] });

        cmp.toggleOnlyMine();
        cmp.toggleVet('v1');
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Mert', 'Hekim seçilmedi']);

        TestBed.resetTestingModule();
        const again = create([appt('b', '10:00', 'v2')]).cmp;

        expect(again.dayColumns().map((c) => c.title)).toEqual(['Mert']);
        expect(again.hiddenIdleCount()).toBe(1);
        // Çip sırası yok; "Hekimler 1/2" menüsü (R-02).
        expect(document.querySelector('[data-testid="calendar-vet-bar"]')).toBeNull();
        expect(document.querySelector('[data-testid="calendar-vet-menu"]')?.textContent).toContain('Hekimler 1/2');
        again.showIdleVets.set(true);
        expect(again.vetChips().map((v) => [v.name, v.on])).toEqual([
            ['Ayşe', false],
            ['Mert', true]
        ]);
    });

    it('"Klinikte" paneli kabul kuyruğundan: bekleyen ve muayenedeki; kartta durum rozeti', () => {
        claims.add(VISITS_READ_CLAIM);
        todayVisits = [
            { key: 'k1', appointmentId: 'a', petName: 'Hasta-a', clientName: 'Sahip', careStatus: 'Waiting', arrivedAtUtc: '2026-11-16T07:32:00Z', responsibleVeterinarianName: null, appointmentReasonName: null },
            { key: 'k2', appointmentId: 'b', petName: 'Hasta-b', clientName: 'Sahip', careStatus: 'InProgress', arrivedAtUtc: '2026-11-16T07:00:00Z', responsibleVeterinarianName: 'Dr. Mert', appointmentReasonName: null }
        ];
        const { fixture, el, cmp } = create([appt('a', '10:30', 'v1'), appt('b', '10:00', 'v2')]);

        expect(cmp.inClinic()!.map((p) => p.status)).toEqual(['Muayenede · Dr. Mert', 'Bekliyor 8 dk']);
        // 1440 px altında (test 800 px) panel kapalı gelir; "Klinikte 2" düğmesi ızgaranın üstüne açar.
        expect(el.querySelector('[data-testid="calendar-in-clinic"]')).toBeNull();
        const clinicButton = el.querySelector<HTMLButtonElement>('[data-testid="calendar-panel-clinic"]')!;

        expect(clinicButton.textContent).toContain('2');
        clinicButton.click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="calendar-overlay-panel"] [data-testid="calendar-in-clinic"]')?.textContent).toContain('2 hasta');
        expect(el.querySelector('[data-testid="calendar-block-a"]')?.textContent).toContain('Bekliyor · 8 dk');
        expect(el.querySelector('[data-testid="calendar-block-b"]')?.textContent).toContain('Muayenede');
        expect(cmp.summary().find((k) => k.key === 'clinic')?.title).toBe('1 bekliyor · 1 muayenede');

        el.querySelector<HTMLButtonElement>('[data-testid="calendar-panel-free"]')!.click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="calendar-in-clinic"]')).toBeNull();
        expect(el.querySelector('[data-testid="calendar-overlay-panel"] [data-testid="free-slot-finder"]')).not.toBeNull();
        el.querySelector<HTMLButtonElement>('[data-testid="free-slot-close"]')!.click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="calendar-overlay-panel"]')).toBeNull();
    });

    it('1440 px ve üstünde sağ panel ızgaranın yanında durur; üstteki düğmeler çıkmaz (R-02)', () => {
        claims.add(VISITS_READ_CLAIM);
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList);
        const { el } = create([appt('a', '10:30', 'v1')]);

        expect(el.querySelector('[data-testid="calendar-panel-clinic"]')).toBeNull();
        expect(el.querySelector('[data-testid="calendar-panel-free"]')).toBeNull();
        expect(el.querySelector('aside [data-testid="calendar-in-clinic"]')).not.toBeNull();
        expect(el.querySelector('aside [data-testid="free-slot-finder"]')).not.toBeNull();
    });

    it('filtreler adres çubuğundan sunucuya gider: tür ve durum; "Planlı aşılar" seçili değilse aşı istenmez', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, cmp } = create([], { types: '2,5', states: 'Upcoming,DueToday', vet: 'none' }, [vaccine('x', '2026-11-16', 'DueToday')]);

        expect(getCalendarAppointments).toHaveBeenCalledWith(
            expect.objectContaining({ appointmentTypes: [2, 5], states: ['DueToday', 'Upcoming'], withoutVeterinarian: true, veterinarianUserId: undefined })
        );
        expect(getCalendarVaccinations).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="calendar-vaccine-column"]')).toBeNull();
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Hekim seçilmedi']);
        expect(cmp.agendaGaps()).toEqual([]);
    });

    it('"Planlı aşılar" ve durum seçiliyse aşılar durum filtresiyle istenir; yalnız aşı seçiliyse randevu istenmez', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        create([], { types: 'asi', states: 'Overdue' });

        expect(getCalendarAppointments).not.toHaveBeenCalled();
        expect(getCalendarVaccinations).toHaveBeenCalledWith(expect.objectContaining({ states: ['Overdue'] }));
    });

    it('belirli bir hekim seçiliyken aşı istenmez (aşının hekimi yok) ve yalnız o hekimin sütunu çizilir', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { cmp } = create([appt('a', '09:00', 'v1')], { vet: 'v1' });

        expect(getCalendarAppointments).toHaveBeenCalledWith(expect.objectContaining({ veterinarianUserId: 'v1', withoutVeterinarian: false }));
        expect(getCalendarVaccinations).not.toHaveBeenCalled();
        expect(cmp.dayColumns().map((c) => c.title)).toEqual(['Ayşe']);
    });

    it('filtre değişimi adres çubuğuna yazılır ve hatırlanır; adres boşsa son seçim geri yüklenir', () => {
        const { cmp } = create([]);

        expect(cmp.activeFilterCount()).toBe(0);

        cmp.applyFilters({ vet: null, types: ['1'], states: ['Overdue'] });
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ types: '1', states: 'Overdue', vet: undefined }) });
        expect(localStorage.getItem('vetinity.calendar.filters')).toContain('types=1');

        TestBed.resetTestingModule();
        create([]);
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ types: '1', states: 'Overdue' }), replaceUrl: true });
    });

    it('kayıtlı filtre (APPT-026): yalnız filtre parametreleri kaydedilir, gün ve görünüm kaydedilmez; uygulanınca filtreler değişir, gün ve görünüm kalır', () => {
        const { fixture, cmp } = create([], { view: 'week', date: '2026-11-18', types: 'asi', states: 'Overdue' });

        expect(cmp.savedFilterSource.savedFilterValues()).toEqual({ types: 'asi', states: 'Overdue' });

        cmp.savedFilterSource.applySavedFilterValues({ vet: 'none', states: 'DueToday,Bad' });
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/calendar'], {
            queryParams: { view: 'week', date: '2026-11-18', vet: 'none', types: undefined, states: 'DueToday' }
        });

        cmp.filtersOpen.set(true);
        fixture.detectChanges();
        expect(listSavedFilters).toHaveBeenCalledWith('screens.appointments-calendar');
    });

    it('şube seçimi yalnız birden çok klinikte görünür ve aktif kliniği değiştirir', () => {
        myClinics = [{ id: 'c1', name: 'Merkez' }];
        expect(create([]).el.querySelector('#calFltClinicInput')).toBeNull();

        TestBed.resetTestingModule();
        myClinics = [
            { id: 'c1', name: 'Merkez' },
            { id: 'c2', name: 'Şube 2' }
        ];
        const { fixture, el, cmp } = create([]);

        cmp.filtersOpen.set(true);
        fixture.detectChanges();
        expect(el.querySelector('#calFltClinic')?.textContent ?? el.textContent).toContain('Klinik');
        cmp.switchClinic({ id: 'c2', name: 'Şube 2' });
        expect(selectClinic).toHaveBeenCalledWith('c2', 'Şube 2');
    });

    it('aşı yetkisi yoksa "Planlı aşılar" seçeneği yok ve aşı istenmez', () => {
        const { cmp } = create([]);

        expect(getCalendarVaccinations).not.toHaveBeenCalled();
        expect(cmp.canReadVaccinations).toBe(false);
    });

    it('ay görünümü: ızgaranın tüm günleri tek özet ve kapasite isteğinde, filtrelerle; kayıt çekilmez; doluluk ve kapalı gün; hücre o günü açar', () => {
        claims.add(VACCINATIONS_READ_CLAIM);
        const { el, cmp } = create([], { view: 'month', states: 'DueToday', vet: 'none' });

        expect(cmp.rangeTitle()).toBe('Kasım 2026');
        expect(getCalendarSummary).toHaveBeenCalledWith(
            expect.objectContaining({ dateFromUtc: '2026-10-25T21:00:00.000Z', dateToUtc: '2026-12-06T21:00:00.000Z', states: ['DueToday'], withoutVeterinarian: true })
        );
        expect(getVaccineSummary).toHaveBeenCalledWith({ dateFromUtc: '2026-10-25T21:00:00.000Z', dateToUtc: '2026-12-06T21:00:00.000Z', states: ['DueToday'] });
        expect(getCalendarAppointments).not.toHaveBeenCalled();
        expect(getCalendarCapacity).toHaveBeenCalledWith({ dateFromUtc: '2026-10-25T21:00:00.000Z', dateToUtc: '2026-12-06T21:00:00.000Z', veterinarianUserId: undefined });
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-16"]')?.getAttribute('aria-label')).toBe('16, 3 randevu, yüzde 50 dolu');
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-22"]')?.textContent).toContain('kapalı');

        el.querySelector<HTMLButtonElement>('[data-testid="calendar-month-day-2026-11-20"]')!.click();
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ view: undefined, date: '2026-11-20', states: 'DueToday', vet: 'none' }) });
    });

    it('ay görünümünde önceki/sonraki bir ay kaydırır; görünüm adreste "month"', () => {
        const { cmp } = create([], { view: 'month' });

        cmp.previous();
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ view: 'month', date: '2026-10-01' }) });
        cmp.next();
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/calendar'], { queryParams: expect.objectContaining({ view: 'month', date: '2026-12-01' }) });
    });

    it('sonraki aşıdan "Aşıyı yap" hasta ve aşı dolu yeni aşı; "Randevu ver" aşılama türü ve not dolu yeni randevu açar', () => {
        claims.add(VACCINATIONS_READ_CLAIM).add(VACCINATIONS_CREATE_CLAIM);
        const { cmp } = create([]);
        const v = vaccine('x', '2026-11-18', 'Upcoming');

        expect(cmp.canApplyVaccine(v)).toBe(true);
        cmp.applyVaccine(v);
        expect(navigate).toHaveBeenCalledWith(['/panel/vaccinations/new'], {
            queryParams: expect.objectContaining({ clientId: 'client-x', petId: 'pet-x', vaccineDefinitionId: 'def-karma', status: 1 })
        });

        cmp.bookForVaccine(v);
        expect(navigate).toHaveBeenCalledWith(['/panel/appointments/new'], {
            queryParams: expect.objectContaining({ clientId: 'client-x', petId: 'pet-x', date: '2026-11-18', type: 1, notes: 'Aşı: Karma' })
        });

        cmp.bookForVaccine(vaccine('old', '2026-11-10', 'Overdue'));
        expect(navigate).toHaveBeenLastCalledWith(['/panel/appointments/new'], { queryParams: expect.objectContaining({ date: undefined }) });
    });

    it('randevuya tıklayınca sayfadan çıkılmaz; ayrıntı pencerede açılır, düzenleme aynı pencerede', () => {
        const { cmp } = create([appt('a', '09:00', 'v1')]);

        cmp.openDetail('a');
        expect(cmp.dialog()).toEqual({ id: 'a', mode: 'detail' });
        expect(navigate).not.toHaveBeenCalled();
    });

    it('pencere kapanınca takvim yalnız değişiklik olduysa yenilenir', () => {
        const { cmp } = create([appt('a', '09:00', 'v1')]);

        cmp.dialog.set({ id: 'a', mode: 'detail' });
        cmp.closeDialog();
        expect(getCalendarAppointments).toHaveBeenCalledTimes(1);

        cmp.dialog.set({ id: 'a', mode: 'detail' });
        cmp.calendarDirty = true;
        cmp.closeDialog();
        expect(getCalendarAppointments).toHaveBeenCalledTimes(2);
        expect(cmp.dialog()).toBeNull();
    });

    it('zamanı geçmiş preset: eski gruplu liste', () => {
        const { el, cmp } = create([appt('a', '09:00', 'v1')], { preset: 'overdue-appointments' });

        expect(cmp.isPresetDateGroupedMode()).toBe(true);
        expect(el.querySelector('[data-testid="calendar-grid"]')).toBeNull();
        expect(el.textContent).toContain('Zamanı geçmiş randevular filtreleniyor.');
    });
});
