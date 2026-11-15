import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { AppointmentCancelUndoComponent } from './appointment-cancel-undo.component';

describe('AppointmentCancelUndoComponent', () => {
    let revertCancellation: Mock;

    beforeEach(() => {
        vi.useFakeTimers();
        revertCancellation = vi.fn().mockReturnValue(of(void 0));
        TestBed.configureTestingModule({
            imports: [AppointmentCancelUndoComponent],
            providers: [{ provide: AppointmentsService, useValue: { revertCancellation } }]
        });
    });

    afterEach(() => vi.useRealTimers());

    const create = (seconds: number) => {
        const fixture = TestBed.createComponent(AppointmentCancelUndoComponent);

        fixture.componentRef.setInput('appointmentId', 'a1');
        fixture.componentRef.setInput('undoWindowSeconds', seconds);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        const button = () => el.querySelector<HTMLButtonElement>('[data-testid="appointment-cancel-undo-button"]');

        return { fixture, el, button };
    };

    it('süre boyunca geri sayar, süre bitince düğme kalkar ve bildirim kalır', () => {
        const { fixture, el, button } = create(3);

        expect(button()?.textContent).toContain('Geri al (3)');
        vi.advanceTimersByTime(1000);
        fixture.detectChanges();
        expect(button()?.textContent).toContain('Geri al (2)');
        vi.advanceTimersByTime(2000);
        fixture.detectChanges();

        expect(button()).toBeNull();
        expect(el.textContent).toContain('Randevu iptal edildi.');
    });

    it('süre 0 ise düğme hiç çıkmaz', () => {
        const { button } = create(0);

        expect(button()).toBeNull();
    });

    it('Geri al: servis çağrılır, olay yayılır, "İptal geri alındı." görünür', () => {
        const { fixture, el, button } = create(10);
        const reverted = vi.fn();

        fixture.componentInstance.reverted.subscribe(reverted);
        button()!.click();
        fixture.detectChanges();

        expect(revertCancellation).toHaveBeenCalledWith('a1');
        expect(reverted).toHaveBeenCalledTimes(1);
        expect(el.textContent).toContain('İptal geri alındı.');
        expect(button()).toBeNull();
    });

    it('geri alma başarısızsa sunucu metni gösterilir, düğme kalkar, olay yayılmaz', () => {
        revertCancellation.mockReturnValue(throwError(() => new Error('Geri alma süresi doldu. Randevuyu yeniden oluşturun.')));
        const { fixture, el, button } = create(10);
        const reverted = vi.fn();

        fixture.componentInstance.reverted.subscribe(reverted);
        button()!.click();
        fixture.detectChanges();

        expect(el.querySelector('[data-testid="appointment-cancel-undo-error"]')?.textContent).toContain('Geri alma süresi doldu.');
        expect(button()).toBeNull();
        expect(reverted).not.toHaveBeenCalled();
    });
});
