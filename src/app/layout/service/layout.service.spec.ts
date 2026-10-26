import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

const KEY = 'vetinity.menu.collapsed.u1';

describe('LayoutService menü daraltma', () => {
    let service: LayoutService;

    beforeEach(() => {
        localStorage.removeItem(KEY);
        service = TestBed.inject(LayoutService);
        vi.spyOn(service, 'isDesktop').mockReturnValue(true);
    });

    afterEach(() => localStorage.removeItem(KEY));

    it('☰ masaüstünde menüyü simge şeridine daraltır ve geri açar', () => {
        service.restoreMenuCollapsed('u1');
        expect(service.layoutState().staticMenuDesktopInactive).toBe(false);
        service.onMenuToggle();
        expect(service.layoutState().staticMenuDesktopInactive).toBe(true);
        service.onMenuToggle();
        expect(service.layoutState().staticMenuDesktopInactive).toBe(false);
    });

    it('tercih kullanıcı için saklanır ve sonraki girişte geri yüklenir', () => {
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        expect(localStorage.getItem(KEY)).toBe('true');

        service.layoutState.update((s) => ({ ...s, staticMenuDesktopInactive: false }));
        service.restoreMenuCollapsed('u1');
        expect(service.layoutState().staticMenuDesktopInactive).toBe(true);
    });

    it('başka kullanıcının tercihi bu kullanıcıyı etkilemez', () => {
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        service.restoreMenuCollapsed('u2');
        expect(service.layoutState().staticMenuDesktopInactive).toBe(false);
    });

    it('depo kullanılamasa da çalışma anında daralır', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('engelli');
        });
        service.restoreMenuCollapsed('u1');
        expect(() => service.onMenuToggle()).not.toThrow();
        expect(service.layoutState().staticMenuDesktopInactive).toBe(true);
    });

    it('dar ekranda ☰ çekmeceyi açar; daraltma tercihini değiştirmez', () => {
        (service.isDesktop as Mock).mockReturnValue(false);
        service.restoreMenuCollapsed('u1');
        service.onMenuToggle();
        expect(service.layoutState().mobileMenuActive).toBe(true);
        expect(service.layoutState().staticMenuDesktopInactive).toBe(false);
        expect(localStorage.getItem(KEY)).toBeNull();
    });
});
