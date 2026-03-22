import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-loading-state',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule],
    template: `
        <div class="flex flex-col items-center justify-center py-8 gap-4">
            <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }" />
            @if (message()) {
                <span class="text-muted-color text-sm">{{ message() }}</span>
            }
        </div>
    `
})
export class AppLoadingStateComponent {
    readonly message = input<string>('Yükleniyor…');
}
