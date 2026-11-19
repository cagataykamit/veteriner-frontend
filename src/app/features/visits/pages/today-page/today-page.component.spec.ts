import type { Mock, MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { pendingRequest } from '@/app/entities/online-booking/models/appointment-request.testing';
import { AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentRequestsService, OnlineBookingService } from '@/app/entities/online-booking/services/online-booking.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TodayHospitalizationVm, TodayItemVm, TodayVm, VisitVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { TodayPageComponent } from './today-page.component';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';

/** e-belge diyaloğu ve bağlantı kartı sayfaya gömülü; gerçek HTTP yerine sessiz taklit. */
const eDocumentsStub = {
    preview: () => of({ connection: { status: 'NotConnected', environment: null, providerName: null }, groups: [], skipped: [], missingBuyerFields: [], buyer: null, clientId: '', clientName: '' }),
    getConnection: () => of({ clinicId: '', status: 'NotConnected', availableProviders: [] })
};

/** Göreli süreler ("12 dk", yatış süresi) gerçek saate değil sabit saate göre hesaplanır; describe seviyesindeki fixture'lar koşudan dakikalar önce üretilse de kaymaz. */
const NOW = new Date('2026-10-10T10:00:00Z');

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
    arrivedAtUtc: new Date(NOW.getTime() - 12 * 60000).toISOString(),
    careStatus: 'Waiting',
    appointmentStatus: null,
    responsibleVeterinarianName: 'Dr. Ayşe',
    isCarriedOver: false,
    chargedAmount: null,
    allocatedAmount: null,
    outstandingAmount: null,
    clientOutstandingAmount: null,
    chargeIndicator: null,
    chargeableWorkCount: null,
    awaitingLabCount: null,
    pendingChargeCount: null,
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false,
    appointmentReasonName: null,
    arrivalReason: null,
    preparedExaminationTemplateId: null,
    preparedExaminationTemplateName: null,
    ownerConfirmedAtUtc: null,
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
    isUrgent: false,
    arrivalReason: null,
    preparedExaminationTemplateId: null
};

