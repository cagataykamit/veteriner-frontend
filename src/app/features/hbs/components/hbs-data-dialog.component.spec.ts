import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HbsDataDto, HbsEntryVm } from '@/app/features/hbs/models/hbs.model';
import { HbsService } from '@/app/features/hbs/services/hbs.service';
import { HbsDataDialogComponent } from './hbs-data-dialog.component';

/** ADR-036 Dilim 2: HBS verisi diyaloğu — alan alan kopyalama, tümünü kopyala, maskeli kimlik notu ve geri kayıt. */
describe('HbsDataDialogComponent', () => {
    const data: HbsDataDto = {
        recordKind: 'Prescription',
        recordId: 'r1',
        hbs: { status: 'NotEntered', isTracked: true },
        ownerIdentityMasked: true,
        sections: [
            {
                key: 'animal',
                title: 'Hasta',
                fields: [
                    { key: 'animal.name', label: 'Adı', value: 'Pamuk' },
                    { key: 'animal.hbsAnimalId', label: 'HBS Hayvan Kimlik No', value: null }
                ]
            },
            { key: 'owner', title: 'Hasta Sahibi', fields: [{ key: 'owner.identityNumber', label: 'T.C. Kimlik No', value: '100******46' }] }
        ],
        copyAllText: 'Hasta\nAdı: Pamuk'
    };

    const saved: HbsEntryVm = { status: 'Entered', referenceNumber: '2RX4K9', notRequiredReason: null, markedAtUtc: '2026-10-22T09:00:00Z', markedByName: 'Dr. Ayşe', isTracked: true };

    let hbs: jasmine.SpyObj<HbsService>;
    let clipboard: jasmine.Spy;

    const open = (canEdit = true) => {
        TestBed.configureTestingModule({
            imports: [HbsDataDialogComponent],
            providers: [{ provide: HbsService, useValue: hbs }]
        });
        const fixture = TestBed.createComponent(HbsDataDialogComponent);

        fixture.componentRef.setInput('kind', 'prescription');
        fixture.componentRef.setInput('recordId', 'r1');
        fixture.componentRef.setInput('canEdit', canEdit);
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();

        return fixture;
    };

    const body = () => document.body;
    const click = (testId: string) => (body().querySelector(`[data-testid="${testId}"] button, button[data-testid="${testId}"]`) as HTMLButtonElement).click();

    beforeEach(() => {
        hbs = jasmine.createSpyObj<HbsService>('HbsService', ['getHbsData', 'updateHbsEntry']);
        hbs.getHbsData.and.returnValue(of(data));
        hbs.updateHbsEntry.and.returnValue(of(saved));
        clipboard = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    });

    it('alanları satır satır, boşu "—" ile ve her satırda kopyala simgesiyle gösterir', () => {
        open();

        expect(hbs.getHbsData).toHaveBeenCalledWith('prescription', 'r1');
        const rows = Array.from(body().querySelectorAll('[data-testid="hbs-field"]'));

        expect(rows.length).toBe(3);
        expect(rows[0].textContent).toContain('Pamuk');
        expect(rows[1].textContent).toContain('—');
        expect(body().querySelector('[data-testid="hbs-copy-animal.hbsAnimalId"] button')?.hasAttribute('disabled')).toBeTrue();
        expect(body().querySelector('[data-testid="hbs-identity-masked"]')).not.toBeNull();
    });

    it('satırdaki kopyala değeri, tümünü kopyala birleşik metni panoya yazar', async () => {
        const fixture = open();

        click('hbs-copy-animal.name');
        await fixture.whenStable();
        expect(clipboard).toHaveBeenCalledWith('Pamuk');

        click('hbs-copy-all');
        await fixture.whenStable();
        expect(clipboard).toHaveBeenCalledWith('Hasta\nAdı: Pamuk');
    });

    it('"HBS\'e girdim" numarayı kırpıp kaydeder ve kaydedilen durumu yayar', () => {
        const fixture = open();
        const emitted: HbsEntryVm[] = [];

        fixture.componentInstance.saved.subscribe((e) => emitted.push(e));
        fixture.componentInstance.reference.setValue('  2RX4K9 ');
        click('hbs-save');

        expect(hbs.updateHbsEntry).toHaveBeenCalledWith('prescription', 'r1', { status: 'Entered', referenceNumber: '2RX4K9', notRequiredReason: null });
        expect(emitted).toEqual([saved]);
    });

    it('"Gerekmiyor" gerekçe olmadan gönderilmez; gerekçeyle numarasız gider', () => {
        const fixture = open();

        fixture.componentInstance.mode.set('NotRequired');
        fixture.detectChanges();
        fixture.componentInstance.save('NotRequired');
        expect(hbs.updateHbsEntry).not.toHaveBeenCalled();

        fixture.componentInstance.reason.setValue('Reçetesiz ürün, HBS gerekmiyor');
        fixture.componentInstance.save('NotRequired');
        expect(hbs.updateHbsEntry).toHaveBeenCalledWith('prescription', 'r1', { status: 'NotRequired', referenceNumber: null, notRequiredReason: 'Reçetesiz ürün, HBS gerekmiyor' });
    });

    it('düzenleme yetkisi yoksa form yerine bilgi notu gösterilir', () => {
        open(false);

        expect(body().querySelector('[data-testid="hbs-save"]')).toBeNull();
        expect(body().querySelector('[data-testid="hbs-entry-form"]')?.textContent).toContain('yetkisi olan kullanıcı');
    });

    it('kayıt hatası diyalogda gösterilir', () => {
        hbs.updateHbsEntry.and.returnValue(throwError(() => new Error('HBS numarası en fazla 50 karakter olabilir.')));
        const fixture = open();

        fixture.componentInstance.save('Entered');
        fixture.detectChanges();

        expect(body().textContent).toContain('HBS numarası en fazla 50 karakter olabilir.');
    });
});
