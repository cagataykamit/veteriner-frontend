import { TestBed } from '@angular/core/testing';
import { AppContextFilterChipComponent } from './app-context-filter-chip.component';

describe('AppContextFilterChipComponent', () => {
    it('etiketi gösterir ve "Süzgeci kaldır" tıklanınca clear yayar', () => {
        const fixture = TestBed.createComponent(AppContextFilterChipComponent);

        fixture.componentRef.setInput('label', 'Seçili hastanın kayıtları gösteriliyor');
        let cleared = 0;

        fixture.componentInstance.clear.subscribe(() => cleared++);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;

        expect(el.textContent).toContain('Seçili hastanın kayıtları gösteriliyor');
        (el.querySelector('[data-testid="context-filter-clear"]') as HTMLButtonElement).click();
        expect(cleared).toBe(1);
    });
});
