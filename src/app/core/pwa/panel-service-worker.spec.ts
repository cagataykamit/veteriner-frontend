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
        const checkForUpdate = vi.fn().mockResolvedValue(false);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: '**', children: [] }]), { provide: SwUpdate, useValue: { isEnabled, versionUpdates, unrecoverable, checkForUpdate } }]
        });
        const updates = TestBed.inject(PanelAppUpdates);
        // Gerçek yeniden yükleme test sayfasını kapatır; çağrı sayılır.
        const reload = vi.spyOn(updates as unknown as { reload: () => void }, 'reload').mockImplementation(() => {});

        updates.start();

        return { updates, versionUpdates, unrecoverable, checkForUpdate, reload, router: TestBed.inject(Router) };
    }

    const versionReady = { type: 'VERSION_READY', currentVersion: { hash: 'a' }, latestVersion: { hash: 'b' } } as VersionEvent;

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('açılışta kullanıcı dokunmadan yeni sürüm hazır olursa hemen yeniden yükler', () => {
        const { updates, versionUpdates, reload } = setup();

        vi.advanceTimersByTime(9_000);
        versionUpdates.next(versionReady);

        expect(reload).toHaveBeenCalledTimes(1);
        expect(updates.updateNoticeVisible()).toBe(false);
    });

    for (const interaction of ['pointerdown', 'keydown']) {
        it(`açılışta kullanıcı etkileşince (${interaction}) yeniden yüklemez, bildirim gösterir`, () => {
            const { updates, versionUpdates, reload } = setup();

            document.dispatchEvent(new Event(interaction));
            versionUpdates.next(versionReady);

            expect(reload).not.toHaveBeenCalled();
            expect(updates.updateNoticeVisible()).toBe(true);
        });
    }

    it('açılış süresi geçtikten sonra hazır olan sürümü ilk sayfa geçişinde yükler, aynı sayfadakine bildirim gösterir', async () => {
        const { updates, versionUpdates, reload, router } = setup();

        vi.advanceTimersByTime(10_000);
        versionUpdates.next(versionReady);
        expect(reload).not.toHaveBeenCalled();
        expect(updates.updateNoticeVisible()).toBe(true);

        await router.navigateByUrl('/panel/appointments');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('bildirimdeki Yenile hemen yükler; Kapat bildirimi gizler, geçişte yine yükler', async () => {
        const { updates, versionUpdates, reload, router } = setup();

        vi.advanceTimersByTime(10_000);
        versionUpdates.next(versionReady);

        updates.reloadNow();
        expect(reload).toHaveBeenCalledTimes(1);

        updates.dismissUpdateNotice();
        expect(updates.updateNoticeVisible()).toBe(false);

        await router.navigateByUrl('/panel/today');
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('güncellemeyi açılışta, sekme öne gelince ve 30 dakikada bir sorar', () => {
        const { checkForUpdate } = setup();
        const visibility = vi.spyOn(document, 'visibilityState', 'get');

        expect(checkForUpdate).toHaveBeenCalledTimes(1);

        visibility.mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(checkForUpdate).toHaveBeenCalledTimes(1);

        visibility.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(checkForUpdate).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(30 * 60_000);
        expect(checkForUpdate).toHaveBeenCalledTimes(3);

        visibility.mockRestore();
    });

    it('güncelleme sorusu başarısız olursa hatayı yutar', async () => {
        const { checkForUpdate } = setup();

        checkForUpdate.mockRejectedValue(new Error('offline'));

        vi.advanceTimersByTime(30 * 60_000);
        await vi.advanceTimersByTimeAsync(0);

        expect(checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('önbellek bozulursa hemen yeniden yükler', () => {
        const { unrecoverable, reload } = setup();

        unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'hash mismatch' });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('service worker kapalıysa hiçbir şey dinlemez ve sormaz', async () => {
        const { updates, versionUpdates, checkForUpdate, reload, router } = setup(false);

        versionUpdates.next(versionReady);
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(30 * 60_000);
        await router.navigateByUrl('/panel/today');

        expect(reload).not.toHaveBeenCalled();
        expect(checkForUpdate).not.toHaveBeenCalled();
        expect(updates.updateNoticeVisible()).toBe(false);
    });
});
