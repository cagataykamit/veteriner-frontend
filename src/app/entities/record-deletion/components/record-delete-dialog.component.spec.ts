import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { RecordDeletionError } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { RecordDeleteDialogComponent } from './record-delete-dialog.component';

describe('RecordDeleteDialogComponent (ADR-054)', () => {
    let fixture: ComponentFixture<RecordDeleteDialogComponent>;
    let deleteRecord: Mock;

    const create = (inputs: { kind: 'client' | 'pet'; petCount?: number | null }) => {
        TestBed.configureTestingModule({
            imports: [RecordDeleteDialogComponent],
            providers: [provideRouter([]), { provide: RecordDeletionService, useValue: { delete: deleteRecord } }]
        });
        fixture = TestBed.createComponent(RecordDeleteDialogComponent);
        fixture.componentRef.setInput('kind', inputs.kind);
        fixture.componentRef.setInput('recordId', inputs.kind === 'client' ? 'c1' : 'p1');
        fixture.componentRef.setInput('recordName', inputs.kind === 'client' ? 'Ayşe Yılmaz' : 'Pamuk');
        fixture.componentRef.setInput('clientId', 'c1');
        fixture.componentRef.setInput('petCount', inputs.petCount ?? null);
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');
    const q = (testId: string) => document.body.querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        deleteRecord = vi.fn().mockName('delete').mockReturnValue(of(void 0));
    });

    afterEach(() => {
        fixture?.destroy();
    });

    it('müşteri: hasta sayısı, listelerden kalkma, kayıtların korunması, geri yükleme ve KVKK cümlesi', () => {
        create({ kind: 'client', petCount: 2 });

        expect(q('delete-subject')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Ayşe Yılmaz ve 2 hastası silinecek.');
        const effects = q('delete-effects')?.textContent ?? '';

        expect(effects).toContain('Müşteri ve hastaları listelerden ve hatırlatmalardan kalkar.');
        expect(effects).toContain('Kayıtlar silinmez');
        expect(effects).toContain('"Silinenler"den geri yükleyebilir');
        expect(effects).toContain('KVKK silme talebi için bu işlem kullanılmaz.');
    });

    it('hasta: KVKK cümlesi yok; onay silme ucunu çağırır, kapanır ve sonucu yayar', () => {
        const c = create({ kind: 'pet' });
        const deleted = vi.fn().mockName('deleted');

        c.deleted.subscribe(deleted);
        expect(text()).toContain('Pamuk silinecek.');
        expect(text()).not.toContain('KVKK');

        (q('delete-confirm') as HTMLButtonElement).click();

        expect(deleteRecord).toHaveBeenCalledWith('pet', 'p1');
        expect(deleted).toHaveBeenCalledTimes(1);
        expect(c.visible()).toBe(false);
    });

    it('409 DeleteBlocked: nedenler madde madde, ilgili yere bağlantıyla; pencere açık kalır', () => {
        deleteRecord.mockReturnValue(
            throwError(
                () =>
                    new RecordDeletionError('Müşteri silinemez: …', 'Clients.DeleteBlocked', {
                        reasons: ['OpenAccount', 'FutureAppointments'],
                        activeHospitalizationCount: 0,
                        openVisitCount: 0,
                        futureAppointmentCount: 2
                    })
            )
        );
        const c = create({ kind: 'client', petCount: 1 });

        c.onSubmit();
        fixture.detectChanges();

        expect(c.visible()).toBe(true);
        expect(q('delete-blocked')?.textContent).toContain('Müşteri şu an silinemez');
        expect(q('delete-blocked-OpenAccount')?.querySelector('a')?.getAttribute('href')).toBe('/panel/charges?clientId=c1');
        expect(q('delete-blocked-FutureAppointments')?.textContent).toContain('2 gelecek randevusu var');
        expect(q('delete-blocked-FutureAppointments')?.querySelector('a')?.getAttribute('href')).toBe('/panel/appointments?clientId=c1');
        expect(q('delete-error')).toBeNull();
    });

    it('başka hata metinle gösterilir', () => {
        deleteRecord.mockReturnValue(throwError(() => new RecordDeletionError('Peşin müşteri (doğrudan satış kaydı) silinemez.', 'Clients.WalkInReadOnly')));
        const c = create({ kind: 'client', petCount: 0 });

        c.onSubmit();
        fixture.detectChanges();

        expect(q('delete-error')?.textContent).toContain('Peşin müşteri');
        expect(q('delete-blocked')).toBeNull();
    });
});
