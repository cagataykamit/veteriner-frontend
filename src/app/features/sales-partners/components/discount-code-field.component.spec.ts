import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { DiscountCodeValidationDto } from '@/app/features/sales-partners/models/sales-partner.model';
import { DiscountCodesService } from '@/app/features/sales-partners/services/discount-codes.service';
import { DiscountCodeFieldComponent } from './discount-code-field.component';

const VALID: DiscountCodeValidationDto = { valid: true, code: 'ISIK10', discountPercent: 10, discountMonths: 12 };
const INVALID: DiscountCodeValidationDto = { valid: false, code: null, discountPercent: null, discountMonths: null };

describe('DiscountCodeFieldComponent (ADR-037)', () => {
    let fixture: ComponentFixture<DiscountCodeFieldComponent>;
    let cmp: DiscountCodeFieldComponent;
    let codes: jasmine.SpyObj<DiscountCodesService>;
    let emitted: (DiscountCodeValidationDto | null)[];

    const status = (): string => (fixture.nativeElement as HTMLElement).querySelector('[data-testid="discount-code-status"]')?.textContent?.trim() ?? '';

    beforeEach(async () => {
        codes = jasmine.createSpyObj<DiscountCodesService>('DiscountCodesService', ['validate']);
        await TestBed.configureTestingModule({
            imports: [DiscountCodeFieldComponent],
            providers: [{ provide: DiscountCodesService, useValue: codes }]
        }).compileComponents();

        fixture = TestBed.createComponent(DiscountCodeFieldComponent);
        cmp = fixture.componentInstance;
        emitted = [];
        cmp.validated.subscribe((v) => emitted.push(v));
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2026, 9, 22, 9, 0, 0));
        fixture.detectChanges();
    });

    afterEach(() => jasmine.clock().uninstall());

    it('yazarken normalize eder, bekledikten sonra doğrular ve indirim notunu gösterir', () => {
        codes.validate.and.returnValue(of(VALID));

        cmp.onInput(' ışık10 ');
        jasmine.clock().tick(300);

        expect(codes.validate).not.toHaveBeenCalled();
        expect(cmp.code()).toBe('ISIK10');

        jasmine.clock().tick(400);
        fixture.detectChanges();

        expect(codes.validate).toHaveBeenCalledOnceWith('ISIK10');
        expect(status()).toBe('%10 indirim, ilk 12 ay');
        expect(emitted.at(-1)).toEqual(VALID);
    });

    it('geçersiz kodda tek tip hata metni gösterir ve sonuç boş döner', () => {
        codes.validate.and.returnValue(of(INVALID));

        cmp.onInput('YANLIS');
        cmp.validateNow();
        jasmine.clock().tick(700);
        fixture.detectChanges();

        expect(codes.validate).toHaveBeenCalledTimes(1);
        expect(status()).toBe('Ortak kodu geçersiz.');
        expect(emitted.at(-1)).toBeNull();
    });

    it('hız sınırında ayrı bir uyarı gösterir', () => {
        codes.validate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));

        cmp.onInput('ISIK10');
        cmp.validateNow();
        jasmine.clock().tick(700);
        fixture.detectChanges();

        expect(status()).toContain('Çok fazla deneme');
        expect(cmp.status()).toBe('error');
    });

    it('üç karakterden kısa kodu sunucuya sormaz', () => {
        cmp.onInput('AB');
        jasmine.clock().tick(700);

        expect(codes.validate).not.toHaveBeenCalled();
        expect(cmp.status()).toBe('invalid');
    });
});
