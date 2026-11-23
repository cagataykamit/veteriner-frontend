import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RecentDeletionService } from '@/app/entities/record-deletion/services/recent-deletion.service';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { DeletionUndoNoticeComponent } from './deletion-undo-notice.component';

describe('DeletionUndoNoticeComponent (ADR-054)', () => {
    let fixture: ComponentFixture<DeletionUndoNoticeComponent>;
    let restore: Mock;
    let recent: RecentDeletionService;

    const create = (kind: 'client' | 'pet') => {
        fixture = TestBed.createComponent(DeletionUndoNoticeComponent);
        fixture.componentRef.setInput('kind', kind);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        restore = vi.fn().mockName('restore').mockReturnValue(of(void 0));
        TestBed.configureTestingModule({ imports: [DeletionUndoNoticeComponent], providers: [{ provide: RecordDeletionService, useValue: { restore } }] });
        recent = TestBed.inject(RecentDeletionService);
    });

    it('bekleyen silme yoksa ya da başka türdeyse hiçbir şey çizmez', () => {
        recent.remember({ kind: 'pet', id: 'p1', name: 'Pamuk' });
        create('client');
        expect(q('deletion-undo-notice')).toBeNull();
    });

    it('"Silindi · Geri al": geri yükler, "geri yüklendi" yazar ve listeyi yeniletir; bildirim bir kez alınır', () => {
        recent.remember({ kind: 'client', id: 'c1', name: 'Ayşe Yılmaz' });
        const c = create('client');
        const restored = vi.fn().mockName('restored');

        c.restored.subscribe(restored);
        expect(q('deletion-undo-notice')?.textContent).toContain('Ayşe Yılmaz silindi.');

        (q('deletion-undo-button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(restore).toHaveBeenCalledWith('client', 'c1');
        expect(restored).toHaveBeenCalledTimes(1);
        expect(q('deletion-undo-notice')?.textContent).toContain('geri yüklendi');
        expect(recent.take('client')).toBeNull();
    });

    it('geri alma reddedilirse sunucu metni gösterilir, düğme kalır', () => {
        restore.mockReturnValue(throwError(() => new Error('Aynı bilgilerle aktif bir müşteri var.')));
        recent.remember({ kind: 'client', id: 'c1', name: 'Ayşe Yılmaz' });
        create('client');

        (q('deletion-undo-button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(q('deletion-undo-error')?.textContent).toContain('Aynı bilgilerle');
        expect(q('deletion-undo-button')).not.toBeNull();
    });
});
