import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Menu } from 'primeng/menu';
import { of } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppClinicSwitcher } from './app-clinic-switcher.component';

const merkez = { id: 'c1', name: 'Merkez Klinik', isActive: true } as ClinicSummary;
const sube = { id: 'c2', name: 'Şube Klinik', isActive: true } as ClinicSummary;

describe('AppClinicSwitcher', () => {
    let fixture: ComponentFixture<AppClinicSwitcher>;

    const create = async (clinics: ClinicSummary[]) => {
        TestBed.configureTestingModule({
            imports: [AppClinicSwitcher],
            providers: [{ provide: AuthService, useValue: { activeClinicLabel: signal('Merkez Klinik'), getJwtClinicId: () => 'c1', getMyClinics: () => of(clinics) } }]
        });
        fixture = TestBed.createComponent(AppClinicSwitcher);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    afterEach(() => fixture.destroy());

    const trigger = () => fixture.nativeElement.querySelector('button.layout-topbar-clinic-trigger') as HTMLButtonElement | null;

    it('tek klinikte açılır düğme yoktur', async () => {
        await create([merkez]);

        expect(trigger()).toBeNull();
        expect(fixture.nativeElement.querySelector('.layout-topbar-clinic-trigger--readonly')).not.toBeNull();
    });

    it('çoklu klinikte tıklama menüyü açar ve document dinleyicilerine ulaşır', async () => {
        await create([merkez, sube]);
        const reachedDocument = vi.fn();

        document.addEventListener('click', reachedDocument);

        trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await fixture.whenStable();

        document.removeEventListener('click', reachedDocument);
        expect((fixture.debugElement.query(By.directive(Menu)).componentInstance as Menu).visible()).toBe(true);
        expect(reachedDocument).toHaveBeenCalledTimes(1);
    });
});