describe('TodayPageComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => vi.useRealTimers());

    let visits: MockedObject<VisitsService>;
    let toasts: Mock;
    let requestList: Mock;

    beforeEach(() => {
        requestList = vi.fn().mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 5 }));
    });

    const create = async (claims: string[], today: TodayVm, vetUserId: string | null = null): Promise<ComponentFixture<TodayPageComponent>> => {
        visits = {
            getToday: vi.fn().mockName('VisitsService.getToday'),
            startVisit: vi.fn().mockName('VisitsService.startVisit'),
            completeVisit: vi.fn().mockName('VisitsService.completeVisit'),
            setUrgency: vi.fn().mockName('VisitsService.setUrgency'),
            getVeterinarians: vi.fn().mockName('VisitsService.getVeterinarians'),
            getCurrentVeterinarianUserId: vi.fn().mockName('VisitsService.getCurrentVeterinarianUserId')
        } as unknown as MockedObject<VisitsService>;
        visits.getToday.mockReturnValue(of(today));
        visits.setUrgency.mockReturnValue(of(visitVm));
        visits.getVeterinarians.mockReturnValue(of([]));
        visits.getCurrentVeterinarianUserId.mockReturnValue(of(vetUserId));

        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                { provide: EDocumentsService, useValue: eDocumentsStub },
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'c1', getUserId: () => 'u1', getAccessToken: () => null } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false, lockedPlanFeature: () => null, planFeatureReady: () => true } },
                // Bekleme listesi bilgisi (TIER-018): bu testlerde boşalan saat yok.
                { provide: WaitlistService, useValue: { today: () => of({ waitingCount: 0, releasedSlots: [] }) } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } },
                // Bekleyen online talepler: varsayılan yok; "bekleyen online talepler" bloğu doldurur.
                // get: açılan talep penceresi ayrıntıyı ister; bu testler yalnız açıldığını denetler.
                { provide: AppointmentRequestsService, useValue: { list: requestList, get: () => NEVER } },
                // Talep penceresinin onay servisi: bu testlerde onay/red yapılmaz.
                { provide: OnlineBookingService, useValue: {} }
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(TodayPageComponent);

        toasts = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add').mockReturnValue(undefined);
        fixture.detectChanges();

        return fixture;
    };

    const text = (f: ComponentFixture<TodayPageComponent>) => (f.nativeElement as HTMLElement).textContent ?? '';
    const buttons = (f: ComponentFixture<TodayPageComponent>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

    /** Görünen metin parçaları boşlukla (yan yana öğelerin textContent'i bitişik gelir): "Klinikte 2", "Sırada · 12 dk". */
    const words = (el: Element | null | undefined): string => {
        const out: string[] = [];
        const walker = document.createTreeWalker(el!, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
            const t = walker.currentNode.textContent?.trim();

            if (t) {
                out.push(t);
            }
        }

        return out.join(' ');
    };

    it('ara başlıklar, hekim adı ve bekleme süresi gösterilir; göstergeler yoksa çip ve açık iş şeridi görünmez', async () => {
        const f = await create(['Visits.Read'], {
            date: '2026-10-10',
            activeHospitalizations: [],
            items: [item({ key: 'w' }), item({ key: 'c', careStatus: 'Completed' })]
        });
        const t = text(f);

        expect(t).toContain('Klinikte');
        expect(t).toContain('Sırada');
        expect(t).toContain('Tamamlandı');
        expect(t).toContain('Dr. Ayşe');
        expect(t).toContain('12 dk');
        expect(t).not.toMatch(/açık iş/i);
        expect(t).not.toContain('Lab bekliyor');
    });

    it('başlık tekrarlanmaz: alt yazı yok, ilk görünüm sekmesi "Günlük liste"', async () => {
        const f = await create(['Visits.Read'], { date: '2026-10-10', activeHospitalizations: [], items: [] });
        const el = f.nativeElement as HTMLElement;

        expect(el.querySelector('app-page-header p')).toBeNull();
        expect(text(f)).not.toContain('Bugünün randevuları ve gelen hastalar.');
        const views = el.querySelector('p-selectbutton')!.textContent ?? '';

        expect(views).toContain('Günlük liste');
        expect(views).toContain('Yanlış işaretlenenler');
        expect(views).not.toContain('Bugün');
    });

    it('başlığın yanında soluk gün, tarih ve saat (İstanbul): "Cumartesi, 10 Ekim · 13:00"', async () => {
        const f = await create(['Visits.Read'], { date: '2026-10-10', activeHospitalizations: [], items: [] });
        const note = (f.nativeElement as HTMLElement).querySelector('[data-testid="page-header-title-note"]')!;

        expect(note.textContent?.trim()).toBe('Cumartesi, 10 Ekim · 13:00');
        expect(note.className).toContain('text-muted-color');
    });

    it('Açık işler çipleri Liste / Hastalar seçimleriyle aynı satırda, sağa yaslı', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [],
            openItems: { unchargedVisitCount: 2, outstandingVisitCount: 0, outstandingAmount: 0, awaitingLabCount: 0, incompleteVisitCount: 0 }
        });
        const strip = (f.nativeElement as HTMLElement).querySelector('app-today-open-items') as HTMLElement;

        expect(strip.classList).toContain('ml-auto');
        expect(strip.parentElement?.querySelector('p-selectbutton')).not.toBeNull();
        expect(strip.parentElement?.className).toContain('flex');
    });

    it('hasta ve sahip adı detay sayfasına bağlantıdır', async () => {
        const f = await create(['Visits.Read'], {
            date: '2026-10-10',
            activeHospitalizations: [],
            items: [item()]
        });
        const el = f.nativeElement as HTMLElement;
        const hrefs = (id: string) => Array.from(el.querySelectorAll('[data-testid="' + id + '"]')).map((a) => a.getAttribute('href'));

        expect(hrefs('today-pet-link')).toContain('/panel/pets/p1');
        expect(hrefs('today-client-link')).toContain('/panel/clients/cl1');
    });

    it('ziyaretin kalanı tek "Kalan ₺…" (ayrıntı ipucunda); müşteri borcu müşteri adının yanında etiket; yatış rozeti bakım durumundan ayrıdır', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ chargeIndicator: 'PartiallyPaid', chargedAmount: 1000, allocatedAmount: 400, outstandingAmount: 600, clientOutstandingAmount: 900, hasActiveHospitalization: true }), item({ key: 'x', visitId: 'x' })]
        });
        const el = f.nativeElement as HTMLElement;
        const t = text(f);

        expect(t).toContain('Kısmi ödeme');
        expect(t).toContain('Kalan ₺600,00');
        expect(el.querySelector('[data-testid="today-remaining"]')?.getAttribute('title')).toBe('Ücret ₺1.000,00 · Ödenen ₺400,00');
        expect(t).not.toContain('Ödenen ₺400,00');
        const debt = el.querySelector('[data-testid="today-client-debt"]')!;

        expect(debt.textContent?.trim()).toBe('Borç ₺900,00');
        expect(debt.closest('td')?.querySelector('[data-testid="today-client-link"]')).not.toBeNull();
        expect(t).not.toContain('Müşteri borcu');
        expect(t).toContain('Yatışta');
        expect(t).toContain('Sırada');
        expect(t).not.toContain('Ödeme kaydı');
        expect(el.querySelector('[aria-label="2 kayıt"]')).not.toBeNull();
    });

    it('müşteri borcu etiketi Payments.Create varsa müşteri bağlamıyla ödeme formuna götürür', async () => {
        const f = await create(['Visits.Read', 'Payments.Create'], { date: 'd', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7', clientOutstandingAmount: 1600 })] });
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const btn = (f.nativeElement as HTMLElement).querySelector('[data-testid="today-client-debt-pay"]') as HTMLButtonElement;

        expect(btn.getAttribute('aria-label')).toBe('Müşteri borcu ₺1.600,00, ödeme al');
        btn.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
    });

    describe('bekleyen online talepler', () => {
        const MANAGE = ['Visits.Read', 'AppointmentRequests.Manage'];
        const empty: TodayVm = { date: 'd', activeHospitalizations: [], items: [], openItems: null };
        const el = (f: ComponentFixture<TodayPageComponent>) => f.nativeElement as HTMLElement;

        const settle = async (f: ComponentFixture<TodayPageComponent>) => {
            f.detectChanges();
            await f.whenStable();
            f.detectChanges();
        };

        beforeEach(() => {
            localStorage.clear();
            requestList.mockReturnValue(
                of({
                    items: [
                        // NOW 13:00 (İstanbul): ilki yarın 17:30, 12 dk önce geldi.
                        pendingRequest('r1', { requestedStartUtc: '2026-10-11T14:30:00Z', createdAtUtc: '2026-10-10T09:48:00Z' }),
                        pendingRequest('r2', { requestedStartUtc: '2026-10-12T07:00:00Z', createdAtUtc: '2026-10-09T09:00:00Z' })
                    ],
                    totalCount: 7,
                    page: 1,
                    pageSize: 5
                })
            );
        });

        it('varsayılan: sayfa başında kutucuklar; çip ve boş Açık işler satırı çizilmez; sayı menü sayacına bildirilir', async () => {
            const f = await create(MANAGE, empty);

            expect(requestList).toHaveBeenCalledWith({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: 5 });
            expect(el(f).querySelectorAll('[data-testid="pending-request-tile"]').length).toBe(2);
            expect(el(f).querySelector('[data-testid="pending-requests-more"]')?.textContent).toContain('+5');
            expect(el(f).querySelector('[data-testid="pending-requests-chip"]')).toBeNull();
            expect(el(f).querySelector('[data-testid="open-items-strip"]')).toBeNull();
            expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBe(7);
        });

        it('kayıtlı tercih çipse Açık işler satırının ilk çipi; açık iş özeti yokken de satır çizilir', async () => {
            localStorage.setItem('vetinity.pendingRequestsView.u1', 'chip');
            const f = await create(MANAGE, empty);
            const strip = el(f).querySelector('[data-testid="open-items-strip"]');

            expect(requestList).toHaveBeenCalledWith({ status: AppointmentRequestStatus.Pending, page: 1, pageSize: 5 });
            expect(strip?.querySelector('[data-testid="pending-requests-chip"]')?.textContent).toContain('Online talep: 7');
            expect(strip?.querySelector('[data-testid="pending-requests-chip-nearest"]')?.textContent).toContain('en yakını yarın 17:30');
            expect(strip?.querySelector('.pending-pulse')).not.toBeNull(); // 12 dk önce gelen talep: yeni
            expect(strip?.textContent).not.toContain('Açık iş yok');
            expect(el(f).querySelector('[data-testid="pending-requests-tiles"]')).toBeNull();
            expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBe(7);
        });

        it('çipin panelinden kutucuğa, "Açık işlerde göster" ile geri; tercih kullanıcı adına saklanır', async () => {
            localStorage.setItem('vetinity.pendingRequestsView.u1', 'chip');
            const f = await create(MANAGE, empty);

            el(f).querySelector<HTMLButtonElement>('[data-testid="pending-requests-chip"]')!.click();
            await settle(f);
            const panelRows = document.querySelectorAll('[data-testid="pending-requests-panel"] [data-testid="pending-request-row"]');

            expect(panelRows.length).toBe(2);
            expect(panelRows[0].textContent).toContain('12 dk önce');
            document.querySelector<HTMLButtonElement>('[data-testid="pending-requests-show-tiles"]')!.click();
            await settle(f);

            expect(el(f).querySelector('[data-testid="pending-requests-chip"]')).toBeNull();
            expect(el(f).querySelectorAll('[data-testid="pending-request-tile"]').length).toBe(2);
            expect(localStorage.getItem('vetinity.pendingRequestsView.u1')).toBe('tiles');

            el(f).querySelector<HTMLButtonElement>('[data-testid="pending-requests-show-chip"]')!.click();
            await settle(f);

            expect(el(f).querySelector('[data-testid="pending-requests-tiles"]')).toBeNull();
            expect(el(f).querySelector('[data-testid="pending-requests-chip"]')).not.toBeNull();
            expect(localStorage.getItem('vetinity.pendingRequestsView.u1')).toBe('chip');
        });

        it('talep Bugün ekranından ayrılmadan açılır; karar verilip kapanınca talepler ve günlük liste yenilenir', async () => {
            const f = await create(MANAGE, empty);
            const router = TestBed.inject(Router);
            const urlBefore = router.url;
            const firstId = f.componentInstance.pendingRequests.items()[0].id;

            el(f).querySelector<HTMLButtonElement>('[data-testid="pending-request-tile"]')!.click();
            await settle(f);

            expect(router.url).toBe(urlBefore);
            expect(f.componentInstance.pendingRequests.openId()).toBe(firstId);

            f.componentInstance.onRequestDialogClosed(true);

            expect(f.componentInstance.pendingRequests.openId()).toBeNull();
            expect(requestList).toHaveBeenCalledTimes(2);
        });

        it('bekleyen yoksa ne çip ne kutucuk çizilir', async () => {
            requestList.mockReturnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 5 }));
            const f = await create(MANAGE, empty);

            expect(el(f).querySelector('[data-testid="open-items-strip"]')).toBeNull();
            expect(el(f).querySelector('[data-testid="pending-requests-tiles"]')).toBeNull();
        });

        it('Bugün yenilenince talepler de yenilenir; sayfa kapanınca sayaç bildirimi bırakılır', async () => {
            const f = await create(MANAGE, empty);

            f.componentInstance.refresh('silent');
            expect(requestList).toHaveBeenCalledTimes(2);

            f.destroy();
            expect(TestBed.inject(MenuBadgeFeed).value('pendingAppointmentRequests')).toBeUndefined();
        });

        it('talep yönetme yetkisi yoksa sorgu atılmaz', async () => {
            const f = await create(['Visits.Read'], empty);

            expect(requestList).not.toHaveBeenCalled();
            expect(el(f).querySelector('[data-testid="pending-requests-tiles"]')).toBeNull();
            expect(el(f).querySelector('[data-testid="pending-requests-chip"]')).toBeNull();
        });
    });

    describe('aktif yatışlar bölümü', () => {
        const hosp = (over: Partial<TodayHospitalizationVm> = {}): TodayHospitalizationVm => ({
            hospitalizationId: 'h1',
            petId: 'p1',
            petName: 'Pamuk',
            clientName: 'Ali Veli',
            admittedAtUtc: new Date(NOW.getTime() - 3 * 86400000 - 60000).toISOString(),
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

        expect(t).not.toContain('Ödeme bekliyor');
        expect(t).not.toContain('Ücret yok');
        expect(t).not.toContain('Müşteri borcu');
        expect(t).not.toContain('Ödeme kaydı');
    });

    it('chargeIndicator ChargeMissing "Ücret yok" çipi; Paid çip üretmez ve müşteri borcu yoksa borç satırı çıkmaz', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [
                item({ key: 'a', chargeIndicator: 'ChargeMissing', chargeableWorkCount: 2, chargedAmount: 0, allocatedAmount: 0, outstandingAmount: 0, clientOutstandingAmount: 0 }),
                item({ key: 'b', visitId: 'b', chargeIndicator: 'Paid', chargedAmount: 500, allocatedAmount: 500, outstandingAmount: 0, clientOutstandingAmount: 0 })
            ]
        });
        const t = text(f);

        expect(t).toContain('Ücret yok');
        expect(t).not.toContain('Ödendi');
        expect(t).not.toContain('Müşteri borcu');
    });

    describe('açık iş çipleri ve şerit', () => {
        const chipTexts = (f: ComponentFixture<TodayPageComponent>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('p-tag')).map((e) => e.textContent?.trim() ?? '');

        it('Lab bekliyor sayısı, Ödeme bekliyor ve kısmi çipleri; çipler simge taşır', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [
                    item({ key: 'a', chargeIndicator: 'PaymentPending', awaitingLabCount: 2, chargedAmount: 100, allocatedAmount: 0, outstandingAmount: 100 }),
                    item({ key: 'b', visitId: 'b', chargeIndicator: 'PartiallyPaid', chargedAmount: 100, allocatedAmount: 40, outstandingAmount: 60 })
                ]
            });
            const t = text(f);

            expect(t).toContain('Lab bekliyor (2)');
            expect(t).toContain('Ödeme bekliyor');
            expect(t).toContain('Kısmi ödeme');
            expect((f.nativeElement as HTMLElement).querySelector('p-tag .p-tag-icon')).not.toBeNull();
        });

        it('çipler yalnız renge dayanmaz: metin var ve kritik çip (Ücret yok) Lab bekliyor ve ödemeden önce gelir', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ chargeIndicator: 'ChargeMissing', awaitingLabCount: 1 })]
            });
            const texts = chipTexts(f);

            expect(texts.indexOf('Ücret yok')).toBeGreaterThanOrEqual(0);
            expect(texts.indexOf('Ücret yok')).toBeLessThan(texts.indexOf('Lab bekliyor (1)'));
        });

        it('Açık işler: ücret bekleyen kalem sayısı Ücretlendir ekranına götüren çiptir', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [],
                openItems: { unchargedVisitCount: 0, outstandingVisitCount: 0, outstandingAmount: 0, awaitingLabCount: 0, incompleteVisitCount: 0, pendingChargeItemCount: 3 }
            });
            const link = Array.from((f.nativeElement as HTMLElement).querySelectorAll('a')).find((a) => a.textContent?.includes('Ücret bekliyor: 3 kalem'));

            expect(link?.getAttribute('href')).toBe('/panel/charges/pending');
        });

        it('planlı satırda (null göstergeler) çip yok', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'p', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: NOW.toISOString() })]
            });

            expect(text(f)).not.toMatch(/Ücret yok|Lab bekliyor|Ödeme bekliyor|Kısmi ödeme/);
        });

        it('Ödeme bekliyor çipi Payments.Create varsa düğmedir ve müşteri + geliş bağlamıyla ödeme formuna gider', async () => {
            const f = await create(['Visits.Read', 'Payments.Create'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ visitId: 'v9', clientId: 'cl7', chargeIndicator: 'PaymentPending' })]
            });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const btn = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Ödeme bekliyor')) as HTMLButtonElement;

            expect(btn).toBeDefined();
            btn.click();
            expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
        });

        it('Payments.Create yoksa Ödeme bekliyor çipi düğme değildir', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ chargeIndicator: 'PaymentPending' })] });

            expect(buttons(f).some((b) => b.includes('Ödeme bekliyor'))).toBe(false);
            expect(text(f)).toContain('Ödeme bekliyor');
        });

        it('openItems null ise şerit yok', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item()], openItems: null });

            expect((f.nativeElement as HTMLElement).querySelector('[data-testid="open-items-strip"]')).toBeNull();
        });

        it('şerit özet sayıları gösterir; null alanlar görünmez, sayılar sıfırsa "Açık iş yok"', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item()],
                openItems: { unchargedVisitCount: 3, outstandingVisitCount: 2, outstandingAmount: 750, awaitingLabCount: null, incompleteVisitCount: 1 }
            });
            const strip = (f.nativeElement as HTMLElement).querySelector('[data-testid="open-items-strip"]')!.textContent ?? '';

            expect(strip).toContain('Ücret yok: 3 ziyaret');
            expect(strip).toContain('Ödeme bekliyor: 2 ziyaret');
            expect(strip).toContain('Önceki günden açık geliş: 1');
            expect(strip).not.toContain('Lab bekliyor');

            const links = Array.from((f.nativeElement as HTMLElement).querySelectorAll('[data-testid="open-items-strip"] a')).map((a) => a.getAttribute('href'));

            expect(links).toEqual(['/panel/reports/outstanding-balances']);
            // Liste sayfası olmayan iki sayı da tıklanır: ziyaret listesini açan çip (OPEN_ITEMS_API_CONTRACT §10).
            const strip$ = (f.nativeElement as HTMLElement).querySelector('[data-testid="open-items-strip"]')!;

            expect(strip$.querySelector('button[data-testid="open-items-chip-Uncharged"]')?.textContent).toContain('Ücret yok: 3 ziyaret');
            expect(strip$.querySelector('button[data-testid="open-items-chip-Incomplete"]')?.textContent).toContain('Önceki günden açık geliş: 1');
        });

        it('açık geliş listesinden Tamamla, satırın Tamamla akışıyla gelişi kapatır ve listeyi yeniler', async () => {
            const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()], openItems: null });

            visits.completeVisit.mockReturnValue(of(visitVm));
            visits.getToday.mockClear();
            f.componentInstance.completeOpenVisit({
                visitId: 'old1',
                arrivedAtUtc: '2026-10-08T07:00:00Z',
                careStatus: 'InProgress',
                petId: 'p1',
                petName: 'Pamuk',
                clientId: 'cl1',
                clientName: 'Ali',
                responsibleVeterinarianName: null,
                latestExaminationId: 'e1',
                chargeableWorkCount: null
            });
            await vi.advanceTimersByTimeAsync(0);

            expect(visits.completeVisit).toHaveBeenCalledWith('old1', {});
            expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Bakım tamamlandı.' }));
            expect(visits.getToday).toHaveBeenCalled();
        });

        it('açık geliş listesinden muayenesiz gelişi Tamamla önce sorar; Ücretsiz tamamla withoutCharge ile kapatır', async () => {
            const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()], openItems: null });

            visits.completeVisit.mockReturnValue(of(visitVm));
            f.componentInstance.completeOpenVisit({
                visitId: 'old2',
                arrivedAtUtc: '2026-10-08T07:00:00Z',
                careStatus: 'InProgress',
                petId: 'p2',
                petName: 'Tekir',
                clientId: 'cl2',
                clientName: 'Ayşe',
                responsibleVeterinarianName: null,
                latestExaminationId: null,
                chargeableWorkCount: null
            });
            expect(visits.completeVisit).not.toHaveBeenCalled();
            const prompt = f.componentInstance.completePromptItem();

            expect(prompt?.visitId).toBe('old2');
            f.componentInstance.completeWithoutCharge(prompt!);
            await vi.advanceTimersByTimeAsync(0);
            expect(visits.completeVisit).toHaveBeenCalledWith('old2', { withoutCharge: true });
        });

        it('Ücretsiz olarak işaretle: onaydan sonra tamamlanmış gelişi withoutCharge ile işaretler', async () => {
            const done = item({ key: 'c', visitId: 'v7', careStatus: 'Completed', chargeIndicator: 'ChargeMissing', pendingChargeCount: 0, petName: 'Boncuk' });
            const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [done] });
            const keys = f.componentInstance.secondaryActionsOf(done, f.componentInstance.actionsOf(done)).map((a) => a.key);

            expect(keys).toContain('markNoCharge');
            visits.completeVisit.mockReturnValue(of(visitVm));
            f.componentInstance.noChargeConfirm.set({ visitId: 'v7', key: 'c', petName: 'Boncuk' });
            f.componentInstance.confirmMarkNoCharge();
            await vi.advanceTimersByTimeAsync(0);
            expect(visits.completeVisit).toHaveBeenCalledWith('v7', { withoutCharge: true });
            expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Ücretsiz olarak işaretlendi.' }));
        });

        it('hiç başlamamış açık geliş düzeltme diyaloğunda açılır', async () => {
            const f = await create(['Visits.Read', 'Visits.Correct'], { date: 'd', activeHospitalizations: [], items: [item()], openItems: null });
            const row = { visitId: 'old2', petName: 'Boncuk', clientName: 'Ayşe', careStatus: 'Waiting' as const };

            f.componentInstance.openCorrection(row);

            expect(f.componentInstance.correctionItem()).toEqual(row);
            expect(f.componentInstance.correctionOpen()).toBe(true);
        });

        it('tüm sayılar sıfırsa şerit "Açık iş yok" der; Lab bekliyor sayfa bağlantısıdır', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item()],
                openItems: { unchargedVisitCount: 0, outstandingVisitCount: 0, outstandingAmount: 0, awaitingLabCount: 0, incompleteVisitCount: 0 }
            });

            expect(text(f)).toContain('Açık iş yok');
        });

        it('Lab bekliyor özeti Lab sonuçları sayfasına bağlanır', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item()],
                openItems: { unchargedVisitCount: null, outstandingVisitCount: null, outstandingAmount: null, awaitingLabCount: 4, incompleteVisitCount: 0 }
            });
            const a = (f.nativeElement as HTMLElement).querySelector('[data-testid="open-items-strip"] a');

            expect(a?.textContent).toContain('Lab bekliyor: 4');
            expect(a?.getAttribute('href')).toBe('/panel/lab-results');
        });

        it("HBS'e girilmedi satırları süzgeçli Reçeteler/Aşılar listesine bağlanır; sıfır veya null görünmez", async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item()],
                openItems: {
                    unchargedVisitCount: null,
                    outstandingVisitCount: null,
                    outstandingAmount: null,
                    awaitingLabCount: null,
                    incompleteVisitCount: 0,
                    hbsNotEnteredPrescriptionCount: 2,
                    hbsNotEnteredVaccinationCount: 0
                }
            });
            const links = Array.from((f.nativeElement as HTMLElement).querySelectorAll('[data-testid="open-items-strip"] a'));

            expect(links.map((a) => a.textContent?.trim())).toEqual(["HBS'e girilmedi: 2 reçete"]);
            expect(links[0].getAttribute('href')).toBe('/panel/prescriptions?hbsStatus=NotEntered');
            expect(((f.nativeElement as HTMLElement).querySelector('[data-testid="open-items-strip"]')?.textContent ?? '').toLowerCase()).not.toContain('zorunlu');
        });
    });

    it('telefon okunabilir biçimde; listede hiç hekim yoksa Hekim sütunu çizilmez ve "Atanmadı" yazılmaz', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ clientPhone: '905439580091', responsibleVeterinarianName: null })] });
        const t = text(f);
        const headers = Array.from((f.nativeElement as HTMLElement).querySelectorAll('thead th')).map((th) => th.textContent?.trim());

        expect(t).toContain('+90 543 958 00 91');
        expect(t).not.toContain('905439580091');
        expect(t).not.toContain('Atanmadı');
        expect(headers).toEqual(['Saat', 'Hasta', 'Müşteri', 'Durum', 'Neden / not', 'İşlem']);
    });

    it('hekim atanmış satırda baş harf yuvarlağı ve ad; atanmamış satırda soluk "—" (ipucu: atanmadı)', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'a', responsibleVeterinarianName: 'Dr. Ece Yılmaz' }), item({ key: 'b', visitId: 'b', responsibleVeterinarianName: null })] });
        const root = f.nativeElement as HTMLElement;
        const headers = Array.from(root.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
        const vetCells = Array.from(root.querySelectorAll('tbody tr[data-today-row]')).map((tr) => tr.querySelectorAll('td')[3]);

        expect(headers[3]).toBe('Hekim');
        expect(words(vetCells[0])).toBe('EY Dr. Ece Yılmaz');
        expect(vetCells[1].textContent?.trim()).toBe('—');
        expect(vetCells[1].querySelector('[title]')?.getAttribute('title')).toBe('Sorumlu hekim atanmadı');
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

    it('durum nokta + tek satır: Sırada ve Muayenede gelişten bu yana süreyle, Tamamlandı süresiz; ayrı süre sütunu yok', async () => {
        const f = await create(['Visits.Read'], {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ key: 'w' }), item({ key: 'i', visitId: 'i', careStatus: 'InProgress' }), item({ key: 'c', visitId: 'c', careStatus: 'Completed', outstandingAmount: 100 })]
        });
        const root = f.nativeElement as HTMLElement;
        const statuses = Array.from(root.querySelectorAll('tbody [data-testid="today-status"]')).map((s) => words(s));

        expect(statuses).toEqual(['Sırada · 12 dk', 'Muayenede · 12 dk', 'Tamamlandı']);
        expect(root.querySelector('tbody [data-testid="today-status"]')?.classList).toContain('whitespace-nowrap');
        expect(Array.from(root.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).not.toContain('Bekleme');
        expect(root.querySelector('tbody app-status-tag p-tag')).toBeNull();
    });

    it('30 dakikayı aşan beklemede süre uyarı renginde, simgeli ve ekran okuyucuya söylenir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ arrivedAtUtc: new Date(NOW.getTime() - 45 * 60000).toISOString() })] });
        const detail = (f.nativeElement as HTMLElement).querySelector('[data-testid="today-status"] [title]') as HTMLElement;

        expect(detail.getAttribute('title')).toBe('30 dakikayı aşan bekleme');
        expect(detail.className).toContain('text-orange-600');
        expect(detail.querySelector('i.pi-clock')).not.toBeNull();
        expect(detail.textContent).toContain('45 dk');
    });

    it('boş liste boş durumu gösterir', async () => {
        const f = await create(['Visits.Read'], { date: '2026-10-10', activeHospitalizations: [], items: [] });

        expect(text(f)).toContain('Bugün için randevu veya gelen hasta yok.');
    });

    it('ilk yükleme hatası hata durumunu gösterir', async () => {
        visits = {
            getToday: vi.fn().mockName('VisitsService.getToday'),
            getCurrentVeterinarianUserId: vi.fn().mockName('VisitsService.getCurrentVeterinarianUserId')
        } as unknown as MockedObject<VisitsService>;
        visits.getCurrentVeterinarianUserId.mockReturnValue(of(null));
        visits.getToday.mockReturnValue(throwError(() => new Error('Bugün listesi yüklenemedi.')));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                { provide: EDocumentsService, useValue: eDocumentsStub },
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'c1', getUserId: () => 'u1', getAccessToken: () => null } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false, lockedPlanFeature: () => null, planFeatureReady: () => true } },
                // Bekleme listesi bilgisi (TIER-018): bu testlerde boşalan saat yok.
                { provide: WaitlistService, useValue: { today: () => of({ waitingCount: 0, releasedSlots: [] }) } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: AppointmentsService, useValue: {} },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } },
                // Bekleyen online talepler: bu testlerde talep yok.
                { provide: AppointmentRequestsService, useValue: { list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 5 }) } },
                // Talep penceresinin onay servisi: bu testlerde onay/red yapılmaz.
                { provide: OnlineBookingService, useValue: {} }
            ]
        }).compileComponents();
        const f = TestBed.createComponent(TodayPageComponent);

        f.detectChanges();
        expect(text(f)).toContain('Bugün listesi yüklenemedi.');
    });

    it('e-Belge önerisi penceresi belge kesme izniyle çizilir; Düzelt izni gerekmez (sekreter)', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item()] };
        const secretary = await create(['Visits.Read', 'Visits.Update', 'EDocuments.Issue'], today);

        expect((secretary.nativeElement as HTMLElement).querySelector('app-e-document-issue-dialog')).not.toBeNull();
        TestBed.resetTestingModule();

        const withoutIssue = await create(['Visits.Read', 'Visits.Update', 'Visits.Correct'], today);

        expect((withoutIssue.nativeElement as HTMLElement).querySelector('app-e-document-issue-dialog')).toBeNull();
    });

    it('Düzelt yalnızca Visits.Correct yetkisi olana görünür', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item()] };
        const without = await create(['Visits.Read', 'Visits.Update'], today);
        const keys = (f: ComponentFixture<TodayPageComponent>) => f.componentInstance.secondaryActionsOf(today.items[0], f.componentInstance.actionsOf(today.items[0])).map((a) => a.key);

        expect(keys(without)).not.toContain('correct');
        expect(buttons(without)).toContain('Muayeneye al');
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
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        f.componentInstance.openPayment(today.items[0]);
        expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
    });

    it('menüden Ödeme al, menü kapanana (onHide) kadar sayfa değiştirmez', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7' })] };
        const f = await create(['Visits.Read', 'Payments.Create'], today);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const c = f.componentInstance;

        c.openRowMenu(new Event('click'), today.items[0], [{ key: 'collectPayment', label: 'Ödeme al', icon: 'pi pi-wallet' } as never]);
        c.rowMenuItems()[0].command?.({});
        expect(navigate).not.toHaveBeenCalled();
        c.openPendingNavigation();
        expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl7', visitId: 'v9' } });
        c.openPendingNavigation();
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('Ücret ekle yalnızca Charges.Create yetkisiyle görünür ve müşteri + hasta + geliş bağlamıyla ücret formuna gider', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7', petId: 'p7' })] };
        const keys = (f: ComponentFixture<TodayPageComponent>) => f.componentInstance.secondaryActionsOf(today.items[0], f.componentInstance.actionsOf(today.items[0])).map((a) => a.key);
        const without = await create(['Visits.Read', 'Payments.Create'], today);

        expect(keys(without)).not.toContain('addCharge');
        TestBed.resetTestingModule();

        const f = await create(['Visits.Read', 'Charges.Create'], today);

        expect(keys(f)).toContain('addCharge');
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        f.componentInstance.openCharge(today.items[0]);
        expect(navigate).toHaveBeenCalledWith(['/panel/charges/new'], { queryParams: { clientId: 'cl7', petId: 'p7', visitId: 'v9' } });
    });

    it('menüden Ücret ekle, menü kapanana (onHide) kadar sayfa değiştirmez', async () => {
        const today: TodayVm = { date: '2026-10-10', activeHospitalizations: [], items: [item({ visitId: 'v9', clientId: 'cl7', petId: 'p7' })] };
        const f = await create(['Visits.Read', 'Charges.Create'], today);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const c = f.componentInstance;

        c.openRowMenu(new Event('click'), today.items[0], [{ key: 'addCharge', label: 'Ücret ekle', icon: 'pi pi-plus' } as never]);
        c.rowMenuItems()[0].command?.({});
        expect(navigate).not.toHaveBeenCalled();
        c.openPendingNavigation();
        expect(navigate).toHaveBeenCalledWith(['/panel/charges/new'], { queryParams: { clientId: 'cl7', petId: 'p7', visitId: 'v9' } });
        c.openPendingNavigation();
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('Geldi ve Randevusuz geliş Visits.Create ister; Muayene aç Examinations.Create ister', async () => {
        const planned = item({ key: 'a1', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T07:00:00Z' });
        const waiting = item({ key: 'w', careStatus: 'InProgress' });
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

    it('Hızlı satış kısayolu yalnız Sales.Create ile görünür ve satış ekranına gider', async () => {
        const data = { date: 'd', activeHospitalizations: [], items: [] };
        const without = await create(['Visits.Read'], data);

        expect((without.nativeElement as HTMLElement).querySelector('a[href="/panel/sales/new"]')).toBeNull();
        TestBed.resetTestingModule();

        const withClaim = await create(['Visits.Read', 'Sales.Create'], data);
        const link = (withClaim.nativeElement as HTMLElement).querySelector('a[href="/panel/sales/new"]');

        expect(link?.textContent).toContain('Hızlı satış');
    });

    it('Yeni randevu ve Yeni muayene kısayolları yetkiyle görünür, mevcut ekranlara gider, ikincil görünümdedir (ADR-030)', async () => {
        const data = { date: 'd', activeHospitalizations: [], items: [] };
        const without = await create(['Visits.Read', 'Visits.Create'], data);
        const none = without.nativeElement as HTMLElement;

        expect(none.querySelector('[data-testid="today-new-appointment"]')).toBeNull();
        expect(none.querySelector('[data-testid="today-new-examination"]')).toBeNull();
        TestBed.resetTestingModule();

        const onlyAppointment = await create(['Visits.Read', 'Appointments.Create'], data);

        expect((onlyAppointment.nativeElement as HTMLElement).querySelector('[data-testid="today-new-appointment"]')).not.toBeNull();
        expect((onlyAppointment.nativeElement as HTMLElement).querySelector('[data-testid="today-new-examination"]')).toBeNull();
        TestBed.resetTestingModule();

        const full = await create(['Visits.Read', 'Visits.Create', 'Appointments.Create', 'Examinations.Create'], data);
        const el = full.nativeElement as HTMLElement;
        const appointment = el.querySelector('[data-testid="today-new-appointment"]');
        const examination = el.querySelector('[data-testid="today-new-examination"]');

        expect(appointment?.getAttribute('href')).toBe('/panel/appointments/new');
        expect(appointment?.textContent).toContain('Yeni randevu');
        expect(appointment?.classList).toContain('p-button-secondary');
        expect(examination?.getAttribute('href')).toBe('/panel/examinations/new');
        expect(examination?.textContent).toContain('Yeni muayene');
        expect(examination?.classList).toContain('p-button-secondary');
        expect(el.querySelector('app-page-header')?.textContent).toContain('Randevusuz geliş');
    });

    it('muayeneye geçiş: visitId ile hasta bağlamı query olarak taşınır', async () => {
        const f = await create(['Visits.Read', 'Examinations.Create'], { date: 'd', activeHospitalizations: [], items: [item()] });
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        f.componentInstance.openExamination(item());

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith(['/panel/examinations/new'], {
            queryParams: { visitId: 'v1', clientId: 'cl1', petId: 'p1' }
        });
    });

    it('başlat: yanıt gelmeden ikinci tıklama ikinci istek üretmez; sonra liste yenilenir', async () => {
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()] });
        const pending = new Subject<VisitVm>();

        visits.startVisit.mockReturnValue(pending);
        const row = item();

        f.componentInstance.transition(row, 'start');
        f.componentInstance.transition(row, 'start');
        expect(visits.startVisit).toHaveBeenCalledTimes(1);
        expect(f.componentInstance.isBusy(row)).toBe(true);

        const callsBefore = vi.mocked(visits.getToday).mock.calls.length;

        pending.next(visitVm);
        pending.complete();
        expect(f.componentInstance.isBusy(row)).toBe(false);
        expect(vi.mocked(visits.getToday).mock.calls.length).toBe(callsBefore + 1);
    });

    it('başlatma hatasında hata toast ı gösterilir ve liste yenilenir', async () => {
        const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item()] });

        visits.startVisit.mockReturnValue(throwError(() => new Error('Bu geçiş yapılamaz.')));
        const callsBefore = vi.mocked(visits.getToday).mock.calls.length;

        f.componentInstance.transition(item(), 'start');

        expect(vi.mocked(toasts).mock.lastCall![0]).toEqual(expect.objectContaining({ severity: 'error', detail: 'Bu geçiş yapılamaz.' }));
        expect(vi.mocked(visits.getToday).mock.calls.length).toBe(callsBefore + 1);
    });

    it('created:false yanıtı hata değil bilgi mesajıdır', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], { date: 'd', activeHospitalizations: [], items: [] });

        f.componentInstance.onArrived({ created: false, visit: { ...visitVm } });

        expect(vi.mocked(toasts).mock.lastCall![0]).toEqual(expect.objectContaining({ severity: 'info', summary: 'Açık geliş kaydı zaten var.' }));
    });

    it('sahip hatırlatmadan onayladıysa planlı satırda "Müşteri onayladı" rozeti çıkar; gelişi açılmış satırda çıkmaz (TIER-019)', async () => {
        const confirmed = item({ key: 'a1', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T09:00:00Z', ownerConfirmedAtUtc: '2026-10-09T18:00:00Z' });
        const notConfirmed = item({ key: 'a2', visitId: null, appointmentId: 'a2', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T10:00:00Z' });
        const arrived = item({ key: 'w', appointmentId: 'a3', ownerConfirmedAtUtc: '2026-10-09T18:00:00Z' });
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [confirmed, notConfirmed, arrived] });
        const badges = (f.nativeElement as HTMLElement).querySelectorAll('[data-testid="today-owner-confirmed"]');

        expect(badges).toHaveLength(1);
        expect(badges[0].textContent).toContain('Müşteri onayladı');
        expect(badges[0].getAttribute('title')).toContain('Hatırlatma e-postasından onaylandı');
    });

    describe('geliş hazırlığı (CHECKIN-001/002)', () => {
        it('Visit satırında geliş nedeni ve hazırlanan paket, planlı satırda randevu nedeni görünür', async () => {
            const prepared = item({ key: 'w', arrivalReason: 'Kulak kaşıntısı, 3 gündür', appointmentReasonName: 'Kontrol', preparedExaminationTemplateId: 't1', preparedExaminationTemplateName: 'Karma aşı' });
            const planned = item({ key: 'a1', visitId: null, appointmentId: 'a1', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T09:00:00Z', appointmentReasonName: 'Aşı' });
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [prepared, planned] });
            const el = f.nativeElement as HTMLElement;
            const reasons = Array.from(el.querySelectorAll('[data-testid="today-reason"]')).map((r) => r.textContent?.trim());

            expect(reasons).toEqual(['Kulak kaşıntısı, 3 gündür', 'Aşı']);
            expect(el.querySelector('[data-testid="today-prepared-template"]')?.textContent).toContain('Hazırlık: Karma aşı');
            expect(el.querySelector('[data-testid="today-reason"]')?.getAttribute('title')).toBe('Kulak kaşıntısı, 3 gündür');
        });

        it('hazırlık yoksa satırda neden/paket satırı oluşmaz', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item()] });

            expect((f.nativeElement as HTMLElement).querySelector('[data-testid="today-reason"]')).toBeNull();
            expect((f.nativeElement as HTMLElement).querySelector('[data-testid="today-prepared-template"]')).toBeNull();
        });

        it('"Hazırlığı düzenle" Visits.Update ile menüdedir; seçilince düzenleme diyaloğu satırla açılır, kayıtta liste yenilenir', async () => {
            const today: TodayVm = { date: 'd', activeHospitalizations: [], items: [item({ arrivalReason: 'Kusma' })] };
            const keys = (fx: ComponentFixture<TodayPageComponent>) => fx.componentInstance.secondaryActionsOf(today.items[0], fx.componentInstance.actionsOf(today.items[0])).map((a) => a.key);
            const without = await create(['Visits.Read'], today);

            expect(keys(without)).not.toContain('editPreparation');
            TestBed.resetTestingModule();

            const f = await create(['Visits.Read', 'Visits.Update'], today);
            const c = f.componentInstance;

            expect(keys(f)).toContain('editPreparation');
            c.openRowMenu(new Event('click'), today.items[0], [{ key: 'editPreparation', label: 'Hazırlığı düzenle', icon: 'pi pi-clipboard' }]);
            c.rowMenuItems()[0].command?.({});
            expect(c.preparationOpen()).toBe(true);
            expect(c.preparationItem()?.arrivalReason).toBe('Kusma');

            const callsBefore = vi.mocked(visits.getToday).mock.calls.length;

            c.onPreparationSaved();
            expect(vi.mocked(toasts).mock.lastCall![0]).toEqual(expect.objectContaining({ severity: 'success', summary: 'Hazırlık kaydedildi.' }));
            expect(vi.mocked(visits.getToday).mock.calls.length).toBe(callsBefore + 1);
        });

        it('created:false bilgisinde Visits.Update varsa hazırlığın değişmediği ve düzenleme yolu söylenir', async () => {
            const f = await create(['Visits.Read', 'Visits.Create', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [] });

            f.componentInstance.onArrived({ created: false, visit: { ...visitVm } });
            expect(vi.mocked(toasts).mock.lastCall![0].detail).toContain('Hazırlığı düzenle');
        });
    });

    it('otomatik yenileme hatasında eski liste kalır ve uyarı gösterilir', async () => {
        const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item()] });

        visits.getToday.mockReturnValue(throwError(() => new Error('x')));
        f.componentInstance.refresh('silent');
        f.detectChanges();

        expect(text(f)).toContain('Pamuk');
        expect(text(f)).toContain('Liste güncellenemedi');
    });
    describe('grup tabloları ve rozetler', () => {
        const noShowItem = (over: Partial<TodayItemVm> = {}) => item({ key: 'n', visitId: null, appointmentId: 'a1', careStatus: null, arrivedAtUtc: null, scheduledAtUtc: '2026-10-10T07:00:00Z', appointmentStatus: 'NoShow', ...over });
        const plannedItem = (over: Partial<TodayItemVm> = {}) =>
            item({ key: 'p', visitId: null, appointmentId: 'a2', careStatus: null, arrivedAtUtc: null, scheduledAtUtc: new Date(NOW.getTime() + 3600000).toISOString(), appointmentStatus: 'Scheduled', ...over });
        const groupRows = (f: ComponentFixture<TodayPageComponent>, group: string) => Array.from((f.nativeElement as HTMLElement).querySelectorAll(`tbody tr[data-group="${group}"]`)) as HTMLElement[];
        const groupHeaders = (f: ComponentFixture<TodayPageComponent>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('[data-testid="today-group-header"]')).map((h) => words(h));

        it('tek kart, tek tablo: ara başlıklar Klinikte, Sıradaki randevular, Tamamlandı, Gelmedi; sabit tablo düzeni ve başlık sayısı sütunlarla eşit', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'w' }), item({ key: 'i', visitId: 'i', careStatus: 'InProgress' }), plannedItem(), item({ key: 'c', visitId: 'c', careStatus: 'Completed', outstandingAmount: 50 }), noShowItem()]
            });
            const root = f.nativeElement as HTMLElement;
            const tables = Array.from(root.querySelectorAll('section table'));

            expect(root.querySelectorAll('[data-testid="today-list"]').length).toBe(1);
            expect(tables.length).toBe(1);
            expect(groupHeaders(f)).toEqual(['Klinikte 2', 'Sıradaki randevular 1', 'Tamamlandı 1', 'Gelmedi 1']);
            expect(getComputedStyle(tables[0]).tableLayout).toBe('fixed');
            expect(tables[0].querySelectorAll('thead th').length).toBe(7);
            expect(tables[0].querySelectorAll('colgroup col').length).toBe(7);
            expect(root.querySelector('[data-testid="today-group-header"] td')?.getAttribute('colspan')).toBe('7');
        });

        it('liste başlığı: Günlük liste, toplam ve durum sayımı (bekleniyor, sırada, muayenede, tamamlandı)', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'w' }), item({ key: 'i', visitId: 'i', careStatus: 'InProgress' }), plannedItem(), item({ key: 'c', visitId: 'c', careStatus: 'Completed' })]
            });
            const list = (f.nativeElement as HTMLElement).querySelector('[data-testid="today-list"]')!;
            const summary = Array.from(list.querySelectorAll('[data-testid="today-summary"] > span')).map((s) => s.textContent?.trim());

            expect(list.getAttribute('aria-label')).toBe('Günlük liste');
            expect(list.querySelector('h2')?.textContent).toBe('Günlük liste');
            expect(list.querySelector('[aria-label="4 kayıt"]')).not.toBeNull();
            expect(summary).toEqual(['1 bekleniyor', '1 sırada', '1 muayenede', '1 tamamlandı']);
        });

        it('saat tek değer: "Randevu" kelimesi yok; gelen randevulu hastada "geldi …", randevusuz gelişte "randevusuz", bitmiş işte not yok', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [
                    item({ key: 'w', appointmentId: 'a9', scheduledAtUtc: '2026-10-10T09:45:00Z' }),
                    item({ key: 'wi', visitId: 'wi' }),
                    plannedItem(),
                    item({ key: 'c', visitId: 'c', careStatus: 'Completed', scheduledAtUtc: '2026-10-10T07:00:00Z', arrivedAtUtc: '2026-10-10T06:58:00Z', outstandingAmount: 50 })
                ]
            });
            const times = Array.from((f.nativeElement as HTMLElement).querySelectorAll('tbody tr[data-today-row] td:first-child')).map((td) => words(td));

            expect(times).toEqual(['12:45 geldi 12:48', '12:48 randevusuz', '14:00', '10:00']);
            expect(text(f)).not.toContain('Randevu ');
        });

        it('bekleniyor satırı: içi boş halka ve randevuya kalan / geciken süre', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [plannedItem(), plannedItem({ key: 'late', appointmentId: 'a3', scheduledAtUtc: new Date(NOW.getTime() - 15 * 60000).toISOString() })] });
            const statuses = groupRows(f, 'planned').map((r) => r.querySelector('[data-testid="today-status"]')!);

            expect(statuses.map((s) => words(s))).toEqual(['Bekleniyor · 1 sa sonra', 'Bekleniyor · 15 dk gecikti']);
            expect(statuses[0].querySelector('span[aria-hidden="true"]')?.className).toContain('border-2');
        });

        it('Visit siz tamamlanmış randevu Tamamlandı altında ve "Randevu tamamlandı" değil "Tamamlandı" yazar', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [plannedItem({ key: 'ac', appointmentStatus: 'Completed', scheduledAtUtc: '2026-10-10T07:00:00Z' })] });

            expect(groupHeaders(f)).toEqual(['Tamamlandı 1']);
            expect(text(f)).not.toContain('Randevu tamamlandı');
            expect(text(f)).not.toContain('Sıradaki randevular');
        });

        it('tamamlananlar katlı: yalnız işi kalan görünür, "N tamamlanan kayıt daha göster" açar, "Tamamlananları gizle" kapatır; yenileme açık tutar', async () => {
            const done = (key: string, over: Partial<TodayItemVm> = {}) => item({ key, visitId: key, careStatus: 'Completed', petName: `Hasta ${key}`, ...over });
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'w' }), done('c1'), done('c2', { outstandingAmount: 850, chargeIndicator: 'PaymentPending' }), done('c3'), done('c4', { awaitingLabCount: 1 })]
            });
            const root = f.nativeElement as HTMLElement;
            const completedPets = () => groupRows(f, 'completed').map((r) => r.querySelector('[data-testid="today-pet-link"]')?.textContent?.trim());
            const toggle = () => root.querySelector('[data-testid="today-completed-toggle"]') as HTMLButtonElement;

            expect(groupHeaders(f)).toContain('Tamamlandı 4');
            expect(completedPets()).toEqual(['Hasta c2', 'Hasta c4']);
            expect(toggle().textContent?.trim()).toBe('2 tamamlanan kayıt daha göster');
            expect(toggle().getAttribute('aria-expanded')).toBe('false');

            toggle().click();
            f.detectChanges();
            expect(completedPets()).toEqual(['Hasta c1', 'Hasta c2', 'Hasta c3', 'Hasta c4']);
            expect(toggle().textContent?.trim()).toBe('Tamamlananları gizle');

            f.componentInstance.refresh('silent');
            f.detectChanges();
            expect(completedPets().length).toBe(4);

            toggle().click();
            f.detectChanges();
            expect(completedPets()).toEqual(['Hasta c2', 'Hasta c4']);
        });

        it('tamamlananların hepsinde iş kaldıysa açma satırı çizilmez; bitmiş satır alçak ve soluk', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'c', careStatus: 'Completed', outstandingAmount: 10 }), item({ key: 'w', visitId: 'w' })] });
            const root = f.nativeElement as HTMLElement;
            const [done] = groupRows(f, 'completed');
            const [open] = groupRows(f, 'clinic');

            expect(root.querySelector('[data-testid="today-completed-toggle"]')).toBeNull();
            expect(done.getAttribute('data-today-row')).toBe('done');
            expect(done.className).toContain('[&>td]:h-[38px]');
            expect(open.className).toContain('[&>td]:h-[46px]');
            expect(done.querySelector('[data-testid="today-pet-link"]')?.className).not.toContain('text-primary');
            expect(open.querySelector('[data-testid="today-pet-link"]')?.className).toContain('text-primary');
        });

        it('taslak ölçüleri: px sütun genişlikleri, küçük soluk başlıklar, düz yazılı ara başlık; müşteri adı düz metin renginde', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'w', clientPhone: '905439580091' })] });
            const root = f.nativeElement as HTMLElement;
            const cols = Array.from(root.querySelectorAll('colgroup col')).map((c) => Array.from(c.classList).find((k) => k.startsWith('w-')));
            const wrapper = root.querySelector('table')!.closest('.overflow-x-auto') as HTMLElement;
            const groupCell = root.querySelector('[data-testid="today-group-header"] td') as HTMLElement;
            const client = root.querySelector('[data-testid="today-client-link"]') as HTMLElement;

            expect(cols).toEqual(['w-[80px]', 'w-[220px]', 'w-[230px]', 'w-[160px]', 'w-[180px]', 'w-auto', 'w-[230px]']);
            expect(wrapper.className).toContain('[&_th]:text-[12px]!');
            expect(wrapper.className).toContain('[&_th]:text-muted-color!');
            expect(groupCell.className).toContain('text-[13px]!');
            expect(groupCell.className).toContain('font-semibold');
            expect(client.className).toContain('text-color');
            expect(client.className).not.toContain('text-primary');
            expect(client.closest('td')?.textContent).toContain('+90 543 958 00 91');
        });

        it('Gelmedi satırında ödeme çipi ve kalan yok; durum soluk "Gelmedi", planlanan saat görünür; yatış rozeti yine görünür', async () => {
            const money = { chargeIndicator: 'PaymentPending' as const, chargedAmount: 1000, allocatedAmount: 0, outstandingAmount: 1000 };
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [noShowItem({ ...money, hasActiveHospitalization: true }), item({ key: 'w', ...money })] });
            const [row] = groupRows(f, 'noShow');

            expect(row.textContent).not.toContain('Ödeme bekliyor');
            expect(row.textContent).not.toContain('Kalan');
            expect(row.querySelector('[data-testid="today-status"]')?.textContent?.trim()).toBe('Gelmedi');
            expect(row.querySelector('td')?.textContent?.trim()).toBe('10:00');
            expect(row.textContent).toContain('Yatışta');
            expect(groupRows(f, 'clinic')[0].textContent).toContain('Ödeme bekliyor');
        });

        it('dar kapsayıcı: Hekim (<72 rem) ve Neden / not (<64 rem) gizlenir; hekim adı Hasta hücresine, açık iş çipleri Durum hücresine iner; başlıklar tek satır', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'w', isCarriedOver: true, hasActiveHospitalization: true, chargeIndicator: 'PaymentPending', chargedAmount: 1000, allocatedAmount: 0, outstandingAmount: 1000 })]
            });
            const host = f.nativeElement as HTMLElement;
            const ths = Array.from(host.querySelectorAll('thead th'));
            const cols = Array.from(host.querySelectorAll('colgroup col')).map((c) => c.className);
            const cells = Array.from(host.querySelectorAll<HTMLTableCellElement>('tbody tr[data-today-row] td'));

            expect(ths.every((th) => th.classList.contains('whitespace-nowrap'))).toBe(true);
            expect(ths.map((th) => th.textContent?.trim())).toEqual(['Saat', 'Hasta', 'Müşteri', 'Hekim', 'Durum', 'Neden / not', 'İşlem']);
            expect(ths[6].classList).toContain('text-right');
            expect(cols[3]).toContain('@max-[72rem]:hidden');
            expect(cols[5]).toContain('@max-[64rem]:hidden');
            expect(cells[3].className).toContain('@max-[72rem]:hidden');
            expect(cells[5].className).toContain('@max-[64rem]:hidden');
            const fallback = (cls: string) => Array.from(host.querySelectorAll('tbody *')).filter((e) => e.classList.contains(cls));

            expect(fallback('@min-[72rem]:hidden').some((e) => e.textContent?.includes('Dr. Ayşe'))).toBe(true);
            expect(fallback('@min-[64rem]:hidden').some((e) => e.textContent?.includes('Ödeme bekliyor'))).toBe(true);
            expect(cells[4].textContent).toContain('Yatışta');
            expect(cells[4].textContent).toContain('Önceki günden açık');
        });

        it('uzun ad 2 satıra sarar ve tam adı ipucuyla (title) gösterilir: Müşteri, Hasta, Hekim', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'w', clientName: 'Çok Uzun İsimli Müşteri Soyadıgeçen', petName: 'Çok uzun hasta adı', responsibleVeterinarianName: 'Dr. Çok Uzun Hekim Adı' })]
            });
            const host = f.nativeElement as HTMLElement;
            const titled = Array.from(host.querySelectorAll('tbody [title]')).map((e) => e.getAttribute('title'));

            expect(titled).toContain('Çok Uzun İsimli Müşteri Soyadıgeçen');
            expect(titled).toContain('Çok uzun hasta adı');
            expect(titled).toContain('Dr. Çok Uzun Hekim Adı');
        });

        it('satır başına tek birincil adım sağda, klinikteyse önünde Muayene aç, "⋯" hemen yanında; acil satırda düğme değil', async () => {
            const claims = ['Visits.Read', 'Visits.Create', 'Visits.Update', 'Visits.Correct', 'Examinations.Create', 'Payments.Create'];
            const f = await create(claims, {
                date: 'd',
                activeHospitalizations: [],
                items: [
                    item({ key: 'w' }),
                    item({ key: 'i', visitId: 'i', careStatus: 'InProgress' }),
                    plannedItem(),
                    item({ key: 'c', visitId: 'c', careStatus: 'Completed', outstandingAmount: 850 }),
                    item({ key: 'c2', visitId: 'c2', careStatus: 'Completed', outstandingAmount: 0, chargeIndicator: 'ChargeMissing' })
                ]
            });
            const host = f.nativeElement as HTMLElement;
            const actionsOf = (row: HTMLElement) => Array.from(row.querySelectorAll('td:last-child button')).map((b) => b.getAttribute('aria-label'));
            const rows = Array.from(host.querySelectorAll('tbody tr[data-today-row]')) as HTMLElement[];

            expect(rows.map(actionsOf)).toEqual([['Muayeneye al', 'Diğer işlemler'], ['Muayene aç', 'Tamamla', 'Diğer işlemler'], ['Geldi', 'Diğer işlemler'], ['Ödeme al', 'Diğer işlemler'], ['Diğer işlemler']]);
            const container = rows[0].querySelector('td:last-child > div') as HTMLElement;

            expect(container.className).toContain('justify-end');
            expect(container.className).not.toContain('grid');
            expect(host.querySelector('tbody button[aria-label="Acil işaretle"], tbody button[aria-label="Acili kaldır"]')).toBeNull();
            // Dar tabloda (<50 rem) yalnız simge; etiket gizlenir, erişilebilir ad kalır
            expect(rows[0].querySelector('td:last-child button span')?.className).toContain('@max-[50rem]:hidden');
        });

        it('Muayene aç: gelişin muayenesi varsa onu açar, yoksa yeni muayene', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [] });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            f.componentInstance.openExamination(item({ visitId: 'v1', careStatus: 'InProgress', latestExaminationId: 'e9' }));
            expect(navigate).toHaveBeenCalledWith(['/panel/examinations', 'e9']);

            f.componentInstance.openExamination(item({ visitId: 'v2', clientId: 'cl2', petId: 'p2', careStatus: 'InProgress', latestExaminationId: null }));
            expect(navigate).toHaveBeenCalledWith(['/panel/examinations/new'], { queryParams: { visitId: 'v2', clientId: 'cl2', petId: 'p2' } });
        });

        it('Muayeneye al: başlatır ve muayene formunu o gelişle açar; muayene izni yoksa yalnız başlatır', async () => {
            const waiting = item({ key: 'w', visitId: 'v1', clientId: 'cl1', petId: 'p1' });
            const f = await create(['Visits.Read', 'Visits.Update', 'Examinations.Create'], { date: 'd', activeHospitalizations: [], items: [waiting] });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            visits.startVisit.mockReturnValue(of(visitVm));
            ((f.nativeElement as HTMLElement).querySelector('[data-testid="today-take-in"]') as HTMLButtonElement).click();
            await vi.advanceTimersByTimeAsync(0);
            expect(visits.startVisit).toHaveBeenCalledWith('v1');
            expect(navigate).toHaveBeenCalledWith(['/panel/examinations/new'], { queryParams: { visitId: 'v1', clientId: 'cl1', petId: 'p1' } });
            TestBed.resetTestingModule();

            const g = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [waiting] });
            const navigate2 = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            visits.startVisit.mockReturnValue(of(visitVm));
            ((g.nativeElement as HTMLElement).querySelector('[data-testid="today-take-in"]') as HTMLButtonElement).click();
            await vi.advanceTimersByTimeAsync(0);
            expect(navigate2).not.toHaveBeenCalledWith(['/panel/examinations/new'], expect.anything());
            expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Muayeneye alındı.' }));
        });

        it('muayene ve ücret yokken Tamamla önce sorar; Ücretsiz tamamla withoutCharge ile kapatır, Ücret ekle ücret formuna gider', async () => {
            const bare = item({ key: 'i', visitId: 'v2', clientId: 'cl2', petId: 'p2', careStatus: 'InProgress', chargeIndicator: 'NoChargeableWork', pendingChargeCount: 0 });
            const f = await create(['Visits.Read', 'Visits.Update', 'Charges.Create', 'Examinations.Create'], { date: 'd', activeHospitalizations: [], items: [bare] });
            const host = f.nativeElement as HTMLElement;
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            (host.querySelector('tbody button[aria-label="Tamamla"]') as HTMLButtonElement).click();
            f.detectChanges();
            expect(visits.completeVisit).not.toHaveBeenCalled();
            expect(f.componentInstance.completePromptItem()).toBe(bare);

            f.componentInstance.promptOpenCharge(bare);
            expect(navigate).toHaveBeenCalledWith(['/panel/charges/new'], { queryParams: { clientId: 'cl2', petId: 'p2', visitId: 'v2' } });
            expect(f.componentInstance.completePromptItem()).toBeNull();

            visits.completeVisit.mockReturnValue(of(visitVm));
            f.componentInstance.requestComplete(bare);
            f.componentInstance.completeWithoutCharge(bare);
            await vi.advanceTimersByTimeAsync(0);
            expect(visits.completeVisit).toHaveBeenCalledWith('v2', { withoutCharge: true });
            expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Ücretsiz tamamlandı.' }));
        });

        it('işlemi ya da ücreti olan gelişte Tamamla sormadan kapatır', async () => {
            const withWork = item({ key: 'i', visitId: 'v3', careStatus: 'InProgress', chargeIndicator: 'ChargeMissing', chargeableWorkCount: 1 });
            const f = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [withWork] });

            visits.completeVisit.mockReturnValue(of(visitVm));
            f.componentInstance.requestComplete(withWork);
            await vi.advanceTimersByTimeAsync(0);
            expect(f.componentInstance.completePromptItem()).toBeNull();
            expect(visits.completeVisit).toHaveBeenCalledWith('v3', {});
        });

        it('tamamlanmış ve hiç ücreti olmayan satırda birincil adım Ücret ekle (Charges.Create ile)', async () => {
            const done = item({ key: 'c', visitId: 'v4', clientId: 'cl4', petId: 'p4', careStatus: 'Completed', chargeIndicator: 'ChargeMissing', outstandingAmount: 0 });
            const without = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [done] });

            expect((without.nativeElement as HTMLElement).querySelector('[data-testid="today-add-missing-charge"]')).toBeNull();
            TestBed.resetTestingModule();

            const f = await create(['Visits.Read', 'Charges.Create'], { date: 'd', activeHospitalizations: [], items: [done] });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            ((f.nativeElement as HTMLElement).querySelector('[data-testid="today-add-missing-charge"]') as HTMLButtonElement).click();
            expect(navigate).toHaveBeenCalledWith(['/panel/charges/new'], { queryParams: { clientId: 'cl4', petId: 'p4', visitId: 'v4' } });
        });

        it('tamamlanmış satırın "Ödeme al" düğmesi müşteri ve geliş bağlamıyla ödeme formuna gider; yetki yoksa düğme yok', async () => {
            const done = item({ key: 'c', visitId: 'v5', clientId: 'cl5', careStatus: 'Completed', outstandingAmount: 850 });
            const without = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [done] });

            expect((without.nativeElement as HTMLElement).querySelector('[data-testid="today-collect-remaining"]')).toBeNull();
            TestBed.resetTestingModule();

            const f = await create(['Visits.Read', 'Payments.Create'], { date: 'd', activeHospitalizations: [], items: [done] });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            ((f.nativeElement as HTMLElement).querySelector('[data-testid="today-collect-remaining"]') as HTMLButtonElement).click();
            expect(navigate).toHaveBeenCalledWith(['/panel/payments/new'], { queryParams: { clientId: 'cl5', visitId: 'v5' } });
        });

        it('acil ⋯ menüsünden işaretlenir; işaretli satırda hasta adının yanında "Acil" etiketi', async () => {
            const today: TodayVm = { date: 'd', activeHospitalizations: [], items: [item({ visitId: 'v7' })] };
            const f = await create(['Visits.Read', 'Visits.Update'], today);
            const c = f.componentInstance;
            const more = c.secondaryActionsOf(today.items[0], c.actionsOf(today.items[0]));

            c.openRowMenu(new Event('click'), today.items[0], more);
            const urgent = c.rowMenuItems().find((m) => m.label === 'Acil olarak işaretle')!;

            urgent.command?.({});
            expect(visits.setUrgency).toHaveBeenCalledWith('v7', true);
            TestBed.resetTestingModule();

            const marked = await create(['Visits.Read', 'Visits.Update'], { date: 'd', activeHospitalizations: [], items: [item({ isUrgent: true })] });
            const petCell = (marked.nativeElement as HTMLElement).querySelector('[data-testid="today-pet-link"]')!.parentElement!;

            expect(petCell.textContent).toContain('Acil');
            expect(marked.componentInstance.secondaryActionsOf(item({ isUrgent: true }), marked.componentInstance.actionsOf(item({ isUrgent: true }))).map((a) => a.label)).toContain('Acil işaretini kaldır');
        });

        it('müşteri onayı ve hazırlık tabloda simge; tam metin ipucunda ve ekran okuyucuda', async () => {
            const f = await create(['Visits.Read'], {
                date: 'd',
                activeHospitalizations: [],
                items: [plannedItem({ ownerConfirmedAtUtc: '2026-10-09T18:00:00Z', appointmentReasonName: 'Karma aşı' }), item({ key: 'w', preparedExaminationTemplateId: 't1', preparedExaminationTemplateName: 'Karma aşı paketi' })]
            });
            const root = f.nativeElement as HTMLElement;
            const confirmed = root.querySelector('[data-testid="today-owner-confirmed"]')!;
            const prepared = root.querySelector('[data-testid="today-prepared-template"]')!;

            expect(confirmed.querySelector('i.pi-check-circle')).not.toBeNull();
            expect(confirmed.querySelector('.sr-only')?.textContent).toBe('Müşteri onayladı');
            expect(prepared.querySelector('i.pi-clone')).not.toBeNull();
            expect(prepared.getAttribute('title')).toBe('Gelişte hazırlanan şablon / paket: Karma aşı paketi');
            expect(root.querySelector('tbody p-tag')).toBeNull();
        });

        it('Önceki günden açık rozeti sönük (secondary) ve ipucu metni var', async () => {
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ isCarriedOver: true })] });
            const tagHost = Array.from((f.nativeElement as HTMLElement).querySelectorAll('span[title]')).find((e) => e.textContent?.includes('Önceki günden')) as HTMLElement;

            expect(tagHost).toBeDefined();
            expect(tagHost.getAttribute('title')).toBe('Önceki günden kalan açık geliş; tamamlayın veya hatalı işaretleyin');
            const tag = tagHost.querySelector('.p-tag')!;

            expect(tag.classList.contains('p-tag-secondary')).toBe(true);
            expect(tag.classList.contains('p-tag-contrast')).toBe(false);
        });

        it('12 saati aşan açık gelişte sönük "Unutulmuş olabilir" ipucu; kısa sürede ve tamamlananda yok', async () => {
            const old = new Date(NOW.getTime() - 13 * 3600000).toISOString();
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'old', arrivedAtUtc: old }), item({ key: 'new' }), item({ key: 'done', careStatus: 'Completed', arrivedAtUtc: old })] });
            const hints = ((f.nativeElement as HTMLElement).textContent ?? '').match(/Unutulmuş olabilir/g) ?? [];

            expect(hints.length).toBe(1);
        });
    });

    describe('dar ekranda kart düzeni', () => {
        const narrow = (matches: boolean) => vi.spyOn(window, 'matchMedia').mockReturnValue({ matches, addEventListener: () => undefined, removeEventListener: () => undefined } as unknown as MediaQueryList);
        const today: TodayVm = {
            date: 'd',
            activeHospitalizations: [],
            items: [item({ key: 'a', clientPhone: '905439580091', chargeIndicator: 'PartiallyPaid', outstandingAmount: 600, chargedAmount: 1000, allocatedAmount: 400 }), item({ key: 'b', petName: 'Boncuk' })]
        };

        it('dar ekranda satır başına bir kart; tablo yok; alanlar ve eylemler kartta', async () => {
            narrow(true);
            const f = await create(['Visits.Read', 'Visits.Update', 'Examinations.Create'], today);
            const root = f.nativeElement as HTMLElement;
            const cards = Array.from(root.querySelectorAll('[data-testid="today-card"]'));

            expect(cards.length).toBe(2);
            expect(root.querySelector('table')).toBeNull();
            const t = words(cards[0]);

            for (const part of ['12:48 randevusuz', 'Pamuk Kedi', 'Ali Veli', 'Dr. Ayşe', 'Sırada · 12 dk', 'Kısmi ödeme Kalan ₺600,00', 'Muayeneye al']) {
                expect(t).toContain(part);
            }

            expect(t).not.toContain('Geliş');
            // Ortak kurallar kartta da: ara başlık, tek saat, nokta durum, tek birincil adım (etiketler açık)
            expect(Array.from(root.querySelectorAll('[data-testid="today-group-header"]')).map((h) => words(h))).toEqual(['Klinikte 2']);
            expect(Array.from(cards[0].querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['Muayeneye al', 'Diğer işlemler']);
        });

        it('dar ekranda da tamamlananlar katlıdır; açma düğmesi kartlar arasında', async () => {
            narrow(true);
            const f = await create(['Visits.Read'], { date: 'd', activeHospitalizations: [], items: [item({ key: 'c1', careStatus: 'Completed' }), item({ key: 'c2', visitId: 'c2', careStatus: 'Completed' })] });
            const root = f.nativeElement as HTMLElement;

            expect(root.querySelectorAll('[data-testid="today-card"]').length).toBe(0);
            (root.querySelector('[data-testid="today-completed-toggle"]') as HTMLButtonElement).click();
            f.detectChanges();
            expect(root.querySelectorAll('[data-testid="today-card"]').length).toBe(2);
        });

        it('geniş ekranda tablo düzeni değişmez', async () => {
            narrow(false);
            const f = await create(['Visits.Read'], today);
            const root = f.nativeElement as HTMLElement;

            expect(root.querySelector('[data-testid="today-card"]')).toBeNull();
            expect(root.querySelectorAll('section table tbody tr[data-today-row]').length).toBe(2);
        });

        describe('hasta uyarı rozetleri (CHECKIN-013)', () => {
            const note = 'Penisilin alerjisi; muayenede ağızlık kullanın ve sahibi yanında bulunsun, sakinleştirici öncesi hekime danışın';
            const alerted: TodayVm = {
                date: 'd',
                activeHospitalizations: [],
                items: [item({ key: 'a', petAlerts: { flags: ['Allergy', 'Aggressive', 'ChronicCondition', 'AnesthesiaRisk'], note } }), item({ key: 'b', petName: 'Boncuk' })]
            };
            const badgeGroups = (root: HTMLElement) => Array.from(root.querySelectorAll('app-pet-alert-badges [role="group"]')) as HTMLElement[];

            for (const compact of [false, true]) {
                it(`${compact ? 'kart' : 'tablo'}: paylaşılan rozet bileşeni tüm uyarıları etiketle gösterir, uyarısız satırda rozet yok, not görünür`, async () => {
                    narrow(compact);
                    const f = await create(['Visits.Read'], alerted);
                    const root = f.nativeElement as HTMLElement;
                    const [group, ...rest] = badgeGroups(root);

                    expect(rest.length).toBe(0);
                    expect(Array.from(group.querySelectorAll('p-tag')).map((t) => t.textContent?.trim())).toEqual(['Alerji', 'Agresif', 'Kronik hastalık', 'Anestezi riski']);
                    expect(group.getAttribute('aria-label')).toBe(`Hasta uyarıları: Alerji, Agresif, Kronik hastalık, Anestezi riski — ${note}`);

                    const notes = Array.from(root.querySelectorAll('[data-testid="today-alert-note"]')) as HTMLElement[];

                    expect(notes.length).toBe(1);
                    expect(notes[0].textContent?.trim()).toBe(note);
                    expect(notes[0].getAttribute('title')).toBe(note);
                    // Dar sütun/kartta rozetler sarar; hasta adını sıkıştırıp taşmaz
                    expect(notes[0].className).toContain(compact ? 'line-clamp-2' : 'truncate');
                    expect(group.closest('app-pet-alert-badges')?.className).not.toContain('shrink-0');
                    expect(group.closest('app-pet-alert-badges')?.parentElement?.className).toContain('flex-wrap');
                });
            }
        });

        describe('aktif yatışlar', () => {
            const withHosp: TodayVm = {
                date: 'd',
                items: [],
                activeHospitalizations: [
                    { hospitalizationId: 'h1', petId: 'p1', petName: 'Pamuk', clientName: 'Ali Veli', admittedAtUtc: new Date(NOW.getTime() - 3 * 86400000 - 60000).toISOString(), plannedDischargeAtUtc: null },
                    { hospitalizationId: 'h2', petId: 'p2', petName: 'Boncuk', clientName: 'Ayşe Kaya', admittedAtUtc: new Date(NOW.getTime() - 86400000 - 60000).toISOString(), plannedDischargeAtUtc: null }
                ]
            };

            it('dar ekranda yatış başına bir kart; tablo yok; alanlar ve bağlantı kartta', async () => {
                narrow(true);
                const f = await create(['Visits.Read', 'Hospitalizations.Read'], withHosp);
                const root = f.nativeElement as HTMLElement;
                const cards = Array.from(root.querySelectorAll('[data-testid="hospitalization-card"]'));

                expect(cards.length).toBe(2);
                expect(root.querySelector('section[aria-label="Aktif yatışlar"] table')).toBeNull();
                const t = cards[0].textContent ?? '';

                for (const part of ['Pamuk', 'Ali Veli', 'Giriş', '3 gün', 'Planlı taburcu']) {
                    expect(t).toContain(part);
                }

                expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/panel/hospitalizations/h1');
            });

            it('dar ekranda Hospitalizations.Read yoksa kartta bağlantı yok', async () => {
                narrow(true);
                const f = await create(['Visits.Read'], withHosp);
                const root = f.nativeElement as HTMLElement;

                expect(root.querySelectorAll('[data-testid="hospitalization-card"]').length).toBe(2);
                expect(root.querySelector('[data-testid="hospitalization-card"] a')).toBeNull();
            });

            it('geniş ekranda yatışlar tabloda kalır', async () => {
                narrow(false);
                const f = await create(['Visits.Read'], withHosp);
                const root = f.nativeElement as HTMLElement;

                expect(root.querySelector('[data-testid="hospitalization-card"]')).toBeNull();
                expect(root.querySelectorAll('section[aria-label="Aktif yatışlar"] tbody tr').length).toBe(2);
            });
        });
    });
});

