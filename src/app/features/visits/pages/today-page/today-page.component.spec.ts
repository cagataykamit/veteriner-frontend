import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { TodayItemVm, TodayVm, VisitVm } from '@/app/features/visits/models/visit-vm.model';
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
    paymentIndicator: 'NoPaymentRecorded',
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
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
            items: [item({ key: 'w' }), item({ key: 'c', careStatus: 'Completed' })]
        });
        const t = text(f);
        expect(t).toContain('Bekliyor');
        expect(t).toContain('Tamamlandı');
        expect(t).toContain('Dr. Ayşe');
        expect(t).toContain('12 dk');
        expect(t).not.toMatch(/açık iş/i);
    });

    it('ödeme ve yatış rozetleri bakım durumundan ayrı gösterilir', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            items: [item({ paymentIndicator: 'PaymentRecorded', hasActiveHospitalization: true }), item({ key: 'x', visitId: 'x' })]
        });
        const t = text(f);
        expect(t).toContain('Ödeme kaydı var');
        expect(t).toContain('Ödeme kaydı yok');
        expect(t).toContain('Yatışta');
        expect(t).toContain('Bekliyor');
        expect((f.nativeElement as HTMLElement).querySelector('[aria-label="2 kayıt"]')).not.toBeNull();
    });

    it('telefon okunabilir biçimde, hekim yoksa Atanmadı gösterilir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', items: [item({ clientPhone: '905439580091', responsibleVeterinarianName: null })] });
        const t = text(f);
        expect(t).toContain('+90 543 958 00 91');
        expect(t).not.toContain('905439580091');
        expect(t).toContain('Atanmadı');
    });

    it('süre sütunu grup bazlı: Bekliyor için Bekleme, Devam ediyor için Süre, tamamlananlarda yok', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
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
        const f = await create(['Visits.Read'], { date: '2026-10-10', items: [] });
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
        const today: TodayVm = { date: '2026-10-10', items: [item()] };
        const without = await create(['Visits.Read', 'Visits.Update'], today);
        expect(buttons(without)).not.toContain('Düzelt');
        expect(buttons(without)).toContain('Başlat');
        TestBed.resetTestingModule();

        const withCorrect = await create(['Visits.Read', 'Visits.Update', 'Visits.Correct'], today);
        expect(buttons(withCorrect)).toContain('Düzelt');
    });

    it('Geldi ve Randevusuz geliş Visits.Create ister; Muayene aç Examinations.Create ister', async () => {
        const planned = item({ key: 'a1', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T07:00:00Z' });
        const waiting = item({ key: 'w' });
        const readOnly = await create(['Visits.Read'], { date: 'd', items: [planned, waiting] });
        expect(buttons(readOnly)).not.toContain('Geldi');
        expect(buttons(readOnly)).not.toContain('Randevusuz geliş');
        expect(buttons(readOnly)).not.toContain('Muayene aç');
        TestBed.resetTestingModule();

        const full = await create(['Visits.Read', 'Visits.Create', 'Examinations.Create'], { date: 'd', items: [planned, waiting] });
        expect(buttons(full)).toContain('Geldi');
        expect(buttons(full)).toContain('Randevusuz geliş');
        expect(buttons(full)).toContain('Muayene aç');
    });

    it('muayeneye geçiş: visitId ile hasta bağlamı query olarak taşınır', async () => {
        const f = await create(['Visits.Read', 'Examinations.Create'], { date: 'd', items: [item()] });
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        f.componentInstance.openExamination(item());

        expect(navigate).toHaveBeenCalledOnceWith(['/panel/examinations/new'], {
            queryParams: { visitId: 'v1', clientId: 'cl1', petId: 'p1' }
        });
    });

    it('başlat: yanıt gelmeden ikinci tıklama ikinci istek üretmez; sonra liste yenilenir', async () => {
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', items: [item()] });
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
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', items: [item()] });
        visits.startVisit.and.returnValue(throwError(() => new Error('Bu geçiş yapılamaz.')));
        const callsBefore = visits.getToday.calls.count();

        f.componentInstance.transition(item(), 'start');

        expect(toasts.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ severity: 'error', detail: 'Bu geçiş yapılamaz.' }));
        expect(visits.getToday.calls.count()).toBe(callsBefore + 1);
    });

    it('created:false yanıtı hata değil bilgi mesajıdır', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], { date: 'd', items: [] });
        f.componentInstance.onArrived({ created: false, visit: { ...visitVm } });

        expect(toasts.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ severity: 'info', summary: 'Açık geliş kaydı zaten var.' }));
    });

    it('otomatik yenileme hatasında eski liste kalır ve uyarı gösterilir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', items: [item()] });
        visits.getToday.and.returnValue(throwError(() => new Error('x')));
        f.componentInstance.refresh('silent');
        f.detectChanges();

        expect(text(f)).toContain('Pamuk');
        expect(text(f)).toContain('Liste güncellenemedi');
    });
});

describe('TodayPageComponent — Benim hastalarım', () => {
    const today: TodayVm = { date: 'd', items: [] };
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
