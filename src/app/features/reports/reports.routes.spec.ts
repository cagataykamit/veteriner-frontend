import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlTree } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import routes from './reports.routes';

describe('reports.routes — borç raporu yetkisi', () => {
    const debtRoute = (routes as Route[]).find((r) => r.path === 'outstanding-balances')!;

    function canActivate(claims: string[]): boolean | UrlTree {
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds.join('/') as unknown as UrlTree } }
            ]
        });

        return TestBed.runInInjectionContext(() => (debtRoute.canActivate![0] as () => boolean | UrlTree)());
    }

    it('Charges.Read ile açılır', () => {
        expect(canActivate(['Charges.Read'])).toBe(true);
    });

    it('Payments.Read tek başına yetmez; /notfound yönlenir', () => {
        expect(canActivate(['Payments.Read'])).toBe('/notfound' as unknown as UrlTree);
    });
});

describe('reports.routes — kayıt defteri yetkisi', () => {
    const route = (path: string) => (routes as Route[]).find((r) => r.path === path)!;

    function canActivate(path: string, claims: string[]): boolean | UrlTree {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds.join('/') as unknown as UrlTree } }
            ]
        });

        return TestBed.runInInjectionContext(() => (route(path).canActivate![0] as () => boolean | UrlTree)());
    }

    it('muayene defteri Examinations.Read, reçete defteri Prescriptions.Read ister', () => {
        expect(canActivate('registers/examinations', ['Examinations.Read'])).toBe(true);
        expect(canActivate('registers/prescriptions', ['Prescriptions.Read'])).toBe(true);
    });

    it('karşı izin yetmez; /notfound yönlenir', () => {
        expect(canActivate('registers/examinations', ['Prescriptions.Read'])).toBe('/notfound' as unknown as UrlTree);
        expect(canActivate('registers/prescriptions', ['Examinations.Read'])).toBe('/notfound' as unknown as UrlTree);
    });

    it('rota verisi tanımlı bir defteri seçer', () => {
        expect(route('registers/examinations').data).toEqual({ register: 'examinations' });
        expect(route('registers/prescriptions').data).toEqual({ register: 'prescriptions' });
    });

    it('stok defterleri StockMovements.Read ister; narkotik defteri ve aşı bilgi raporu izinlerin hepsini birlikte ister', () => {
        const notFound = '/notfound' as unknown as UrlTree;

        expect(canActivate('registers/vaccines', ['StockMovements.Read'])).toBe(true);
        expect(canActivate('registers/medications', ['StockMovements.Read'])).toBe(true);
        expect(canActivate('registers/vaccines', ['Administrations.Read'])).toBe(notFound);
        expect(canActivate('registers/controlled-substances', ['StockMovements.Read', 'Administrations.Read'])).toBe(true);
        expect(canActivate('registers/controlled-substances', ['StockMovements.Read'])).toBe(notFound);
        expect(canActivate('registers/controlled-substances', ['Administrations.Read'])).toBe(notFound);
        const info = ['Administrations.Read', 'Vaccinations.Read', 'Products.Read'];

        expect(canActivate('registers/vaccine-info', info)).toBe(true);

        for (const missing of info) {
            expect(
                canActivate(
                    'registers/vaccine-info',
                    info.filter((c) => c !== missing)
                )
            ).toBe(notFound);
        }
    });

    it('yeni defter rotaları tanımlı defteri seçer', () => {
        for (const book of ['vaccines', 'medications', 'controlled-substances', 'vaccine-info']) {
            expect(route(`registers/${book}`).data).toEqual({ register: book });
        }
    });
});

describe('reports.routes — gün sonu yetkisi', () => {
    const route = (routes as Route[]).find((r) => r.path === 'end-of-day')!;

    function canActivate(claims: string[]): boolean | UrlTree {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds.join('/') as unknown as UrlTree } }
            ]
        });

        return TestBed.runInInjectionContext(() => (route.canActivate![0] as () => boolean | UrlTree)());
    }

    it('Payments.Read veya Visits.Read ile açılır', () => {
        expect(canActivate(['Payments.Read'])).toBe(true);
        expect(canActivate(['Visits.Read'])).toBe(true);
    });

    it('Charges.Read tek başına yetmez; /notfound yönlenir', () => {
        expect(canActivate(['Charges.Read'])).toBe('/notfound' as unknown as UrlTree);
    });
});
