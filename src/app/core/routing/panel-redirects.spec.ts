import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { appRoutes } from '@/app.routes';

describe('panel yönlendirmeleri', () => {
    let router: Router;
    let claims: Set<string>;

    beforeEach(() => {
        claims = new Set(['visits.read', 'species.create', 'species.update', 'breeds.create', 'breeds.update', 'productcategories.read']);
        TestBed.configureTestingModule({
            providers: [
                provideRouter(appRoutes),
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c.toLowerCase()), isAuthenticated: () => true, hasSelectedClinic: () => true, ensureValidAccessToken: () => of(null) } }
            ]
        });
        router = TestBed.inject(Router);
    });

    const go = async (url: string) => {
        await router.navigateByUrl(url);

        return router.url;
    };

    it('Visits.Read olan /panel açınca Bugün sayfasına gider', async () => {
        expect(await go('/panel')).toBe('/panel/today');
    });

    it('yönetici düzeyi (Visits.Correct) /panel açınca Özet sayfasına gider', async () => {
        claims.add('visits.correct');
        expect(await go('/panel')).toBe('/panel/dashboard');
    });

    it('Bugün ve Özet yetkisi yoksa /panel menüdeki ilk erişilebilir öğeye, o da yoksa Ayarlar’a gider', async () => {
        claims.delete('visits.read');
        expect(await go('/panel')).toBe('/panel/settings');
        claims.add('clients.read');
        expect(await go('/panel')).toBe('/panel/patients');
    });

    it('eski Tür adresi alt yolu ve sorgu parametresiyle yeni adrese yönlenir', async () => {
        expect(await go('/panel/species')).toBe('/panel/settings/definitions/species');
        expect(await go('/panel/species/abc/edit?saved=1')).toBe('/panel/settings/definitions/species/abc/edit?saved=1');
    });

    it('eski Irk ve Kategori adresleri yeni adrese yönlenir', async () => {
        expect(await go('/panel/breeds/new')).toBe('/panel/settings/definitions/breeds/new');
        expect(await go('/panel/product-categories')).toBe('/panel/settings/definitions/product-categories');
    });

    it('Ayarlar ve Tanımlar adresleri çözülür', async () => {
        expect(await go('/panel/settings')).toBe('/panel/settings');
        expect(await go('/panel/settings/definitions')).toBe('/panel/settings/definitions');
    });
});
