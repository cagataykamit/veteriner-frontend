import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RecentDeletionService } from '@/app/entities/record-deletion/services/recent-deletion.service';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { DeletionUndoNoticeComponent } from './deletion-undo-notice.component';

describe('DeletionUndoNoticeComponent (ADR-054)', () => {
    let fixture: ComponentFixture<DeletionUndoNoticeComponent>;
    let restore: Mock;

    const create = () => {
        fixture = TestBed.createComponent(DeletionUndoNoticeComponent);
        fixture.componentRef.setInput('deletion', { kind: 'client', id: 'c1', name: 'Ayşe Yılmaz' });
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        restore = vi.fn().mockName('restore').mockReturnValue(of(void 0));
        TestBed.configureTestingModule({ imports: [DeletionUndoNoticeComponent], providers: [{ provide: RecordDeletionService, useValue: { restore } }] });
    });

    it('"Silindi · Geri al": geri yükler, "geri yüklendi" yazar ve listeyi yeniletir', () => {
        const c = create();
        const restored = vi.fn().mockName('restored');

        c.restored.subscribe(restored);
        expect(q('deletion-undo-notice')?.textContent).toContain('Ayşe Yılmaz silindi.');

        (q('deletion-undo-button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(restore).toHaveBeenCalledWith('client', 'c1');
        expect(restored).toHaveBeenCalledTimes(1);
        expect(q('deletion-undo-notice')?.textContent).toContain('geri yüklendi');
    });

    it('geri alma reddedilirse sunucu metni gösterilir, düğme kalır', () => {
        restore.mockReturnValue(throwError(() => new Error('Aynı bilgilerle aktif bir müşteri var.')));
        create();

        (q('deletion-undo-button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(q('deletion-undo-error')?.textContent).toContain('Aynı bilgilerle');
        expect(q('deletion-undo-button')).not.toBeNull();
    });
});

describe('RecentDeletionService', () => {
    it('bekleyen silme türüne göre bir kez alınır; başka tür almaz', () => {
        const recent = new RecentDeletionService();

        recent.remember({ kind: 'pet', id: 'p1', name: 'Pamuk' });
        expect(recent.take('client')).toBeNull();
        expect(recent.take('pet')).toEqual({ kind: 'pet', id: 'p1', name: 'Pamuk' });
        expect(recent.take('pet')).toBeNull();
    });
});
