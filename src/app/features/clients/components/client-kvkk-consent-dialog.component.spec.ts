import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ClientKvkkConsentDialogComponent } from './client-kvkk-consent-dialog.component';

const client = { id: 'c1', fullName: 'Ali Veli', kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null }, rowVersion: 'rv1' } as ClientDetailVm;
const result = { kvkkConsent: { status: 'Accepted' as const, recordedOn: '2026-01-02', recordedByName: 'Ayşe' }, rowVersion: 'rv2' };

describe('ClientKvkkConsentDialogComponent', () => {
    let fixture: ComponentFixture<ClientKvkkConsentDialogComponent>;
    let updateKvkkConsent: jasmine.Spy;

    const create = (c: ClientDetailVm) => {
        TestBed.configureTestingModule({
            imports: [ClientKvkkConsentDialogComponent],
            providers: [{ provide: ClientsService, useValue: { updateKvkkConsent } }]
        });
        fixture = TestBed.createComponent(ClientKvkkConsentDialogComponent);
        fixture.componentRef.setInput('client', c);
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    beforeEach(() => {
        updateKvkkConsent = jasmine.createSpy('updateKvkkConsent').and.returnValue(of(result));
    });

    it('Yok iken Kabul ve bugün varsayılır; seçim, tarih ve rowVersion ile kaydeder, sonucu yayar ve kapanır', () => {
        const c = create(client);
        expect(c.status.value).toBe('Accepted');
        expect(c.recordedOn.value).toBe(c.today());
        expect(c.canRevert()).toBeFalse();
        const changed = jasmine.createSpy('changed');
        c.changed.subscribe(changed);

        c.status.setValue('Declined');
        c.recordedOn.setValue('2026-01-02');
        c.submit(c.status.value);

        expect(updateKvkkConsent).toHaveBeenCalledWith('c1', { status: 'Declined', recordedOn: '2026-01-02', rowVersion: 'rv1' });
        expect(changed).toHaveBeenCalledWith(result);
        expect(c.visible()).toBeFalse();
    });

    it('ileri tarih engellenir; işaretli kayıtta mevcut değerler gelir ve Yok\'a geri al tarihsiz gönderilir', () => {
        const c = create({ ...client, kvkkConsent: { status: 'Declined', recordedOn: '2025-05-05', recordedByName: 'Ayşe' } });
        expect([c.status.value, c.recordedOn.value]).toEqual(['Declined', '2025-05-05']);
        expect(c.canRevert()).toBeTrue();

        c.recordedOn.setValue('2999-01-01');
        expect(c.dateError()).toContain('ileri');
        c.submit(c.status.value);
        expect(updateKvkkConsent).not.toHaveBeenCalled();

        c.submit('None');
        expect(updateKvkkConsent).toHaveBeenCalledWith('c1', { status: 'None', recordedOn: null, rowVersion: 'rv1' });
    });

    it('rowVersion yoksa gönderilmez', () => {
        const c = create({ ...client, rowVersion: null });
        c.submit('Accepted');
        expect(updateKvkkConsent).not.toHaveBeenCalled();
    });

    it('409 Clients.ConcurrencyConflict mesajı gösterir ve detay yenilemesi ister', () => {
        updateKvkkConsent.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict', extensions: { code: 'Clients.ConcurrencyConflict' } } }))
        );
        const c = create(client);
        const stale = jasmine.createSpy('stale');
        c.stale.subscribe(stale);

        c.submit('Accepted');

        expect(stale).toHaveBeenCalled();
        expect(c.submitError()).toContain('başka biri');
        expect(c.visible()).toBeTrue();
    });
});
