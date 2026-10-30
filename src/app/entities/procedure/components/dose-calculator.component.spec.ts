import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoseCalculatorComponent } from './dose-calculator.component';

describe('DoseCalculatorComponent (EXAM-008)', () => {
    let fixture: ComponentFixture<DoseCalculatorComponent>;

    const text = () => document.body.textContent ?? '';

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [DoseCalculatorComponent] }).compileComponents();
        fixture = TestBed.createComponent(DoseCalculatorComponent);
        fixture.componentRef.setInput('weightKg', 12.4);
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('açılışta kiloyu muayeneden alır; doz ve konsantrasyonla toplam doz ve hacmi gösterir', () => {
        const cmp = fixture.componentInstance;

        cmp.open();
        fixture.detectChanges();
        expect(cmp.form.controls.weightKg.value).toBe(12.4);

        cmp.form.patchValue({ dosePerKg: 5, concentrationMgPerMl: 50 });
        fixture.detectChanges();

        expect(cmp.totalText()).toBe('Toplam: 62 mg · Hacim: 1,24 mL');
        expect(text()).toContain('12,4 kg × 5 mg/kg = 62 mg → 62 mg ÷ 50 mg/mL = 1,24 mL');
        expect(text()).toContain('kayda yazılmaz');
    });

    it('geçersiz girişte sonuç yerine uyarı gösterir', () => {
        const cmp = fixture.componentInstance;

        cmp.open();
        cmp.form.patchValue({ dosePerKg: -1 });
        fixture.detectChanges();

        expect(cmp.result()).toBeNull();
        expect(text()).toContain("0'dan büyük");
    });

    it('her açılışta önceki hesap temizlenir', () => {
        const cmp = fixture.componentInstance;

        cmp.open();
        cmp.form.patchValue({ dosePerKg: 5 });
        cmp.open();

        expect(cmp.form.controls.dosePerKg.value).toBeNull();
    });
});
