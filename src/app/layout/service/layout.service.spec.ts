import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

const KEY = 'vetinity.menu.collapsed.u1';

describe('LayoutService menü daraltma', () => {
    let service: LayoutService;

    beforeEach(() => {
        localStorage.removeItem(KEY);
        service = TestBed.inject(LayoutService);
        spyOn(service, 'isDesktop').and.returnValue(true);
    });

    afterEach(() => localStorage.removeItem(KEY));

    it('☰ masaüstünde menüyü simge şeridine daraltır ve geri açar', () => {
        service.restoreMenuCollapsed('u1');
        expect(service.layoutState().staticMenuDesktopInactive).toBeFalse();
        service.onMenuToggle();
        expect(service.layoutState().staticMenuDesktopInactive).toBeTrue();
        service.onMenuToggle();
        expect(service.layoutState().staticMenuDesktopInactive).toBeFalse();
    });

    it('tercih kullanıcı için saklanır ve sonraki girişte geri yüklenir', () => {
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        expect(localStorage.getItem(KEY)).toBe('true');

        service.layoutState.update((s) => ({ ...s, staticMenuDesktopInactive: false }));
        service.restoreMenuCollapsed('u1');
        expect(service.layoutState().staticMenuDesktopInactive).toBeTrue();
    });

    it('başka kullanıcının tercihi bu kullanıcıyı etkilemez', () => {
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        service.restoreMenuCollapsed('u2');
        expect(service.layoutState().staticMenuDesktopInactive).toBeFalse();
    });

    it('depo kullanılamasa da çalışma anında daralır', () => {
        spyOn(Storage.prototype, 'setItem').and.throwError('engelli');
        service.restoreMenuCollapsed('u1');
        expect(() => service.onMenuToggle()).not.toThrow();
        expect(service.layoutState().staticMenuDesktopInactive).toBeTrue();
    });

    it('dar ekranda ☰ çekmeceyi açar; daraltma tercihini değiştirmez', () => {
        (service.isDesktop as jasmine.Spy).and.returnValue(false);
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        expect(service.layoutState().mobileMenuActive).toBeTrue();
        expect(service.layoutState().staticMenuDesktopInactive).toBeFalse();
        expect(localStorage.getItem(KEY)).toBeNull();
    });
});
