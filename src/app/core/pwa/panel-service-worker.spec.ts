import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { panelServiceWorkerEnabled, PanelAppUpdates } from './panel-service-worker';

describe('panelServiceWorkerEnabled', () => {
    it('üretimde yalnız panel ve giriş yollarında açılır', () => {
        for (const path of ['/panel', '/panel/today', '/auth/login', '/auth']) {
            expect(panelServiceWorkerEnabled(false, path), path).toBe(true);
        }

        for (const path of ['/', '/paketler', '/panelx', '/authority', '/join/abc']) {
            expect(panelServiceWorkerEnabled(false, path), path).toBe(false);
        }
    });

    it('geliştirme derlemesinde hiç açılmaz', () => {
        expect(panelServiceWorkerEnabled(true, '/panel/today')).toBe(false);
    });
});

describe('PanelAppUpdates', () => {
    function setup(isEnabled = true) {
        const versionUpdates = new Subject<VersionEvent>();
        const unrecoverable = new Subject<{ type: 'UNRECOVERABLE_STATE'; reason: string }>();

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: SwUpdate, useValue: { isEnabled, versionUpdates, unrecoverable } }
            ]
        });
        const updates = TestBed.inject(PanelAppUpdates);
        // Gerçek yeniden yükleme test sayfasını kapatır; çağrı sayılır.
        const reload = vi.spyOn(updates as unknown as { reload: () => void }, 'reload').mockImplementation(() => {});

        updates.start();

        return { versionUpdates, unrecoverable, reload, router: TestBed.inject(Router) };
    }

    const versionReady = { type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } } as VersionEvent;

    it('yeni sürüm hazırsa sayfayı hemen değil ilk geçişten sonra yeniden yükler', async () => {
        const { versionUpdates, reload, router } = setup();

        await router.navigateByUrl('/panel/today');
        expect(reload).not.toHaveBeenCalled();

        versionUpdates.next(versionReady);
        expect(reload).not.toHaveBeenCalled();

        await router.navigateByUrl('/panel/appointments');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('önbellek bozulursa hemen yeniden yükler', () => {
        const { unrecoverable, reload } = setup();

        unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash mismatch' });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('service worker kapalıysa hiçbir şey dinlemez', async () => {
        const { versionUpdates, reload, router } = setup(false);

        versionUpdates.next(versionReady);
        await router.navigateByUrl('/panel/today');
        expect(reload).not.toHaveBeenCalled();
    });
});
