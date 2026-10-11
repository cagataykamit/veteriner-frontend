import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { DateInputComponent } from './date-input.component';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    template: `<app-date-input type="time" [formControl]="control" />`
})
class HostComponent {
    control = new FormControl<string>('09:30', { nonNullable: true });
}

describe('DateInputComponent — saat alanı (klinik çalışma saatleri)', () => {
    let fixture: ComponentFixture<HostComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        document.body.appendChild(fixture.nativeElement);
    });
    afterEach(() => fixture.destroy());

    it('mevcut saati çizer', async () => {
        fixture.detectChanges();
        await wait(50);
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(input.value).toBe('09:30');
    });

    it('devre dışı bırakılıp açılınca çizilmeye devam eder', async () => {
        fixture.detectChanges();
        fixture.componentInstance.control.disable({ emitEvent: false });
        fixture.componentInstance.control.enable({ emitEvent: false });
        fixture.detectChanges();
        await wait(50);
        expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    });
});
