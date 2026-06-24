import {Component, computed, inject, input} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-floating-configurator',
    imports: [CommonModule, ButtonModule, StyleClassModule, AppConfigurator],
    template: `
        <div class="flex gap-4" [ngClass]="float() ? 'fixed top-8 right-8' : ''">
            <p-button
                type="button"
                (onClick)="toggleDarkMode()"
                [rounded]="true"
                [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"
                severity="secondary"
                [class]="toggleClass()"
            />
            @if (showPalette()) {
                <div class="relative">
                    <p-button icon="pi pi-palette" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true" type="button" rounded />
                    <app-configurator />
                </div>
            }
        </div>
    `
})
export class AppFloatingConfigurator {
    LayoutService = inject(LayoutService);

    float = input<boolean>(true);

    /** Panel dışı marka sayfalarında palette seçiciyi gizler; dark/light toggle kalır. */
    showPalette = input<boolean>(true);

    /** Auth / public topbar gibi gömülü toggle stilleri için opsiyonel sınıf. */
    toggleClass = input<string>('');

    isDarkTheme = computed(() => this.LayoutService.layoutConfig().darkTheme);

    toggleDarkMode() {
        this.LayoutService.toggleDarkMode();
    }

}
