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
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/panel/dashboard'] }]
            },
            {
                label: 'Hasta Yonetimi',
                items: [
                    { label: 'Clients', icon: 'pi pi-fw pi-users', routerLink: ['/panel/clients'] },
                    { label: 'Pets', icon: 'pi pi-fw pi-heart', routerLink: ['/panel/pets'] },
                    { label: 'Appointments', icon: 'pi pi-fw pi-calendar', routerLink: ['/panel/appointments'] },
                    { label: 'Examinations', icon: 'pi pi-fw pi-file-edit', routerLink: ['/panel/examinations'] },
                    { label: 'Vaccinations', icon: 'pi pi-fw pi-shield', routerLink: ['/panel/vaccinations'] },
                    { label: 'Payments', icon: 'pi pi-fw pi-credit-card', routerLink: ['/panel/payments'] }
                ]
            },
            {
                label: 'Auth',
                items: [
                    { label: 'Login', icon: 'pi pi-fw pi-sign-in', routerLink: ['/auth/login'] }
                ]
            }
        ];
    }
}
