import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialog, DialogModule } from 'primeng/dialog';
import { DialogFocusReturnDirective } from './dialog-focus-return.directive';

@Component({
    standalone: true,
    imports: [DialogModule, DialogFocusReturnDirective],
    template: `
        <button id="opener" type="button" (click)="visible.set(true)">Aç</button>
        <button id="other" type="button">Diğer</button>
        <p-dialog header="Deneme" [(visible)]="visible"><input id="inside" /></p-dialog>
    `
})
class HostComponent {
    readonly visible = signal(false);
}

describe('DialogFocusReturnDirective', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        fixture.autoDetectChanges();
    });

    const el = (id: string) => document.getElementById(id) as HTMLElement;
    const dialog = () => fixture.debugElement.query(By.directive(Dialog)).injector.get(Dialog);

    it('diyalog kapanınca odak açan düğmeye döner', async () => {
        el('opener').focus();
        el('opener').click();
        await fixture.whenStable();
        el('inside').focus();

        fixture.componentInstance.visible.set(false);
        await fixture.whenStable();
        el('inside').remove();
        dialog().onHide.emit({});

        expect(document.activeElement).toBe(el('opener'));
    });

    it('odak bilerek başka öğeye taşındıysa dokunmaz', async () => {
        el('opener').focus();
        el('opener').click();
        await fixture.whenStable();

        fixture.componentInstance.visible.set(false);
        await fixture.whenStable();
        el('other').focus();
        dialog().onHide.emit({});

        expect(document.activeElement).toBe(el('other'));
    });
});
