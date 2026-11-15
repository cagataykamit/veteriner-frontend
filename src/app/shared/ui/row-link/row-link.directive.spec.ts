import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RowLinkDirective } from './row-link.directive';

@Component({
    standalone: true,
    imports: [RowLinkDirective],
    template: `
        <div id="row" [appRowLink]="['/panel/clients', 'c1']">
            <span id="text">Ali Veli</span>
            <button id="action" type="button">Düzenle</button>
        </div>
    `
})
class HostComponent {}

describe('RowLinkDirective (H19)', () => {
    it('satırın boş yerine tıklamak kaydı açar; satır düğmesi açmaz', () => {
        TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] });
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const fixture = TestBed.createComponent(HostComponent);
        const el = fixture.nativeElement as HTMLElement;

        fixture.detectChanges();
        expect(el.querySelector('#row')?.classList).toContain('cursor-pointer');

        (el.querySelector('#action') as HTMLButtonElement).click();
        expect(navigate).not.toHaveBeenCalled();

        (el.querySelector('#text') as HTMLElement).click();
        expect(navigate).toHaveBeenCalledWith(['/panel/clients', 'c1']);
    });
});
