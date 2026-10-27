import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-floating-configurator',
    imports: [CommonModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div [ngClass]="float() ? 'fixed top-8 right-8' : ''">
            <button pButton type="button" iconOnly (click)="toggleDarkMode()" [rounded]="true" severity="secondary" [class]="toggleClass()" [attr.aria-label]="themeToggleLabel()"><i class="p-button-icon" [class]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'"></i></button>
        </div>
    `
})
export class AppFloatingConfigurator {
    private readonly layoutService = inject(LayoutService);

    float = input<boolean>(true);

    /** Auth / public topbar gibi gömülü toggle stilleri için opsiyonel sınıf. */
    toggleClass = input<string>('');

    isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

    themeToggleLabel = this.layoutService.themeToggleLabel;

    toggleDarkMode(): void {
        this.layoutService.toggleDarkMode();
    }
}
