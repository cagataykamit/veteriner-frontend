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
            <p-button type="button" (onClick)="toggleDarkMode()" [rounded]="true" [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'" severity="secondary" [class]="toggleClass()" [ariaLabel]="themeToggleLabel()" />
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
