import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppDetailActionBarComponent } from './app-detail-action-bar.component';

@Component({
    standalone: true,
    imports: [AppDetailActionBarComponent],
    template: `
        <app-detail-action-bar ariaLabel="Deneme eylemleri">
            @if (withButton()) {
                <button type="button">Ücret ekle</button>
            }
        </app-detail-action-bar>
    `
})
class HostComponent {
    readonly withButton = input(false);
}

describe('AppDetailActionBarComponent', () => {
    let blocked = false;

    const render = async (withButton: boolean) => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [{ provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }] }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentRef.setInput('withButton', withButton);
        fixture.detectChanges();

        return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="detail-action-bar"]') as HTMLElement;
    };

    beforeEach(() => {
        blocked = false;
    });

    it('düğme yansıdıysa şerit görünür ve araç çubuğu olarak adlandırılır', async () => {
        const bar = await render(true);

        expect(getComputedStyle(bar).display).not.toBe('none');
        expect(bar.getAttribute('aria-label')).toBe('Deneme eylemleri');
        expect(bar.textContent).toContain('Ücret ekle');
    });

    it('düğme yoksa şerit çizilmez; salt okunur notu da tek başına kalmaz', async () => {
        blocked = true;
        const bar = await render(false);

        expect(bar.textContent).toContain('salt okunur');
        expect(getComputedStyle(bar).display).toBe('none');
    });

    it('salt okunur kiracıda düğmelerin yanında kısa not yazar', async () => {
        blocked = true;
        const bar = await render(true);

        expect(getComputedStyle(bar).display).not.toBe('none');
        expect(bar.querySelector('[role="status"]')?.textContent).toContain('İşletme salt okunur moddadır');
    });
});
