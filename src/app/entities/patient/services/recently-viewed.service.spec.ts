import { TestBed } from '@angular/core/testing';
import { AuthService } from '@/app/core/auth/auth.service';
import { RECENTLY_VIEWED_LIMIT, RecentlyViewedService, recentlyViewedRoute } from './recently-viewed.service';

const token = (payload: Record<string, unknown>) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

describe('RecentlyViewedService', () => {
    let session: { userId: string | null; tenantId: string | null };
    let claims: Set<string>;
    let service: RecentlyViewedService;

    const pet = (id: string, title = `Hasta ${id}`) => ({ kind: 'pet' as const, id, title, subtitle: 'Kedi · Ali Veli' });

    beforeEach(() => {
        localStorage.clear();
        session = { userId: 'u1', tenantId: 't1' };
        claims = new Set(['Clients.Read', 'Pets.Read', 'Examinations.Read']);
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        getUserId: () => session.userId,
                        getAccessToken: () => (session.tenantId ? token({ sub: session.userId, tenant_id: session.tenantId }) : null),
                        hasOperationClaim: (c: string) => claims.has(c)
                    }
                }
            ]
        });
        service = TestBed.inject(RecentlyViewedService);
    });

    afterEach(() => localStorage.clear());

    it('en yeni önce listeler; aynı kayıt yeniden açılınca tekrarlanmaz, en üste taşınır ve başlığı güncellenir', () => {
        service.record(pet('p1'));
        service.record({ kind: 'client', id: 'c1', title: 'Ali Veli', subtitle: '' });
        service.record(pet('p1', 'Pamuk'));

        expect(service.list().map((e) => `${e.kind}:${e.id}:${e.title}`)).toEqual(['pet:p1:Pamuk', 'client:c1:Ali Veli']);
        expect(recentlyViewedRoute(service.list()[1])).toEqual(['/panel/clients', 'c1']);
    });

    it(`en çok ${RECENTLY_VIEWED_LIMIT} kayıt tutar; en eski düşer`, () => {
        for (let i = 1; i <= RECENTLY_VIEWED_LIMIT + 2; i++) {
            service.record(pet(`p${i}`));
        }

        const ids = service.list().map((e) => e.id);

        expect(ids.length).toBe(RECENTLY_VIEWED_LIMIT);
        expect(ids[0]).toBe(`p${RECENTLY_VIEWED_LIMIT + 2}`);
        expect(ids).not.toContain('p1');
        expect(ids).not.toContain('p2');
    });

    it('kullanıcı ve kiracı anahtarlıdır: çıkıştan sonra aynı tarayıcıda giren başka kullanıcı veya başka kiracı listeyi görmez', () => {
        service.record(pet('p1'));

        session = { userId: 'u2', tenantId: 't1' };
        expect(service.list()).toEqual([]);
        service.record(pet('p9'));

        session = { userId: 'u1', tenantId: 't2' };
        expect(service.list()).toEqual([]);

        session = { userId: 'u1', tenantId: 't1' };
        expect(service.list().map((e) => e.id)).toEqual(['p1']);
    });

    it('oturum yoksa yazmaz ve boş döner', () => {
        session = { userId: null, tenantId: null };
        service.record(pet('p1'));

        expect(service.list()).toEqual([]);
        expect(localStorage.length).toBe(0);
    });

    it('okuma izni olmayan tür listelenmez; bozuk veya tanınmayan kayıt yok sayılır', () => {
        service.record({ kind: 'examination', id: 'e1', title: 'Pamuk', subtitle: 'Kontrol · 10.10.2026' });
        service.record(pet('p1'));
        claims.delete('Examinations.Read');

        expect(service.list().map((e) => e.id)).toEqual(['p1']);

        const key = Object.keys(localStorage)[0];

        localStorage.setItem(key, JSON.stringify([{ kind: 'invoice', id: 'x', title: 'X', subtitle: '' }, { kind: 'pet', id: '', title: 'Boş', subtitle: '' }, pet('p2')]));
        expect(service.list().map((e) => e.id)).toEqual(['p2']);

        localStorage.setItem(key, '{bozuk');
        expect(service.list()).toEqual([]);
    });
});
