import { TestBed } from '@angular/core/testing';
import { UnsavedChangesService } from './unsaved-changes.service';

describe('UnsavedChangesService', () => {
    let service: UnsavedChangesService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(UnsavedChangesService);
    });

    const unload = () => {
        const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;

        window.dispatchEvent(event);

        return event;
    };

    it('soru yanıtlanınca sonucu döner ve kapanır', async () => {
        const answer = service.confirmLeave();

        expect(service.asking()).toBe(true);
        service.answer(true);

        await expect(answer).resolves.toBe(true);
        expect(service.asking()).toBe(false);
    });

    it('yeni soru gelirse eskisi "Sayfada kal" sayılır', async () => {
        const first = service.confirmLeave();
        const second = service.confirmLeave();

        await expect(first).resolves.toBe(false);
        service.answer(true);
        await expect(second).resolves.toBe(true);
    });

    it('değişiklik yoksa sormadan kapatır', () => {
        const close = vi.fn();

        service.closeWithCheck(false, close);

        expect(close).toHaveBeenCalledTimes(1);
        expect(service.asking()).toBe(false);
    });

    it('değişiklik varsa sorar; "Sayfada kal" açık bırakır, "Kaydetmeden çık" kapatır', async () => {
        const close = vi.fn();

        service.closeWithCheck(true, close);
        service.answer(false);
        await Promise.resolve();
        expect(close).not.toHaveBeenCalled();

        service.closeWithCheck(true, close);
        service.answer(true);
        await Promise.resolve();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('sekme kapatılırken açık sayfada değişiklik varsa uyarır, yoksa uyarmaz', () => {
        const page = { dirty: true, hasUnsavedChanges(): boolean { return this.dirty; } };

        service.setActivePage(page);
        expect(unload().defaultPrevented).toBe(true);

        page.dirty = false;
        expect(unload().defaultPrevented).toBe(false);

        page.dirty = true;
        service.clearActivePage(page);
        expect(unload().defaultPrevented).toBe(false);
    });
});
