import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import type { HasUnsavedChanges } from './unsaved-changes';
import { unsavedChangesGuard } from './unsaved-changes.guard';
import { UnsavedChangesService } from './unsaved-changes.service';

describe('unsavedChangesGuard', () => {
    let confirmLeave: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        confirmLeave = vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmLeave');
    });

    const run = (component: unknown) =>
        TestBed.runInInjectionContext(() => unsavedChangesGuard(component, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot));

    const page = (dirty: boolean): HasUnsavedChanges => ({ hasUnsavedChanges: () => dirty });

    it('değişiklik yoksa sormadan çıkışa izin verir', () => {
        expect(run(page(false))).toBe(true);
        expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('arayüzü uygulamayan bileşende sormaz', () => {
        expect(run({})).toBe(true);
        expect(run(null)).toBe(true);
        expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('kaydedilmemiş değişiklik varsa sorar ve yanıtı döner', async () => {
        confirmLeave.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

        await expect(run(page(true))).resolves.toBe(false);
        await expect(run(page(true))).resolves.toBe(true);
        expect(confirmLeave).toHaveBeenCalledTimes(2);
    });
});
