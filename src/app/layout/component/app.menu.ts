import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';
import { AppMenuitem } from './app.menuitem';
import { readMenuGroupPreferences, writeMenuGroupPreferences } from './menu-group-state';
import { AuthService } from '@/app/core/auth/auth.service';
import { groupForUrl, MENU_GROUPS, visibleGroups } from '@/app/core/routing/panel-navigation';

/** Alt yollarda da (`/panel/pets/:id`) vurgulanır. */
const SUBSET_ACTIVE_OPTIONS = { paths: 'subset', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' } as const;

interface MenuSection {
    /** Yoksa başlıksız: öğeler her zaman görünür. */
    readonly label?: string;
    readonly items: MenuItem[];
    readonly open: boolean;
    readonly pinned: boolean;
}

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
        <ul class="layout-menu">
            @for (section of scrollingSections(); track $index) {
                @if (section.label) {
                    <li class="layout-menu-group">
                        <button
                            type="button"
                            class="layout-menu-group-toggle"
                            [attr.aria-expanded]="section.open"
                            [attr.aria-controls]="groupId(section.label)"
                            (click)="toggle(section.label)"
                        >
                            <span>{{ section.label }}</span>
                            <i class="pi pi-angle-down layout-menu-group-chevron" [class.is-open]="section.open" aria-hidden="true"></i>
                        </button>
                        @if (section.open) {
                            <ul [id]="groupId(section.label)">
                                @for (item of section.items; track item.label) {
                                    <li app-menuitem [item]="item" [root]="false"></li>
                                }
                            </ul>
                        }
                    </li>
                } @else {
                    @for (item of section.items; track item.label) {
                        <li app-menuitem [item]="item" [root]="false"></li>
                    }
                }
            }
        </ul>
        @if (pinnedSections().length) {
            <ul class="layout-menu layout-menu-pinned">
                @for (section of pinnedSections(); track $index) {
                    @for (item of section.items; track item.label) {
                        <li app-menuitem [item]="item" [root]="false"></li>
                    }
                }
            </ul>
        }
    `
})
export class AppMenu {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    private readonly preferences = signal(readMenuGroupPreferences());

    private readonly sections = computed<MenuSection[]>(() => {
        const preferences = this.preferences();
        return visibleGroups(MENU_GROUPS, (claim) => this.auth.hasOperationClaim(claim)).map((group) => ({
            label: group.label,
            pinned: group.pinned ?? false,
            open: !group.label || (preferences[group.label] ?? group.defaultOpen ?? false),
            items: group.entries.map((entry) => ({
                label: entry.label,
                icon: entry.icon,
                routerLink: [entry.route],
                ...(entry.exact ? {} : { routerLinkActiveOptions: SUBSET_ACTIVE_OPTIONS })
            }))
        }));
    });

    protected readonly scrollingSections = computed(() => this.sections().filter((s) => !s.pinned));
    protected readonly pinnedSections = computed(() => this.sections().filter((s) => s.pinned));

    constructor() {
        this.openGroupOf(this.router.url);
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((event) => this.openGroupOf(event.urlAfterRedirects));
    }

    protected groupId(label: string): string {
        return `layout-menu-group-${label.toLocaleLowerCase('tr').replace(/\s+/g, '-')}`;
    }

    protected toggle(label: string): void {
        const open = this.sections().find((s) => s.label === label)?.open ?? false;
        this.setOpen(label, !open);
    }

    /** Gezilen sayfanın grubu açık değilse açar; kullanıcının kapattığı diğer gruplara dokunmaz. */
    private openGroupOf(url: string): void {
        const label = groupForUrl(MENU_GROUPS, url)?.label;
        if (label && this.sections().find((s) => s.label === label)?.open === false) {
            this.setOpen(label, true);
        }
    }

    private setOpen(label: string, open: boolean): void {
        this.preferences.update((current) => ({ ...current, [label]: open }));
        writeMenuGroupPreferences(this.preferences());
    }
}