describe('TodayPageComponent — Benim hastalarım', () => {
    // Liste ve kapsam seçimi tarayıcıda saklanır; testler birbirinin seçimini görmesin.
    beforeEach(() => localStorage.clear());

    const today: TodayVm = { date: 'd', activeHospitalizations: [], items: [] };
    let visits: MockedObject<VisitsService>;

    const create = async (claims: string[], vetUserId: string | null): Promise<ComponentFixture<TodayPageComponent>> => {
        visits = {
            getToday: vi.fn().mockName('VisitsService.getToday'),
            getVeterinarians: vi.fn().mockName('VisitsService.getVeterinarians'),
            getCurrentVeterinarianUserId: vi.fn().mockName('VisitsService.getCurrentVeterinarianUserId')
        } as unknown as MockedObject<VisitsService>;
        visits.getToday.mockReturnValue(of(today));
        visits.getVeterinarians.mockReturnValue(of([]));
        visits.getCurrentVeterinarianUserId.mockReturnValue(of(vetUserId));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                { provide: EDocumentsService, useValue: eDocumentsStub },
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'c1', getUserId: () => 'u1', getAccessToken: () => null } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false, lockedPlanFeature: () => null, planFeatureReady: () => true } },
                // Bekleme listesi bilgisi (TIER-018): bu testlerde boşalan saat yok.
                { provide: WaitlistService, useValue: { today: () => of({ waitingCount: 0, releasedSlots: [] }) } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } },
                // Bekleyen online talepler: bu testlerde talep yok.
                { provide: AppointmentRequestsService, useValue: { list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 5 }) } },
                // Talep penceresinin onay servisi: bu testlerde onay/red yapılmaz.
                { provide: OnlineBookingService, useValue: {} }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(TodayPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    it('hekim: varsayılan Benim hastalarım; ilk istek kullanıcı kimliğiyle gider, Tümü süzgeci kaldırır', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], 'u1');

        expect(visits.getToday).toHaveBeenCalledTimes(1);

        expect(visits.getToday).toHaveBeenCalledWith({ voided: false, responsibleVeterinarianUserId: 'u1' });
        f.componentInstance.setScope('all');
        expect(vi.mocked(visits.getToday).mock.lastCall![0]).toEqual({ voided: false });
    });

    it('hekim değil: süzgeç görünmez, kimlik gönderilmez', async () => {
        const f = await create(['Visits.Read', 'Visits.Create'], null);

        expect(visits.getToday).toHaveBeenCalledTimes(1);

        expect(visits.getToday).toHaveBeenCalledWith({ voided: false });
        expect((f.nativeElement as HTMLElement).textContent).not.toContain('Benim hastalarım');
    });

    it('menü sayacı: filtresiz listede bekleyen sayısı bildirilir, Benim hastalarım ve sayfa kapanınca bırakılır', async () => {
        const waiting = { key: 'w', careStatus: 'Waiting' } as TodayItemVm;
        const f = await create(['Visits.Read', 'Visits.Create'], 'u1');
        const feed = TestBed.inject(MenuBadgeFeed);

        expect(feed.value('waitingVisits')).toBeUndefined();

        visits.getToday.mockReturnValue(of({ ...today, items: [waiting, waiting] }));
        f.componentInstance.setScope('all');
        expect(feed.value('waitingVisits')).toBe(2);

        f.componentInstance.setScope('mine');
        expect(feed.value('waitingVisits')).toBeUndefined();

        f.componentInstance.setScope('all');
        f.destroy();
        expect(feed.value('waitingVisits')).toBeUndefined();
    });

    it('Visits.Create yoksa hekim sorgusu yapılmaz ve süzgeç yok', async () => {
        await create(['Visits.Read'], 'u1');
        expect(visits.getCurrentVeterinarianUserId).not.toHaveBeenCalled();
        expect(visits.getToday).toHaveBeenCalledTimes(1);
        expect(visits.getToday).toHaveBeenCalledWith({ voided: false });
    });
});

