import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { TodayHospitalizationVm, TodayItemVm, TodayVm, VisitVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { TodayPageComponent } from './today-page.component';

const item = (over: Partial<TodayItemVm> = {}): TodayItemVm => ({
    key: 'v1',
    visitId: 'v1',
    appointmentId: null,
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    clientPhone: null,
    scheduledAtUtc: null,
    arrivedAtUtc: new Date(Date.now() - 12 * 60_000).toISOString(),
    careStatus: 'Waiting',
    appointmentStatus: null,
    responsibleVeterinarianName: 'Dr. Ayşe',
    isCarriedOver: false,
    chargedAmount: null,
    allocatedAmount: null,
    outstandingAmount: null,
    clientOutstandingAmount: null,
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false,
    ...over
});

const visitVm: VisitVm = {
    id: 'v1',
    clinicId: 'c1',
    petId: 'p1',
    appointmentId: null,
    responsibleVeterinarianUserId: null,
    responsibleVeterinarianName: null,
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'InProgress',
    isVoided: false,
    isUrgent: false
};

describe('TodayPageComponent', () => {
    let visits: jasmine.SpyObj<VisitsService>;
    let toasts: jasmine.Spy;

    const create = async (claims: string[], today: TodayVm, vetUserId: string | null = null): Promise<ComponentFixture<TodayPageComponent>> => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['getToday', 'startVisit', 'completeVisit', 'getVeterinarians', 'getCurrentVeterinarianUserId']);
        visits.getToday.and.returnValue(of(today));
        visits.getVeterinarians.and.returnValue(of([]));
        visits.getCurrentVeterinarianUserId.and.returnValue(of(vetUserId));

        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(TodayPageComponent);
        toasts = spyOn(fixture.debugElement.injector.get(MessageService), 'add');
        fixture.detectChanges();
        return fixture;
    };

    const text = (f: ComponentFixture<TodayPageComponent>) => (f.nativeElement as HTMLElement).textContent ?? '';
    const buttons = (f: ComponentFixture<TodayPageComponent>) =>
        Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

    it('gruplar, hekim adı ve bekleme süresi gösterilir; ödeme / açık iş göstergesi yoktur', async () => {
        const f = await create(['Visits.Read'], {
            date: '2026-10-10',
            activeHospitalizations: [],
            items: [item({ key: 'w' }), item({ key: 'c', careStatus: 'Completed' })]
        });
        const t = text(f);
        expect(t).toContain('Bekliyor');
        expect(t).toContain('Tamamlandı');
        expect(t).toContain('Dr. Ayşe');
        expect(t).toContain('12 dk');
        expect(t).not.toMatch(/açık iş/i);
    });

    it('ziyaret ücret/ödenen/kalan ve müşteri borcu gösterilir; yatış rozeti bakım durumundan ayrıdır', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [
                item({ chargedAmount: 1000, allocatedAmount: 400, outstandingAmount: 600, clientOutstandingAmount: 900, hasActiveHospitalization: true }),
                item({ key: 'x', visitId: 'x' })
            ]
        });
        const t = text(f);
        expect(t).toContain('Kısmi ödendi');
        expect(t).toContain('Ücret ₺1.000,00');
        expect(t).toContain('Ödenen ₺400,00');
        expect(t).toContain('Kalan ₺600,00');
        expect(t).toContain('Müşteri borcu ₺900,00');
        expect(t).toContain('Yatışta');
        expect(t).toContain('Bekliyor');
        expect(t).not.toContain('Ödeme kaydı');
        expect((f.nativeElement as HTMLElement).querySelector('[aria-label="2 kayıt"]')).not.toBeNull();
    });

    describe('aktif yatışlar bölümü', () => {
        const hosp = (over: Partial<TodayHospitalizationVm> = {}): TodayHospitalizationVm => ({
            hospitalizationId: 'h1',
            petId: 'p1',
            petName: 'Pamuk',
            clientName: 'Ali Veli',
            admittedAtUtc: new Date(Date.now() - 3 * 86_400_000 - 60_000).toISOString(),
            plannedDischargeAtUtc: null,
            ...over
        });
        const section = (f: ComponentFixture<TodayPageComponent>) => (f.nativeElement as HTMLElement).querySelector('section[aria-label="Aktif yatışlar"]');

        it('hayvan, sahip, giriş ve kaç gündür yatışta olduğu gösterilir; Hospitalizations.Read varsa detay bağlantısı verir', async () => {
            const f = await create(['Visits.Read', 'Hospitalizations.Read'], { date: 'd', items: [], activeHospitalizations: [hosp({ plannedDischargeAtUtc: '2026-10-20T09:00:00Z' })] });
            const s = section(f);
            expect(s?.textContent).toContain('Pamuk');
            expect(s?.textContent).toContain('Ali Veli');
            expect(s?.textContent).toContain('3 gün');
            expect(s?.textContent).toContain('Planlı taburcu');
            expect(s?.querySelector('a')?.getAttribute('href')).toBe('/panel/hospitalizations/h1');
        });

        it('Hospitalizations.Read yoksa bağlantı gösterilmez', async () => {
            const f = await create(['Visits.Read'], { date: 'd', items: [], activeHospitalizations: [hosp()] });
            expect(section(f)).not.toBeNull();
            expect(section(f)?.querySelector('a')).toBeNull();
        });

        it('aktif yatış yoksa bölüm görünmez', async () => {
            const f = await create(['Visits.Read', 'Hospitalizations.Read'], { date: 'd', items: [item({})], activeHospitalizations: [] });
            expect(section(f)).toBeNull();
        });
    });

    it('tutarlar null ise (Charges.Read yok) hiçbir tutar veya ödeme rozeti gösterilmez', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({})] });
        const t = text(f);
        expect(t).not.toContain('Ödenmedi');
        expect(t).not.toContain('Ücret yok');
        expect(t).not.toContain('Müşteri borcu');
        expect(t).not.toContain('Ödeme kaydı');
    });

    it('ücreti olmayan ziyarette "Ücret yok" rozeti; ödenmiş ziyarette "Ödendi" ve müşteri borcu yoksa borç satırı çıkmaz', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [
                item({ key: 'a', chargedAmount: 0, allocatedAmount: 0, outstandingAmount: 0, clientOutstandingAmount: 0 }),
                item({ key: 'b', visitId: 'b', chargedAmount: 500, allocatedAmount: 500, outstandingAmount: 0, clientOutstandingAmount: 0 })
            ]
        });
        const t = text(f);
        expect(t).toContain('Ücret yok');
        expect(t).toContain('Ödendi');
        expect(t).not.toContain('Müşteri borcu');
    });

    it('telefon okunabilir biçimde, hekim yoksa Atanmadı gösterilir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ clientPhone: '905439580091', responsibleVeterinarianName: null })] });
        const t = text(f);
        expect(t).toContain('+90 543 958 00 91');
        expect(t).not.toContain('905439580091');
        expect(t).toContain('Atanmadı');
    });

    it('hasta ve sahip adı tek satırda kesilmez: 2 satıra sarar, tam ad ipucunda; telefon tek satır', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ petName: 'Karabaş Uzun Adlı Köpek', clientName: 'TEST Mehmet Yıldızoğlu Uzunadlı', clientPhone: '905439580091' })]
        });
        const root = f.nativeElement as HTMLElement;
        const pet = root.querySelector<HTMLElement>('[title="Karabaş Uzun Adlı Köpek"]');
        const client = root.querySelector<HTMLElement>('[title="TEST Mehmet Yıldızoğlu Uzunadlı"]');
        for (const el of [pet, client]) {
            expect(el).not.toBeNull();
            expect(el!.classList).toContain('line-clamp-2');
            expect(el!.classList).not.toContain('truncate');
        }
        expect(Array.from(root.querySelectorAll('div')).find((d) => d.textContent?.trim() === '+90 543 958 00 91')?.classList).toContain('whitespace-nowrap');
    });

    it('süre sütunu grup bazlı: Bekliyor için Bekleme, Devam ediyor için Süre, tamamlananlarda yok', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ key: 'w' }), item({ key: 'i', careStatus: 'InProgress' }), item({ key: 'c', careStatus: 'Completed' })]
        });
        const headers = Array.from((f.nativeElement as HTMLElement).querySelectorAll('section')).map((s) =>
            Array.from(s.querySelectorAll('th')).map((th) => th.textContent?.trim())
        );
        expect(headers[0]).toContain('Bekleme');
        expect(headers[1]).toContain('Süre');
        expect(headers[1]).not.toContain('Bekleme');
        expect(headers[2]).not.toContain('Bekleme');
        expect(headers[2]).not.toContain('Süre');
    });

    it('boş liste boş durumu gösterir', async () => {
        const f = await create(['Visits.Read'], { date: '2026-10-10', activeHospitalizations: [], items: [] });
        expect(text(f)).toContain('Bugün için randevu veya gelen hasta yok.');
    });

    it('ilk yükleme hatası hata durumunu gösterir', async () => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['getToday', 'getCurrentVeterinarianUserId']);
        visits.getCurrentVeterinarianUserId.and.returnValue(of(null));
        visits.getToday.and.returnValue(throwError(() => new Error('Bugün listesi yüklenemedi.')));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: AppointmentsService, useValue: {} },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } }
            ]
        }).compileComponents();
        const f = TestBed.createComponent(TodayPageComponent);
        f.detectChanges();
        expect(text(f)).toContain('Bugün listesi yüklenemedi.');
    });

    it('Düzelt yalnızca Visits.Correct yetkisi olana görünür', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item()] };
        const without = await create(['Visits.Read', 'Visits.Update'], today);
        const keys = (f: ComponentFixture<TodayPageComponent>) => f.componentInstance.secondaryActionsOf(today.items[0], f.componentInstance.actionsOf(today.items[0])).map((a) => a.key);
        expect(keys(without)).not.toContain('correct');
        expect(buttons(without)).toContain('Başlat');
        TestBed.resetTestingModule();

        const withCorrect = await create(['Visits.Read', 'Visits.Update', 'Visits.Correct'], today);
        expect(keys(withCorrect)).toContain('correct');
    });

    it('Ödeme al yalnızca Payments.Create yetkisiyle görünür ve müşteri + geliş bağlamıyla ödeme formuna gider', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7' })] };
        const keys = (f: ComponentFixture<TodayPageComponent>) => f.componentInstance.secondaryActionsOf(today.items[0], f.componentInstance.actionsOf(today.items[0])).map((a) => a.key);
        const without = await create(['Visits.Read', 'Visits.Update'], today);
        expect(keys(without)).not.toContain('collectPayment');
        TestBed.resetTestingModule();

        const f = await create(['Visits.Read', 'Payments.Create'], today);
        expect(keys(f)).toContain('collectPayment');
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        f.componentInstance.openPayment(today.items[0]);
        expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
    });

    it('menüden Ödeme al, menü kapanana (onHide) kadar sayfa değiştirmez', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7' })] };
        const f = await create(['Visits.Read', 'Payments.Create'], today);
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const c = f.componentInstance;
        c.openRowMenu(new Event('click'), today.items[0], [{ key: 'collectPayment', label: 'Ödeme al', icon: 'pi pi-wallet' } as never]);
        c.rowMenuItems()[0].command?.({});
        expect(navigate).not.toHaveBeenCalled();
        c.openPendingPayment();
        expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
        c.openPendingPayment();
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('Geldi ve Randevusuz geliş Visits.Create ister; Muayene aç Examinations.Create ister', async () => {
        const planned = item({ key: 'a1', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T07:00:00Z' });
        const waiting = item({ key: 'w' });
        const readOnly = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [planned, waiting] });
        expect(buttons(readOnly)).not.toContain('Geldi');
        expect(buttons(readOnly)).not.toContain('Randevusuz geliş');
        expect(buttons(readOnly)).not.toContain('Muayene aç');
        TestBed.resetTestingModule();

        const full = await create(['Visits.Read', 'Visits.Create', 'Examinations.Create'], { date: 'd', activeHospitalizations: [], items: [planned, waiting] });
        expect(buttons(full)).toContain('Geldi');
        expect(buttons(full)).toContain('Randevusuz geliş');
        expect(buttons(full)).toContain('Muayene aç');
    });

    it('muayeneye geçiş: visitId ile hasta bağlamı query olarak taşınır', async () => {
        const f = await create(['Visits.Read', 'Examinations.Create'], { date: 'd', activeHospitalizations: [], items: [item()] });
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        f.componentInstance.openExamination(item());

        expect(navigate).toHaveBeenCalledOnceWith(['/panel/examinations/new'], {
            queryParams: { visitId: 'v1', clientId: 'cl1', petId: 'p1' }
        });
    });

    it('başlat: yanıt gelmeden ikinci tıklama ikinci istek üretmez; sonra liste yenilenir', async () => {
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()] });
        const pending = new Subject<VisitVm>();
        visits.startVisit.and.returnValue(pending);
        const row = item();

        f.componentInstance.transition(row, 'start');
        f.componentInstance.transition(row, 'start');
        expect(visits.startVisit).toHaveBeenCalledTimes(1);
        expect(f.componentInstance.isBusy(row)).toBeTrue();

        const callsBefore = visits.getToday.calls.count();
        pending.next(visitVm);
        pending.complete();
        expect(f.componentInstance.isBusy(row)).toBeFalse();
        expect(visits.getToday.calls.count()).toBe(callsBefore + 1);
    });

    it('başlatma hatasında hata toast ı gösterilir ve liste yenilenir', async () => {
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()] });
        visits.startVisit.and.returnValue(throwError(() => new Error('Bu geçiş yapılamaz.')));
        const callsBefore = visits.getToday.calls.count();

        f.componentInstance.transition(item(), 'start');

        expect(toasts.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ severity: 'error', detail: 'Bu geçiş yapılamaz.' }));
        expect(visits.getToday.calls.count()).toBe(callsBefore + 1);
    });

    it('created:false yanıtı hata değil bilgi mesajıdır', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], { date: 'd', activeHospitalizations: [], items: [] });
        f.componentInstance.onArrived({ created: false, visit: { ...visitVm } });

        expect(toasts.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ severity: 'info', summary: 'Açık geliş kaydı zaten var.' }));
    });

    it('otomatik yenileme hatasında eski liste kalır ve uyarı gösterilir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item()] });
        visits.getToday.and.returnValue(throwError(() => new Error('x')));
        f.componentInstance.refresh('silent');
        f.detectChanges();

        expect(text(f)).toContain('Pamuk');
        expect(text(f)).toContain('Liste güncellenemedi');
    });
    describe('grup tabloları ve rozetler', () => {
        const noShowItem = (over: Partial<TodayItemVm> = {}) =>
            item({ key: 'n', visitId: null, appointmentId: 'a1', careStatus: null, arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T07:00:00Z', appointmentStatus: 'NoShow', ...over });
        const section = (f: ComponentFixture<TodayPageComponent>, title: string) =>
            (f.nativeElement as HTMLElement).querySelector(`section[aria-label="${title}"]`) as HTMLElement;

        it('tüm gruplar aynı sütun genişliklerini ve sabit tablo düzenini kullanır; başlık sayısı eşit', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'w' }), item({ key: 'p', careStatus: 'InProgress' }), item({ key: 'c', careStatus: 'Completed' }), noShowItem()] });
            const tables = Array.from((f.nativeElement as HTMLElement).querySelectorAll('section table'));
            expect(tables.length).toBe(4);
            const widths = tables.map((t) => Array.from(t.querySelectorAll('colgroup col')).map((c) => (c as HTMLElement).className).join('|'));
            expect(new Set(widths).size).toBe(1);
            expect(widths[0].split('|').length).toBe(8);
            for (const t of tables) {
                expect(getComputedStyle(t).tableLayout).toBe('fixed');
                expect(t.querySelectorAll('thead th').length).toBe(8);
            }
        });

        it('Gelmedi grubunda ödeme rozeti ve Durum: Gelmedi tekrarı yok; planlanan saat görünür', async () => {
            const money = { chargedAmount: 1000, allocatedAmount: 0, outstandingAmount: 1000, clientOutstandingAmount: 1000 };
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [noShowItem(money), item({ key: 'w', ...money })] });
            const body = section(f, 'Gelmedi').querySelector('tbody')!.textContent ?? '';
            expect(body).not.toContain('Ödenmedi');
            expect(body).not.toContain('Müşteri borcu');
            expect(body).not.toContain('Gelmedi');
            expect(body).toContain('Randevu');
            expect(section(f, 'Bekliyor').textContent).toContain('Ödenmedi');
        });

        it('iki kip: Hekim ve Ödeme sütunları dar kipte gizlenir; hekim adı Hasta hücresine, ödeme/yatış rozeti Durum hücresine taşınır; başlıklar ve rozetler tek satır', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'w', isCarriedOver: true, hasActiveHospitalization: true, chargedAmount: 1000, allocatedAmount: 0, outstandingAmount: 1000 })] });
            const host = f.nativeElement as HTMLElement;
            const hideCompact = '@max-[76rem]:hidden';
            const ths = Array.from(host.querySelectorAll('thead th'));
            expect(ths.map((th) => th.classList.contains('whitespace-nowrap'))).toEqual([true, true, true, true, true, true, true, false]);
            expect(ths[3].textContent?.trim()).toBe('Hekim');
            expect(ths[3].className).toContain(hideCompact);
            expect(ths[5].textContent?.trim()).toBe('Ödeme / yatış');
            expect(ths[5].className).toContain(hideCompact);
            const cols = Array.from(host.querySelectorAll('colgroup col')).map((c) => c.className);
            expect(cols[3]).toContain(hideCompact);
            expect(cols[5]).toContain(hideCompact);
            const cells = Array.from(host.querySelectorAll<HTMLTableCellElement>('tbody tr:first-child td'));
            expect(cells[3].className).toContain(hideCompact); // Hekim
            expect(cells[5].className).toContain(hideCompact); // Ödeme / yatış
            expect(cells[4].className).toContain('whitespace-nowrap'); // Durum: Önceki günden bölünmez
            // dar kip yedekleri yalnız dar kipte görünür (geniş kipte @min-[76rem]:hidden)
            const compactOnly = Array.from(host.querySelectorAll('tbody *')).filter((e) => e.classList.contains('@min-[76rem]:hidden'));
            expect(compactOnly.some((e) => e.textContent?.includes('Dr. Ayşe'))).toBeTrue();
            expect(compactOnly.some((e) => e.textContent?.includes('Ödenmedi'))).toBeTrue();
            expect(compactOnly.some((e) => e.textContent?.includes('Yatışta'))).toBeTrue();
        });

        it('uzun ad kısaltılır ve tam adı ipucuyla (title) gösterilir: Sahip, Hasta, Hekim', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'w', clientName: 'Çok Uzun İsimli Müşteri Soyadıgeçen', petName: 'Çok uzun hasta adı', responsibleVeterinarianName: 'Dr. Çok Uzun Hekim Adı' })] });
            const host = f.nativeElement as HTMLElement;
            const titled = Array.from(host.querySelectorAll('tbody [title]')).map((e) => e.getAttribute('title'));
            expect(titled).toContain('Çok Uzun İsimli Müşteri Soyadıgeçen');
            expect(titled).toContain('Çok uzun hasta adı');
            expect(titled).toContain('Dr. Çok Uzun Hekim Adı');
        });

        it('eylem düğmeleri sabit ızgara yuvalarında: birincil=1, ikincil=2, acil=3, ⋯=4 (satırlar arası hiza; konum tarayıcıda ölçülür, Tailwind testte yüklü değil)', async () => {
            const claims = ['Visits.Read', 'Visits.Create', 'Visits.Update', 'Visits.Correct', 'Examinations.Create'];
            const planned = item({ key: 'p', visitId: null, appointmentId: 'a1', careStatus: null, arrivedAtUtc: null, scheduledAtUtc: new Date(Date.now() + 3_600_000).toISOString(), appointmentStatus: 'Scheduled' });
            const f = await create(claims, { date: 'd', activeHospitalizations: [], items: [item({ key: 'w' }), item({ key: 'i', careStatus: 'InProgress' }), planned] });
            const host = f.nativeElement as HTMLElement;
            const slotOf = (label: string) => Array.from(host.querySelectorAll('tbody p-button')).filter((p) => p.textContent?.trim() === label).map((p) => Array.from(p.classList).find((c) => c.startsWith('col-start-')));
            expect(slotOf('Muayene aç')).toEqual(['col-start-1', 'col-start-1']);
            expect(slotOf('Geldi')).toEqual(['col-start-1']);
            expect(slotOf('Başlat')).toEqual(['col-start-2']);
            expect(slotOf('Tamamla')).toEqual(['col-start-2']);
            const grid = host.querySelector('tbody td:last-child > div') as HTMLElement;
            expect(grid.className).toContain('grid-cols-[7.5rem_6rem_1.85rem_1.85rem]');
            expect(grid.className).toContain('@max-[50rem]:grid-cols-[2.5rem_2.5rem_1.85rem_1.85rem]'); // dar kip: yalnız ikon
            const icons = Array.from(host.querySelectorAll('tbody p-button')).filter((p) => p.classList.contains('col-start-3') || p.classList.contains('col-start-4'));
            expect(icons.length).toBeGreaterThan(1);
        });

        it('Gelmedi grubunda yatış rozeti yine görünür', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [noShowItem({ hasActiveHospitalization: true })] });
            expect(section(f, 'Gelmedi').textContent).toContain('Yatışta');
        });

        it('Önceki günden rozeti sönük (secondary) ve ipucu metni var', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ isCarriedOver: true })] });
            const tagHost = Array.from((f.nativeElement as HTMLElement).querySelectorAll('span[title]')).find((e) => e.textContent?.includes('Önceki günden')) as HTMLElement;
            expect(tagHost).toBeDefined();
            expect(tagHost.getAttribute('title')).toBe('Önceki günden kalan açık geliş; tamamlayın veya hatalı işaretleyin');
            const tag = tagHost.querySelector('.p-tag')!;
            expect(tag.classList.contains('p-tag-secondary')).toBeTrue();
            expect(tag.classList.contains('p-tag-contrast')).toBeFalse();
        });

        it('12 saati aşan açık gelişte sönük "Unutulmuş olabilir" ipucu; kısa sürede ve tamamlananda yok', async () => {
            const old = new Date(Date.now() - 13 * 3_600_000).toISOString();
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'old', arrivedAtUtc: old }), item({ key: 'new' }), item({ key: 'done', careStatus: 'Completed', arrivedAtUtc: old })] });
            const hints = ((f.nativeElement as HTMLElement).textContent ?? '').match(/Unutulmuş olabilir/g) ?? [];
            expect(hints.length).toBe(1);
        });
    });

    describe('dar ekranda kart düzeni', () => {
        const narrow = (matches: boolean) =>
            spyOn(window, 'matchMedia').and.returnValue({ matches, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList);
        const today: TodayVm = {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ key: 'a', clientPhone: '905439580091', outstandingAmount: 600, chargedAmount: 1000, allocatedAmount: 400 }), item({ key: 'b', petName: 'Boncuk' })]
        };

        it('dar ekranda satır başına bir kart; tablo yok; alanlar ve eylemler kartta', async () => {
            narrow(true);
            const f = await create(['Visits.Read', 'Visits.Update', 'Examinations.Create'], today);
            const root = f.nativeElement as HTMLElement;
            const cards = Array.from(root.querySelectorAll('[data-testid="today-card"]'));
            expect(cards.length).toBe(2);
            expect(root.querySelector('table')).toBeNull();
            const t = cards[0].textContent ?? '';
            for (const part of ['Geliş', 'Pamuk', 'Kedi', 'Ali Veli', 'Dr. Ayşe', 'Bekliyor', 'Kısmi ödendi', 'Başlat', 'Muayene aç']) {
                expect(t).toContain(part);
            }
            expect(t).toMatch(/12 dk/);
        });

        it('geniş ekranda tablo düzeni değişmez', async () => {
            narrow(false);
            const f = await create(['Visits.Read'], today);
            const root = f.nativeElement as HTMLElement;
            expect(root.querySelector('[data-testid="today-card"]')).toBeNull();
            expect(root.querySelectorAll('section table tbody tr').length).toBe(2);
        });
    });
});

