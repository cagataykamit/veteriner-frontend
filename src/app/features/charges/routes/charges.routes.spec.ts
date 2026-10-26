import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Route, UrlTree } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import routes from './charges.routes';

describe('charges.routes yetki korumaları', () => {
    let claims: Set<string>;

    const guardOf = (path: string): CanActivateFn => (routes.find((r: Route) => r.path === path) as Route).canActivate![0] as CanActivateFn;
    const run = (path: string) => TestBed.runInInjectionContext(() => guardOf(path)({} as never, {} as never));

    beforeEach(() => {
        claims = new Set();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }]
        });
    });

    it('liste Charges.Read ister; yoksa /notfound', () => {
        expect((run('') as UrlTree).toString()).toBe('/notfound');
        claims.add('Charges.Read');
        expect(run('')).toBe(true);
    });

    it('bekleyen ücretler Charges.Read ister; hekim de girer (çevirme düğmeleri sayfada Charges.Create ile açılır)', () => {
        expect((run('pending') as UrlTree).toString()).toBe('/notfound');
        claims.add('Charges.Read');
        expect(run('pending')).toBe(true);
    });

    it('ekleme Charges.Create ister; yalnız okuyan (Veteriner) giremez', () => {
        claims.add('Charges.Read');
        expect((run('new') as UrlTree).toString()).toBe('/notfound');
        claims.add('Charges.Create');
        expect(run('new')).toBe(true);
    });
});
