import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { NO_PET_ALERTS, type PetAlertsVm } from '@/app/shared/pet-alerts/pet-alerts.utils';

describe('PetAlertBadgesComponent', () => {
    const render = async (alerts: PetAlertsVm): Promise<ComponentFixture<PetAlertBadgesComponent>> => {
        await TestBed.configureTestingModule({ imports: [PetAlertBadgesComponent] }).compileComponents();
        const fixture = TestBed.createComponent(PetAlertBadgesComponent);

        fixture.componentRef.setInput('alerts', alerts);
        fixture.detectChanges();

        return fixture;
    };
    const group = (f: ComponentFixture<PetAlertBadgesComponent>) => (f.nativeElement as HTMLElement).querySelector('[role="group"]') as HTMLElement | null;
    const tags = (f: ComponentFixture<PetAlertBadgesComponent>) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('p-tag'));

    it('uyarı yoksa hiçbir şey çizmez', async () => {
        const f = await render(NO_PET_ALERTS);

        expect(group(f)).toBeNull();
    });

    it.each([
        ['Allergy', 'Alerji', 'pi-exclamation-circle'],
        ['Aggressive', 'Agresif', 'pi-exclamation-triangle'],
        ['ChronicCondition', 'Kronik hastalık', 'pi-heart'],
        ['AnesthesiaRisk', 'Anestezi riski', 'pi-bolt']
    ] as const)('%s: renge ek olarak metin etiketi ve ikon', async (flag, label, icon) => {
        const f = await render({ flags: [flag], note: null });
        const [tag] = tags(f);

        expect(tags(f).length).toBe(1);
        expect(tag.textContent?.trim()).toBe(label);
        expect(tag.querySelector(`.${icon}`)).not.toBeNull();
        expect(group(f)?.getAttribute('aria-label')).toBe(`Hasta uyarıları: ${label}`);
        expect(group(f)?.getAttribute('title')).toBe(label);
    });

    it('birden çok uyarı sözleşme sırasıyla; uzun not title, aria-label ve ekran okuyucu metninde tam', async () => {
        const note = 'Penisilin ve sefalosporin grubuna ağır alerji; muayenede ağızlık kullanın, sahip yanında olsun. '.repeat(2).trim();
        const f = await render({ flags: ['AnesthesiaRisk', 'Allergy', 'Aggressive', 'ChronicCondition'], note });

        expect(tags(f).map((t) => t.textContent?.trim())).toEqual(['Alerji', 'Agresif', 'Kronik hastalık', 'Anestezi riski']);
        expect(group(f)?.getAttribute('title')).toBe(`Alerji, Agresif, Kronik hastalık, Anestezi riski — ${note}`);
        expect(group(f)?.getAttribute('aria-label')).toContain(note);
        expect(group(f)?.querySelector('.sr-only')?.textContent).toBe(note);
        expect(group(f)?.className).toContain('flex-wrap');
    });
});
