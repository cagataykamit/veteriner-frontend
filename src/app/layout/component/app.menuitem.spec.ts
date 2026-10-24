import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuFlyoutService } from '@/app/layout/service/menu-flyout.service';
import { AppMenuitem } from './app.menuitem';

describe('AppMenuitem', () => {
    let events: Subject<NavigationEnd>;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [AppMenuitem],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: LayoutService, useValue: { isMenuRail: signal(false), layoutState: signal({ activePath: null }) } },
                { provide: MenuFlyoutService, useValue: { openKey: signal<string | null>(null), open: () => undefined, close: () => undefined, scheduleClose: () => undefined } }
            ]
        });
        events = new Subject<NavigationEnd>();

        // Bileşen kurucuda router.events'e abone olur; gerçek Router yerine kontrol edilebilir akış verilir.
        Object.defineProperty(TestBed.inject(Router), 'events', { value: events.asObservable() });

        const fixture = TestBed.createComponent(AppMenuitem);

        fixture.componentRef.setInput('item', { label: 'Hastalar', routerLink: ['/panel/pets'] });
        fixture.componentRef.setInput('root', true);
        fixture.detectChanges();

        return fixture;
    };

    const navigationEnd = () => events.next(new NavigationEnd(1, '/panel/pets', '/panel/pets'));

    it('gezinme bitiminde aktif durumu günceller', () => {
        const fixture = create();
        const update = spyOn(fixture.componentInstance, 'updateActiveStateFromRoute');

        navigationEnd();

        expect(update).toHaveBeenCalledTimes(1);
    });

    it('bileşen yok edildikten sonra router olaylarını dinlemez (sızıntı yok)', () => {
        const fixture = create();
        const update = spyOn(fixture.componentInstance, 'updateActiveStateFromRoute');

        fixture.destroy();
        navigationEnd();

        // Yalnız bileşenin kendi aboneliği ölçülür; RouterLink direktifi de router.events'e abone olur ve
        // Angular 21.2'de yok etme sonrası akışta gözlemci bırakabilir (Subject.observed bu yüzden kullanılmaz).
        expect(update).not.toHaveBeenCalled();
    });
});
