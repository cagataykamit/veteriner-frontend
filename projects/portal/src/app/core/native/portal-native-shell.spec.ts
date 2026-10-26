import type { Mock } from 'vitest';
import { Location } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SystemBarsStyle } from '@capacitor/core';
import { waitFor } from '@portal/app/testing/portal-testing';
import { PORTAL_BASE_URL, PORTAL_NATIVE_PLUGINS, PortalNativeShell } from './portal-native-shell';

@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.Eager, template: '' })
class BlankPage {}

type Listener = (event: never) => void;

describe('PortalNativeShell', () => {
    let listeners: Map<string, Listener>;
    let app: {
        addListener: Mock;
        exitApp: Mock;
    };
    let splashScreen: {
        hide: Mock;
    };
    let systemBars: {
        setStyle: Mock;
    };
    let router: Router;
    let location: Location;

    beforeEach(() => {
        listeners = new Map();
        app = {
            addListener: vi
                .fn()
                .mockName('addListener')
                .mockImplementation((name: string, fn: Listener) => {
                    listeners.set(name, fn);

                    return Promise.resolve({ remove: () => Promise.resolve() });
                }),
            exitApp: vi.fn().mockName('exitApp').mockResolvedValue(undefined)
        };
        splashScreen = { hide: vi.fn().mockName('hide').mockResolvedValue(undefined) };
        systemBars = { setStyle: vi.fn().mockName('setStyle').mockResolvedValue(undefined) };

        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: BlankPage },
                    { path: 'invite', component: BlankPage },
                    { path: 'pets/:petId', component: BlankPage }
                ]),
                { provide: PORTAL_NATIVE_PLUGINS, useValue: { app, splashScreen, systemBars } },
                { provide: PORTAL_BASE_URL, useValue: 'https://portal.vetinity.com' }
            ]
        });
        router = TestBed.inject(Router);
        location = TestBed.inject(Location);
    });

    const start = () => {
        const shell = TestBed.inject(PortalNativeShell);

        shell.start();

        return shell;
    };

    const emit = (name: string, event: unknown) => (listeners.get(name) as (e: unknown) => void)(event);

    it('dinleyicileri bir kez kaydeder ve sistem çubuğunu açık zemine göre ayarlar', () => {
        const shell = start();

        shell.start();

        expect(app.addListener).toHaveBeenCalledTimes(2);
        expect([...listeners.keys()]).toEqual(['appUrlOpen', 'backButton']);
        expect(systemBars.setStyle).toHaveBeenCalledTimes(1);
        expect(systemBars.setStyle).toHaveBeenCalledWith({ style: SystemBarsStyle.Light });
    });

    it('portal adresindeki davet bağlantısını uygulama içinde açar', async () => {
        start();

        emit('appUrlOpen', { url: 'https://portal.vetinity.com/invite?token=abc' });
        await waitFor(() => router.url === '/invite?token=abc');

        expect(router.url).toBe('/invite?token=abc');
    });

    it('başka alan adındaki bağlantıyı yok sayar', () => {
        const navigate = vi.spyOn(router, 'navigateByUrl');

        start();
        emit('appUrlOpen', { url: 'https://example.com/invite?token=abc' });

        expect(navigate).not.toHaveBeenCalled();
    });

    it('açılış ekranını ilk yönlendirme bitince kapatır', async () => {
        start();

        expect(splashScreen.hide).not.toHaveBeenCalled();

        await router.navigateByUrl('/');
        await router.navigateByUrl('/pets/p-1');

        expect(splashScreen.hide).toHaveBeenCalledTimes(1);
    });

    it('geri tuşu iç sayfada önceki ekrana döner', async () => {
        const back = vi.spyOn(location, 'back').mockReturnValue(undefined);

        start();
        await router.navigateByUrl('/pets/p-1');
        emit('backButton', { canGoBack: true });

        expect(back).toHaveBeenCalled();
        expect(app.exitApp).not.toHaveBeenCalled();
    });

    it('geri tuşu ana sayfada uygulamadan çıkar', async () => {
        const back = vi.spyOn(location, 'back').mockReturnValue(undefined);

        start();
        await router.navigateByUrl('/');
        emit('backButton', { canGoBack: true });

        expect(app.exitApp).toHaveBeenCalled();
        expect(back).not.toHaveBeenCalled();
    });
});
