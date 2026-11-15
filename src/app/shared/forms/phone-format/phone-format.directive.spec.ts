import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { formatTurkishMobileForInput } from '@/app/shared/utils/phone-display.utils';
import { PhoneFormatDirective } from './phone-format.directive';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, PhoneFormatDirective],
    template: `<input appPhoneFormat [formControl]="phone" />`
})
class HostComponent {
    readonly phone = new FormControl('', { nonNullable: true });
}

describe('telefon biçimi (H17)', () => {
    it('tanınan her yazımı "0532 111 22 33" yapar; tanınmayanı olduğu gibi bırakır', () => {
        expect(formatTurkishMobileForInput('5321112233')).toBe('0532 111 22 33');
        expect(formatTurkishMobileForInput('532-111-22-33')).toBe('0532 111 22 33');
        expect(formatTurkishMobileForInput('+90 532 111 2233')).toBe('0532 111 22 33');
        expect(formatTurkishMobileForInput(' 0532 111 22 33 ')).toBe('0532 111 22 33');
        expect(formatTurkishMobileForInput('123')).toBe('123');
        expect(formatTurkishMobileForInput('0312 555 00 00')).toBe('0312 555 00 00');
        expect(formatTurkishMobileForInput('')).toBe('');
    });

    it('alandan çıkınca form değerini biçimler', () => {
        const fixture = TestBed.createComponent(HostComponent);

        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

        input.value = '5321112233';
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));

        expect(fixture.componentInstance.phone.value).toBe('0532 111 22 33');
        expect(input.value).toBe('0532 111 22 33');
    });
});
