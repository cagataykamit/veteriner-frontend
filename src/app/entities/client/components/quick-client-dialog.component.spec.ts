import { TestBed } from '@angular/core/testing';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { QuickClientDialogComponent } from './quick-client-dialog.component';

describe('QuickClientDialogComponent — aramadan önden doldurma (APPT-017/019)', () => {
    const create = (initialText: string) => {
        TestBed.configureTestingModule({
            imports: [QuickClientDialogComponent],
            providers: [{ provide: ClientsService, useValue: { createClient: vi.fn() } }]
        });
        const fixture = TestBed.createComponent(QuickClientDialogComponent);

        fixture.componentRef.setInput('initialText', initialText);
        fixture.componentInstance.onShow();

        return fixture.componentInstance;
    };

    it('ad gibi aranan metin ad soyada yazılır', () => {
        const cmp = create('Ayşe Yılmaz');

        expect(cmp.form.controls.fullName.value).toBe('Ayşe Yılmaz');
        expect(cmp.form.controls.phone.value).toBe('');
    });

    it('telefon gibi aranan metin telefona yazılır', () => {
        const cmp = create('0532 111 22 33');

        expect(cmp.form.controls.fullName.value).toBe('');
        expect(cmp.form.controls.phone.value).toBe('0532 111 22 33');
    });
});