describe('TodayPageComponent — Benim hastalarım boş liste', () => {
    beforeEach(() => localStorage.clear());

    it('hekimin listesi boşken Size atanmış hasta yok mesajı ve Tümü’ne geç bağlantısı çıkar', async () => {
        const visits = {
            getToday: vi.fn().mockName('VisitsService.getToday'),
            getVeterinarians: vi.fn().mockName('VisitsService.getVeterinarians'),
            getCurrentVeterinarianUserId: vi.fn().mockName('VisitsService.getCurrentVeterinarianUserId')
        };

        visits.getToday.mockReturnValue(of({ date: 'd', activeHospitalizations: [], items: [] }));
        visits.getCurrentVeterinarianUserId.mockReturnValue(of('u1'));
        await TestBed.configureTestingModule({
            imports: [TodayPageComponent],
            providers: [
                { provide: EDocumentsService, useValue: eDocumentsStub },
                provideRouter([]),
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => c !== 'Visits.None', getClinicId: () => 'c1', getUserId: () => 'u1', getAccessToken: () => null } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false, lockedPlanFeature: () => null, planFeatureReady: () => true } },
                // Bekleme listesi bilgisi (TIER-018): bu testlerde boşalan saat yok.
                { provide: WaitlistService, useValue: { today: () => of({ waitingCount: 0, releasedSlots: [] }) } },
                { provide: AppointmentsService, useValue: {} },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [] }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } },
                // Bekleyen online talepler: bu testlerde talep yok.
                { provide: AppointmentRequestsService, useValue: { list: () => of({ items: [], totalCount: 0, page: 1, pageSize: 5 }) } },
                // Talep penceresinin onay servisi: bu testlerde onay/red yapılmaz.
                { provide: OnlineBookingService, useValue: {} }
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
        expect(vi.mocked(visits.getToday).mock.lastCall![0]).toEqual({ voided: false });
        f.detectChanges();
        expect((f.nativeElement as HTMLElement).textContent).toContain('Bugün için randevu veya gelen hasta yok.');
    });
});
