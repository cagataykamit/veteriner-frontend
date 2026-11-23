import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { RecordDeletionError } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { DeletedRecordBannerComponent } from './deleted-record-banner.component';

describe('DeletedRecordBannerComponent (ADR-054)', () => {
    let fixture: ComponentFixture<DeletedRecordBannerComponent>;
    let restore: Mock;

    const create = (inputs: Partial<{ kind: 'client' | 'pet'; canRestore: boolean; deletedWithClient: boolean }>) => {
        TestBed.configureTestingModule({
            imports: [DeletedRecordBannerComponent],
            providers: [provideRouter([]), { provide: RecordDeletionService, useValue: { restore } }]
        });
        fixture = TestBed.createComponent(DeletedRecordBannerComponent);
        fixture.componentRef.setInput('kind', inputs.kind ?? 'client');
        fixture.componentRef.setInput('recordId', 'r1');
        fixture.componentRef.setInput('deletedAtUtc', '2026-11-23T10:00:00Z');
        fixture.componentRef.setInput('canRestore', inputs.canRestore ?? true);
        fixture.componentRef.setInput('deletedWithClient', inputs.deletedWithClient ?? false);
        fixture.componentRef.setInput('clientId', 'c1');
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (testId: string) => el().querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        restore = vi.fn().mockName('restore').mockReturnValue(of(void 0));
    });

    it('silinme anını gösterir; "Geri yükle" geri yükleme ucunu çağırır ve sonucu yayar', () => {
        const c = create({});
        const restored = vi.fn().mockName('restored');

        c.restored.subscribe(restored);
        expect(q('deleted-record-when')?.textContent).toContain('23.11.2026');

        (q('deleted-record-restore') as HTMLButtonElement).click();

        expect(restore).toHaveBeenCalledWith('client', 'r1');
        expect(restored).toHaveBeenCalledTimes(1);
    });

    it('izin yoksa "Geri yükle" yok', () => {
        create({ canRestore: false });
        expect(q('deleted-record-banner')).not.toBeNull();
        expect(q('deleted-record-restore')).toBeNull();
    });

    it('müşterisiyle birlikte silinen hasta: düğme müşteri kartına gider', () => {
        create({ kind: 'pet', deletedWithClient: true });
        expect(q('deleted-record-restore')).toBeNull();
        expect(q('deleted-record-client-link')?.getAttribute('href')).toBe('/panel/clients/c1');
    });

    it('çakışmada sunucu metni ve çakışan müşteriye bağlantı', () => {
        restore.mockReturnValue(throwError(() => new RecordDeletionError('Aynı bilgilerle aktif bir müşteri var.', 'Clients.RestoreConflict', null, 'c9')));
        const c = create({});

        c.restore();
        fixture.detectChanges();

        expect(q('deleted-record-restore-error')?.textContent).toContain('Aynı bilgilerle aktif bir müşteri var.');
        expect(q('deleted-record-restore-error')?.querySelector('a')?.getAttribute('href')).toBe('/panel/clients/c9');
    });
});
