import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/core/auth/auth.service';
import { FIRST_WEEK_GUIDE_AUTO_DAYS, FirstWeekGuideService, isFirstWeekGuideVisible, type FirstWeekGuideState } from '@/app/entities/first-week-guide/services/first-week-guide.service';

const token = (payload: Record<string, unknown>) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;
const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date('2026-11-01T09:00:00Z');
const daysLater = (days: number) => new Date(start.getTime() + days * DAY_MS);

describe('FirstWeekGuideService', () => {
    let session: { userId: string | null; tenantId: string | null };
    let service: FirstWeekGuideService;

    const visible = (now: Date) => isFirstWeekGuideVisible(service.state()!, now);

    beforeEach(() => {
        localStorage.clear();
        session = { userId: 'u1', tenantId: 't1' };
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        getUserId: () => session.userId,
                        getAccessToken: () => (session.tenantId ? token({ sub: session.userId, tenant_id: session.tenantId }) : null)
                    }
                }
            ]
        });
        service = TestBed.inject(FirstWeekGuideService);
    });

    afterEach(() => localStorage.clear());

    it('ilk açılışta ilk görülme anını yazar; sonraki açılış aynı anı okur', () => {
        service.load(start);
        service.load(daysLater(3));

        expect(service.state()?.firstSeenAt).toBe(start.toISOString());
        expect(service.state()?.done).toEqual([]);
    });

    it(`ilk görüldüğünden ${FIRST_WEEK_GUIDE_AUTO_DAYS} gün kendiliğinden görünür, sonra görünmez`, () => {
        service.load(start);

        expect(visible(daysLater(FIRST_WEEK_GUIDE_AUTO_DAYS - 1))).toBe(true);
        expect(visible(daysLater(FIRST_WEEK_GUIDE_AUTO_DAYS))).toBe(false);
    });

    it('kapatılınca 14 gün içinde de görünmez; yeniden açılınca 14 gün geçmiş olsa da kapatılana kadar görünür', () => {
        service.load(start);
        service.dismiss();

        expect(visible(daysLater(1))).toBe(false);

        service.reopen();

        expect(visible(daysLater(30))).toBe(true);

        service.dismiss();

        expect(visible(daysLater(30))).toBe(false);
    });

    it('kapatma ve işaretler kalıcıdır (yeniden yükleme sonrası da geçerli)', () => {
        service.load(start);
        service.markDone(['appointment']);
        service.toggle('endOfDay');
        service.dismiss();

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { getUserId: () => 'u1', getAccessToken: () => token({ tenant_id: 't1' }) } }] });
        const reloaded = TestBed.inject(FirstWeekGuideService);

        reloaded.load(daysLater(1));

        expect(reloaded.state()).toEqual<FirstWeekGuideState>({ firstSeenAt: start.toISOString(), dismissed: true, reopened: false, done: ['appointment', 'endOfDay'] });
    });

    it('elle işaret geri alınabilir; aynı adım iki kez işaretlenmez', () => {
        service.load(start);
        service.markDone(['visit']);
        service.markDone(['visit', 'payment']);
        service.toggle('visit');

        expect(service.state()?.done).toEqual(['payment']);
    });

    it('kart açılmadan gelen işaret de saklanır ve kart açılınca görünür', () => {
        service.markDone(['examination']);
        service.load(start);

        expect(service.state()?.done).toEqual(['examination']);
    });

    it('durum kullanıcı ve kiracı başınadır', () => {
        service.load(start);
        service.markDone(['appointment']);

        session = { userId: 'u2', tenantId: 't1' };
        service.load(start);
        expect(service.state()?.done).toEqual([]);

        session = { userId: 'u1', tenantId: 't2' };
        service.load(start);
        expect(service.state()?.done).toEqual([]);
    });

    it('oturum yoksa durum okunmaz ve yazılmaz', () => {
        session = { userId: null, tenantId: null };
        service.load(start);
        service.markDone(['appointment']);

        expect(service.state()).toBeNull();
        expect(localStorage.length).toBe(0);
    });

    it('depolama erişilemezse rehber bu oturumda çalışır', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });

        service.load(start);
        service.markDone(['visit']);
        service.dismiss();

        expect(service.state()).toMatchObject({ dismissed: true, done: ['visit'] });
    });
});
