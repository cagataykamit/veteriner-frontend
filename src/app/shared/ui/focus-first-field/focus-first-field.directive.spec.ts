import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocusFirstFieldDirective } from './focus-first-field.directive';

@Component({
    standalone: true,
    imports: [FocusFirstFieldDirective],
    template: `
        <form appFocusFirstField>
            <input id="disabled" disabled />
            <input id="filled" value="Ali" />
            <input id="empty" />
            <input id="later" />
        </form>
    `
})
class HostComponent {}

describe('FocusFirstFieldDirective (H14)', () => {
    it('kapalı ve dolu alanları atlayıp ilk boş metin alanına odaklanır', async () => {
        const fixture = TestBed.createComponent(HostComponent);

        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(document.activeElement?.id).toBe('empty');
        fixture.nativeElement.remove();
    });
});