describe('TodayPageComponent — Benim hastalarım', () => {
    const today: TodayVm = { date: 'd', activeHospitalizations: [], items: [] };
    let visits: jasmine.SpyObj<VisitsService>;

    const create = async (claims: string[], vetUserId: string | null): Promise<ComponentFixture<TodayPageComponent>> => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['getToday', 'getVeterinarians', 'getCurrentVeterinarianUserId']);
        visits.getToday.and.returnValue(of(today));
        visits.getVeterinarians.and.returnValue(of([]));
        visits.getCurrentVeterinarianUserId.and.returnValue(of(vetUserId));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(TodayPageComponent);
        fixture.detectChanges();
        return fixture;
    };

    it('hekim: varsayılan Benim hastalarım; ilk istek kullanıcı kimliğiyle gider, Tümü süzgeci kaldırır', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], 'u1');
        expect(visits.getToday).toHaveBeenCalledOnceWith({ voided: false, responsibleVeterinarianUserId: 'u1' });
        f.componentInstance.setScope('all');
        expect(visits.getToday.calls.mostRecent().args[0]).toEqual({ voided: false });
    });

    it('hekim değil: süzgeç görünmez, kimlik gönderilmez', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], null);
        expect(visits.getToday).toHaveBeenCalledOnceWith({ voided: false });
        expect((f.nativeElement as HTMLElement).textContent).not.toContain('Benim hastalarım');
    });

    it('Visits.Create yoksa hekim sorgusu yapılmaz ve süzgeç yok', async () => {
        await create(['Visits.Read'], 'u1');
        expect(visits.getCurrentVeterinarianUserId).not.toHaveBeenCalled();
        expect(visits.getToday).toHaveBeenCalledOnceWith({ voided: false });
    });
});

