import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormErrorSummaryComponent, formIssueSummary } from './form-error-summary.component';
import { FormFieldComponent } from './form-field.component';
import { FormSubmitDirective } from './form-submit.directive';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, FormFieldComponent, FormSubmitDirective, FormErrorSummaryComponent],
    template: `
        <form appFormSubmit [formGroup]="form" (ngSubmit)="saves = saves + 1">
            <app-form-error-summary />
            <app-form-field label="Hasta *" fieldId="pet" [error]="form.controls.pet.touched && form.controls.pet.invalid ? 'Hasta seçin.' : null">
                <input id="pet" formControlName="pet" />
            </app-form-field>
            <app-form-field label="Not" fieldId="note" hint="İç not">
                <input id="note" formControlName="note" />
            </app-form-field>
            <label for="time">Randevu saati *</label>
            <input id="time" formControlName="time" />
            <label for="email">E-posta</label>
            <input id="email" formControlName="email" />
            <button type="submit" [disabled]="busy()">Kaydet</button>
        </form>
    `
})
class HostComponent {
    readonly form = inject(FormBuilder).nonNullable.group({
        pet: ['', Validators.required],
        note: [''],
        time: ['', Validators.required],
        email: ['', Validators.email]
    });
    saves = 0;
    readonly busy = signal(false);
}

describe('ortak alan sarmalayıcısı ve form gönderimi (O3, B4)', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.autoDetectChanges();
    });

    const el = (sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement;
    const submit = async () => {
        el('button[type=submit]').click();
        await fixture.whenStable();
    };

    it('etiketi bağlar, zorunluluğu doğrulayıcıdan okur ve ekran okuyucu bağlarını yazar', async () => {
        await fixture.whenStable();

        expect(el('label[for=pet]').textContent).toContain('*');
        expect(el('label[for=note]').textContent).not.toContain('*');
        expect(el('#pet').getAttribute('aria-required')).toBe('true');
        expect(el('#note').getAttribute('aria-required')).toBeNull();
        expect(el('#note').getAttribute('aria-describedby')).toBe(el('#note').closest('app-form-field')!.querySelector('small')!.id);
        expect(el('#pet').getAttribute('aria-describedby')).toBeNull();
    });

    it('Kaydet geçersiz formda alanları işaretler, özet gösterir ve ilk hatalı alana odaklanır', async () => {
        await submit();

        expect(host.saves).toBe(1);
        expect(host.form.controls.pet.touched).toBe(true);
        expect(el('[data-testid=form-error-summary]').textContent).toContain('2 alan eksik:');
        expect(el('[data-testid=form-error-summary]').textContent).toContain('Hasta');
        expect(el('[data-testid=form-error-summary]').textContent).toContain('Randevu saati');
        expect(el('#pet').getAttribute('aria-invalid')).toBe('true');
        expect(document.activeElement).toBe(el('#pet'));
    });

    it('özet alan düzeldikçe kısalır, hepsi düzelince kaybolur', async () => {
        await submit();

        host.form.controls.pet.setValue('Pamuk');
        await fixture.whenStable();
        expect(el('[data-testid=form-error-summary]').textContent).toContain('1 alan eksik:');

        host.form.controls.time.setValue('10:00');
        await fixture.whenStable();
        expect(el('[data-testid=form-error-summary]')).toBeNull();
    });

    it('biçim hatasında "eksik ya da hatalı" der', async () => {
        host.form.patchValue({ pet: 'Pamuk', time: '10:00', email: 'yanlis' });
        await submit();

        expect(el('[data-testid=form-error-summary]').textContent).toContain('1 alan eksik ya da hatalı:');
        expect(el('[data-testid=form-error-summary]').textContent).toContain('E-posta');
    });

    it('Ctrl+Enter formu gönderir; Kaydet pasifken göndermez', async () => {
        el('#note').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
        await fixture.whenStable();
        expect(host.saves).toBe(1);

        host.busy.set(true);
        await fixture.whenStable();
        el('#note').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
        await fixture.whenStable();
        expect(host.saves).toBe(1);
    });

    it('özet metni: adı olmayan alanlarda yalnız sayı', () => {
        const element = document.createElement('input');

        expect(formIssueSummary([{ label: '', missing: true, element }])).toBe('1 alan eksik.');
    });
});
