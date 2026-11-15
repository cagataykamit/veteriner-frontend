import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Dialog, DialogModule } from 'primeng/dialog';
import { DialogUnsavedChangesDirective } from './dialog-unsaved-changes.directive';
import { UnsavedChangesService } from './unsaved-changes.service';

@Component({
    standalone: true,
    imports: [DialogModule, DialogUnsavedChangesDirective],
    template: `<p-dialog header="Deneme" [(visible)]="visible" [appUnsavedChanges]="dirty()"><input /></p-dialog>`
})
class HostComponent {
    readonly visible = signal(true);
    readonly dirty = signal(false);
}

describe('DialogUnsavedChangesDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let service: UnsavedChangesService;
    let dialog: Dialog;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        service = TestBed.inject(UnsavedChangesService);
        dialog = fixture.debugElement.query(By.directive(Dialog)).injector.get(Dialog);
    });

    const requestClose = () => dialog.close(new Event('keydown', { cancelable: true }));

    it('temiz diyalog Esc/çarpı/dışarı tıklamayla sorusuz kapanır', () => {
        requestClose();

        expect(fixture.componentInstance.visible()).toBe(false);
        expect(service.asking()).toBe(false);
    });

    it('dolu diyalogda sorar; "Sayfada kal" açık bırakır', async () => {
        fixture.componentInstance.dirty.set(true);
        fixture.detectChanges();

        requestClose();
        expect(service.asking()).toBe(true);
        expect(fixture.componentInstance.visible()).toBe(true);

        service.answer(false);
        await Promise.resolve();
        expect(fixture.componentInstance.visible()).toBe(true);
    });

    it('dolu diyalogda "Kaydetmeden çık" kapatır', async () => {
        fixture.componentInstance.dirty.set(true);
        fixture.detectChanges();

        requestClose();
        service.answer(true);
        await Promise.resolve();

        expect(fixture.componentInstance.visible()).toBe(false);
    });
});
