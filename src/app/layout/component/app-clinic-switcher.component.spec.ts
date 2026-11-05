import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Popover } from 'primeng/popover';
import { of } from 'rxjs';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppClinicSwitcher } from './app-clinic-switcher.component';

const merkez = { id: 'c1', name: 'Merkez Klinik', isActive: true, shortAddress: 'Kadıköy, İstanbul' } as ClinicSummary;
const sube = { id: 'c2', name: 'Şube Klinik', isActive: true, shortAddress: 'Ankara' } as ClinicSummary;
const istinye = { id: 'c3', name: 'İstinye Şubesi', isActive: true } as ClinicSummary;

describe('AppClinicSwitcher', () => {
    let fixture: ComponentFixture<AppClinicSwitcher>;
    let selectClinic: ReturnType<typeof vi.fn>;

    const create = async (clinics: ClinicSummary[]) => {
        selectClinic = vi.fn().mockReturnValue(of({}));
        TestBed.configureTestingModule({
            imports: [AppClinicSwitcher],
            providers: [{ provide: AuthService, useValue: { activeClinicLabel: signal('Merkez Klinik'), getJwtClinicId: () => 'c1', getMyClinics: () => of(clinics), selectClinic } }]
        });
        fixture = TestBed.createComponent(AppClinicSwitcher);
        fixture.detectChanges();
        await settle();
    };

    const settle = async () => {
        await fixture.whenStable();
        fixture.detectChanges();
    };

    afterEach(() => fixture.destroy());

    const trigger = () => fixture.nativeElement.querySelector('button.layout-topbar-clinic-trigger') as HTMLButtonElement | null;
    const popover = () => fixture.debugElement.query(By.directive(Popover)).componentInstance as Popover;
    const panel = () => document.querySelector('[data-testid="clinic-panel"]') as HTMLElement;
    const options = () => Array.from(panel().querySelectorAll<HTMLButtonElement>('[data-testid="clinic-option"]'));
    const optionNames = () => options().map((o) => o.querySelector('[data-testid="clinic-option-name"]')!.textContent!.trim());

    it('tek klinikte açılır düğme yoktur', async () => {
        await create([merkez]);

        expect(trigger()).toBeNull();
        expect(fixture.nativeElement.querySelector('.layout-topbar-clinic-trigger--readonly')).not.toBeNull();
    });

    it('çoklu klinikte tıklama paneli açar ve document dinleyicilerine ulaşır', async () => {
        await create([merkez, sube]);
        const reachedDocument = vi.fn();

        document.addEventListener('click', reachedDocument);

        trigger()!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await settle();

        document.removeEventListener('click', reachedDocument);
        expect(popover().overlayVisible()).toBe(true);
        expect(trigger()!.getAttribute('aria-expanded')).toBe('true');
        expect(reachedDocument).toHaveBeenCalledTimes(1);
    });

    it('panel "Klinik değiştir" başlığı, "Klinikleriniz" grubu ve aktif klinikte "aktif" hapı gösterir; arama süzer', async () => {
        await create([merkez, sube, istinye]);
        trigger()!.click();
        await settle();

        expect(panel().textContent).toContain('Klinik değiştir');
        expect(panel().textContent).toContain('Klinikleriniz');
        expect(optionNames()).toEqual(['İstinye Şubesi', 'Merkez Klinik', 'Şube Klinik']);
        expect(options().map((o) => o.textContent!.includes('aktif'))).toEqual([false, true, false]);

        const search = panel().querySelector('[data-testid="clinic-search"]') as HTMLInputElement;

        search.value = 'şube';
        search.dispatchEvent(new Event('input'));
        await settle();

        expect(optionNames()).toEqual(['İstinye Şubesi', 'Şube Klinik']);
    });

    it('kısa adres adın altında gösterilir; boşsa satır çizilmez; arama adresle de eşleşir', async () => {
        await create([merkez, sube, istinye]);
        trigger()!.click();
        await settle();

        expect(options().map((o) => o.querySelector('[data-testid="clinic-option-address"]')?.textContent!.trim() ?? null)).toEqual([null, 'Kadıköy, İstanbul', 'Ankara']);

        const search = panel().querySelector('[data-testid="clinic-search"]') as HTMLInputElement;

        search.value = 'KADIKÖY';
        search.dispatchEvent(new Event('input'));
        await settle();

        expect(optionNames()).toEqual(['Merkez Klinik']);
    });

    it('aktif klinik seçilince istek atılmaz, panel kapanır', async () => {
        await create([merkez, sube]);
        trigger()!.click();
        await settle();

        options()
            .find((o) => o.textContent!.includes('Merkez'))!
            .click();
        await settle();

        expect(selectClinic).not.toHaveBeenCalled();
        expect(popover().overlayVisible()).toBe(false);
    });

    it('Escape paneli kapatır ve odak düğmeye döner', async () => {
        await create([merkez, sube]);
        trigger()!.click();
        await settle();

        panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();

        expect(popover().overlayVisible()).toBe(false);
        expect(document.activeElement).toBe(trigger());
    });
});
