import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PanelAppUpdates } from '@/app/core/pwa/panel-service-worker';
import { AppUpdateNoticeComponent } from './app-update-notice.component';

describe('AppUpdateNoticeComponent', () => {
    function create(visible: boolean) {
        const appUpdates = { updateNoticeVisible: signal(visible), reloadNow: vi.fn(), dismissUpdateNotice: vi.fn() };

        TestBed.configureTestingModule({ imports: [AppUpdateNoticeComponent], providers: [{ provide: PanelAppUpdates, useValue: appUpdates }] });
        const fixture = TestBed.createComponent(AppUpdateNoticeComponent);

        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        const query = (testId: string) => element.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

        return { appUpdates, query };
    }

    it('yeni sürüm hazır değilse görünmez', () => {
        expect(create(false).query('app-update-notice')).toBeNull();
    });

    it('Yenile ve Kapat düğmeleri güncelleme kuralına iletilir', () => {
        const { appUpdates, query } = create(true);

        expect(query('app-update-notice')?.textContent).toContain('Yeni sürüm hazır');

        query('app-update-reload')?.click();
        expect(appUpdates.reloadNow).toHaveBeenCalledTimes(1);

        query('app-update-dismiss')?.click();
        expect(appUpdates.dismissUpdateNotice).toHaveBeenCalledTimes(1);
    });
});
