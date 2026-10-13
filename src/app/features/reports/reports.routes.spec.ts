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
        expect(canActivate(['Charges.Read'])).toBeTrue();
    });

    it('Payments.Read tek başına yetmez; /notfound yönlenir', () => {
        expect(canActivate(['Payments.Read'])).toBe('/notfound' as unknown as UrlTree);
    });
});