describe('TodayPageComponent — Benim hastalarım boş liste', () => {
    it('hekimin listesi boşken Size atanmış hasta yok mesajı ve Tümü’ne geç bağlantısı çıkar', async () => {
        const visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['getToday', 'getVeterinarians', 'getCurrentVeterinarianUserId']);
        visits.getToday.and.returnValue(of({ date: 'd', activeHospitalizations: [], items: [] }));
        visits.getCurrentVeterinarianUserId.and.returnValue(of('u1'));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => c !== 'Visits.None', getClinicId: () => 'c1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: AppointmentsService, useValue: {} },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } }
            ]
        }).compileComponents();
        const f = TestBed.createComponent(TodayPageComponent);
        f.detectChanges();
        const t = (f.nativeElement as HTMLElement).textContent ?? '';
        expect(t).toContain('Size atanmış hasta yok.');
        expect(t).not.toContain('Bugün için randevu veya gelen hasta yok');

        const toAll = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Tümü’ne geç'));
        expect(toAll).toBeDefined();
        toAll!.click();
        expect(visits.getToday.calls.mostRecent().args[0]).toEqual({ voided: false });
        f.detectChanges();
        expect((f.nativeElement as HTMLElement).textContent).toContain('Bugün için randevu veya gelen hasta yok.');
    });

});
