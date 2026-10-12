import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/auth/auth.service';
import { MENU_GROUPS, visibleGroups } from '@/app/core/routing/panel-navigation';

/** Alt yollarda da (`/panel/pets/:id`) vurgulanır. */
const SUBSET_ACTIVE_OPTIONS = { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' } as const;

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
    private readonly auth = inject(AuthService);
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = visibleGroups(MENU_GROUPS, (claim) => this.auth.hasOperationClaim(claim)).map((group) => ({
            label: group.label,
            items: group.entries.map((entry) => ({
                label: entry.label,
                icon: entry.icon,
                routerLink: [entry.route],
                ...(entry.exact ? {} : { routerLinkActiveOptions: SUBSET_ACTIVE_OPTIONS })
            }))
        }));
    }
}
