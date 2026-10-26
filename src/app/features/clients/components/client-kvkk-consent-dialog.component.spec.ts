import type { Mock } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ClientKvkkConsentDialogComponent } from './client-kvkk-consent-dialog.component';

const client = { id: 'c1', fullName: 'Ali Veli', kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null, templateVersion: null, templateHash: null }, rowVersion: 'rv1' } as ClientDetailVm;
const result = { kvkkConsent: { status: 'Accepted' as const, recordedOn: '2026-01-02', recordedByName: 'Ayşe', templateVersion: null, templateHash: null }, remindersOptedOut: false, rowVersion: 'rv2' };

describe('ClientKvkkConsentDialogComponent', () => {
    let fixture: ComponentFixture<ClientKvkkConsentDialogComponent>;
    let updateKvkkConsent: Mock;

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
        updateKvkkConsent = vi.fn().mockName('updateKvkkConsent').mockReturnValue(of(result));
    });

    it('Yok iken Kabul ve bugün varsayılır; seçim, tarih ve rowVersion ile kaydeder, sonucu yayar ve kapanır', () => {
        const c = create(client);

        expect(c.status.value).toBe('Accepted');
        expect(c.recordedOn.value).toBe(c.today());
        expect(c.canRevert()).toBe(false);
        const changed = vi.fn().mockName('changed');

        c.changed.subscribe(changed);

        c.status.setValue('Declined');
        c.recordedOn.setValue('2026-01-02');
        c.submit(c.status.value);

        expect(updateKvkkConsent).toHaveBeenCalledWith('c1', { status: 'Declined', recordedOn: '2026-01-02', rowVersion: 'rv1' });
        expect(changed).toHaveBeenCalledWith(result);
        expect(c.visible()).toBe(false);
    });

    it("Ret notu hatırlatmaların kapanacağını ve Kabul'ün açmayacağını söyler (ADR-025)", () => {
        create(client);
        const note = (document.querySelector('[data-testid="kvkk-reminder-note"]')?.textContent ?? '').replace(/\s+/g, ' ');

        expect(note).toContain('Ret işaretlenince otomatik hatırlatmalar kapanır');
        expect(note).toContain("Kabul'e geçmek hatırlatmaları açmaz");
    });

    it("ileri tarih engellenir; işaretli kayıtta mevcut değerler gelir ve Yok'a geri al tarihsiz gönderilir", () => {
        const c = create({ ...client, kvkkConsent: { status: 'Declined', recordedOn: '2025-05-05', recordedByName: 'Ayşe', templateVersion: null, templateHash: null } });

        expect([c.status.value, c.recordedOn.value]).toEqual(['Declined', '2025-05-05']);
        expect(c.canRevert()).toBe(true);

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
        updateKvkkConsent.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict', extensions: { code: 'Clients.ConcurrencyConflict' } } })));
        const c = create(client);
        const stale = vi.fn().mockName('stale');

        c.stale.subscribe(stale);

        c.submit('Accepted');

        expect(stale).toHaveBeenCalled();
        expect(c.submitError()).toContain('başka biri');
        expect(c.visible()).toBe(true);
    });
});
