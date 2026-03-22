import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-error-state',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <i class="pi pi-exclamation-circle text-muted-color text-4xl mb-4"></i>
            <p class="text-surface-900 dark:text-surface-0 m-0 mb-2 font-medium">{{ title() }}</p>
            @if (detail()) {
                <span class="text-muted-color text-sm mb-4">{{ detail() }}</span>
            }
            @if (showRetry()) {
                <p-button [label]="retryLabel()" icon="pi pi-refresh" severity="secondary" (onClick)="retry.emit()" />
            }
        </div>
    `
})
export class AppErrorStateComponent {
    readonly title = input<string>('Bir sorun oluştu');
    readonly detail = input<string>();
    readonly showRetry = input<boolean>(true);
    readonly retryLabel = input<string>('Yeniden dene');

    readonly retry = output<void>();
}
