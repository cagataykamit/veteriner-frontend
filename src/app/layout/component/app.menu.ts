import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Panel',
                items: [{ label: 'Özet', icon: 'pi pi-fw pi-home', routerLink: ['/panel/dashboard'] }]
            },
            {
                label: 'Hasta yönetimi',
                items: [
                    { label: 'Müşteriler', icon: 'pi pi-fw pi-users', routerLink: ['/panel/clients'] },
                    { label: 'Hayvanlar', icon: 'pi pi-fw pi-heart', routerLink: ['/panel/pets'] },
                    { label: 'Türler', icon: 'pi pi-fw pi-tags', routerLink: ['/panel/species'] },
                    { label: 'Irklar', icon: 'pi pi-fw pi-sitemap', routerLink: ['/panel/breeds'] },
                    { label: 'Randevular', icon: 'pi pi-fw pi-calendar', routerLink: ['/panel/appointments'] },
                    { label: 'Muayeneler', icon: 'pi pi-fw pi-file-edit', routerLink: ['/panel/examinations'] },
                    { label: 'Tedaviler', icon: 'pi pi-fw pi-briefcase', routerLink: ['/panel/treatments'] },
                    { label: 'Reçeteler', icon: 'pi pi-fw pi-file', routerLink: ['/panel/prescriptions'] },
                    { label: 'Aşılar', icon: 'pi pi-fw pi-shield', routerLink: ['/panel/vaccinations'] },
                    { label: 'Ödemeler', icon: 'pi pi-fw pi-credit-card', routerLink: ['/panel/payments'] }
                ]
            },
            {
                label: 'Hesap',
                items: [{ label: 'Giriş', icon: 'pi pi-fw pi-sign-in', routerLink: ['/auth/login'] }]
            }
        ];
    }
}
