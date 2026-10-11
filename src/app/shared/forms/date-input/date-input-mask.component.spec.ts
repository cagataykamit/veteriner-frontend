import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { DateInputComponent } from './date-input.component';
import { applyDateMask, type DateInputType } from './date-input-value.utils';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    template: `<app-date-input inputId="d" [type]="type()" [min]="min()" [max]="max()" [formControl]="control" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
    type = signal<DateInputType>('date');
    min = signal<string | null>(null);
    max = signal<string | null>(null);
}

describe('applyDateMask (saf maske)', () => {
    it('rakamlar yazıldıkça ayırıcılar eklenir; sondaki boş ayırıcı bırakılmaz', () => {
        expect(applyDateMask('date', '2', 1).text).toBe('2');
        expect(applyDateMask('date', '24', 2).text).toBe('24');
        expect(applyDateMask('date', '241', 3).text).toBe('24.1');
        expect(applyDateMask('date', '2411', 4).text).toBe('24.11');
        expect(applyDateMask('date', '24111', 5).text).toBe('24.11.1');
        expect(applyDateMask('date', '24111991', 8).text).toBe('24.11.1991');
    });

    it('24111991 ve 24.11.1991 aynı sonucu verir', () => {
        expect(applyDateMask('date', '24.11.1991', 10).text).toBe(applyDateMask('date', '24111991', 8).text);
    });

    it('harfler ve fazla rakamlar atılır; uzunluk biçimle sınırlı', () => {
        expect(applyDateMask('date', 'ab12cd', 6).text).toBe('12');
        expect(applyDateMask('date', '2411199155', 10).text).toBe('24.11.1991');
        expect(applyDateMask('datetime-local', '2411199114309999', 16).text).toBe('24.11.1991 14:30');
        expect(applyDateMask('time', '143099', 6).text).toBe('14:30');
    });

    it('saatli ve yalnız saat biçimleri', () => {
        expect(applyDateMask('datetime-local', '241119911', 9).text).toBe('24.11.1991 1');
        expect(applyDateMask('datetime-local', '241119911430', 12).text).toBe('24.11.1991 14:30');
        expect(applyDateMask('time', '1430', 4).text).toBe('14:30');
        expect(applyDateMask('time', '1', 1).text).toBe('1');
    });

    it('ISO (1991-11-24) yapıştırılırsa gg.aa.yyyy olur', () => {
        expect(applyDateMask('date', '1991-11-24', 10).text).toBe('24.11.1991');
        expect(applyDateMask('datetime-local', '1991-11-24T14:30', 16).text).toBe('24.11.1991 14:30');
    });

    it('imleç rakam sırasına göre korunur', () => {
        expect(applyDateMask('date', '24111991', 3).caret).toBe(4); // 3 rakamdan sonra: "24.1|"
        expect(applyDateMask('date', '24111991', 8).caret).toBe(10);
        expect(applyDateMask('date', '', 0).caret).toBe(0);
    });

    it('Backspace ayırıcıyı silince (rakamlar aynı) önündeki rakam silinir, imleç ayırıcıda takılmaz', () => {
        // "24.11.1991", imleç "24.|11" → Backspace noktayı siler: ham "2411.1991", imleç 2
        const r = applyDateMask('date', '2411.1991', 2, '24.11.1991', 'deleteContentBackward');
        expect(r.text).toBe('21.11.991');
        // sıradan rakam silme etkilenmez
        expect(applyDateMask('date', '24.11.199', 9, '24.11.1991', 'deleteContentBackward').text).toBe('24.11.199');
    });

    it('Delete ayırıcıyı silince sonraki rakam silinir', () => {
        const r = applyDateMask('date', '2411.1991', 2, '24.11.1991', 'deleteContentForward');
        expect(r.text).toBe('24.11.991');
    });
});

describe('DateInputComponent — maske, hata ve aralık (gerçek input)', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input#d') as HTMLInputElement;

    /** Gerçek yazma gibi: her karakter ayrı tuş + input olayı. */
    const typeChars = async (text: string) => {
        const el = input();
        el.focus();
        for (const ch of text) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
            const pos = el.selectionStart ?? el.value.length;
            el.value = el.value.slice(0, pos) + ch + el.value.slice(pos);
            el.setSelectionRange(pos + 1, pos + 1);
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
            fixture.detectChanges();
            await wait(15); // gerçek tuş aralığı: ngModel geri yazımı karakterler arasında çalışır
        }
        fixture.detectChanges();
        await wait(50);
    };

    const blur = async () => {
        input().blur();
        fixture.detectChanges();
        await wait(50);
    };

    const create = async (type: DateInputType = 'date', min: string | null = null, max: string | null = null) => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        host.type.set(type);
        host.min.set(min);
        host.max.set(max);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await wait(50);
    };

    afterEach(() => fixture?.destroy());

    it('24111991 yazılınca alanda 24.11.1991 görünür ve form değeri 1991-11-24 olur', async () => {
        await create('date');
        await typeChars('24111991');
        expect(input().value).toBe('24.11.1991');
        expect(host.control.value).toBe('1991-11-24');
    });

    it('24.11.1991 (noktalı) yazımı da geçerli', async () => {
        await create('date');
        await typeChars('24.11.1991');
        expect(input().value).toBe('24.11.1991');
        expect(host.control.value).toBe('1991-11-24');
    });

    it('saatli alan: 241119911430 → 24.11.1991 14:30', async () => {
        await create('datetime-local');
        await typeChars('241119911430');
        expect(input().value).toBe('24.11.1991 14:30');
        expect(host.control.value).toBe('1991-11-24T14:30');
    });

    it('harf, nokta ve fazla rakam karışık (gerçek tuş aralığıyla): ab15x10.2026557 → 15.10.2026', async () => {
        await create('date');
        await typeChars('ab15x10.2026557');
        expect(input().value).toBe('15.10.2026');
        expect(host.control.value).toBe('2026-10-15');
    });

    it('min/max varken de yazarken girdi bozulmaz: 15102026 (min 2026-10-04, yıl yazılırken geçici 0020 gibi değerler)', async () => {
        await create('date', '2026-10-04', '2027-10-04');
        await typeChars('15102026');
        expect(input().value).toBe('15.10.2026');
        expect(host.control.value).toBe('2026-10-15');
    });

    it('harf yazılamaz, fazla karakter alınmaz', async () => {
        await create('date');
        await typeChars('2a4b1c1d1e9f9g1h77');
        expect(input().value).toBe('24.11.1991');
    });

    it('31.02 yazınca blur sonrası Türkçe hata; yazarken hata görünmez', async () => {
        await create('date');
        await typeChars('31022026');
        expect(fixture.nativeElement.textContent).not.toContain('Geçerli bir tarih girin');
        await blur();
        expect(host.control.hasError('dateInvalid')).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Geçerli bir tarih girin (gg.aa.yyyy).');
    });

    it('yarım yazı blur sonrası hata verir (yazarken değil)', async () => {
        await create('date');
        await typeChars('2411');
        expect(fixture.nativeElement.textContent).not.toContain('Geçerli bir tarih girin');
        await blur();
        expect(host.control.hasError('dateInvalid')).toBeTrue();
    });

    it('min dışı yazılan tarih: dateOutOfRange ve Türkçe mesaj', async () => {
        await create('date', '2026-10-04', null);
        await typeChars('01102026');
        await blur();
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Tarih 04.10.2026 veya sonrası olmalıdır.');
    });

    it('max dışı ve aralık mesajı', async () => {
        await create('date', '2026-10-01', '2026-10-31');
        await typeChars('15112026');
        await blur();
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Tarih 01.10.2026 ile 31.10.2026 arasında olmalıdır.');
    });

    it('geniş sınırlı alan (doğum tarihi): 1991 serbest; 1900 uç sınırı mesajda görünmez', async () => {
        await create('date', '1900-01-01', '2026-10-11');
        await typeChars('24111991');
        await blur();
        expect(host.control.errors).toBeNull();
        expect(host.control.value).toBe('1991-11-24');
    });

    it('formdan gelen min dışı mevcut değer hata saymaz (eski kayıtlar kaydedilebilir)', async () => {
        await create('date', '2026-10-04', null);
        host.control.setValue('2020-01-01');
        fixture.detectChanges();
        await wait(50);
        expect(host.control.errors).toBeNull();
        expect(input().value).toBe('01.01.2020');
    });

    it('geçerli tarih yazılınca takvim o aya gider', async () => {
        await create('date');
        await typeChars('24111991');
        input().click();
        fixture.detectChanges();
        await wait(400);
        const header = [...document.querySelectorAll('.p-datepicker-header, .p-datepicker-title')].map((e) => e.textContent).join(' ');
        expect(header).toContain('Kasım');
        expect(header).toContain('1991');
    });

    it('düzeltince hata gider', async () => {
        await create('date');
        await typeChars('31022026');
        await blur();
        expect(host.control.hasError('dateInvalid')).toBeTrue();
        input().focus();
        input().select();
        await typeChars('28022026');
        await blur();
        expect(host.control.errors).toBeNull();
        expect(host.control.value).toBe('2026-02-28');
    });
});
