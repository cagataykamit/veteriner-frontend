import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
    selector: 'app-empty-state',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <i [class]="iconClass() + ' text-muted-color text-4xl mb-4'"></i>
            <p class="text-muted-color m-0 mb-2">{{ message() }}</p>
            @if (hint()) {
                <span class="text-muted-color text-sm">{{ hint() }}</span>
            }
            <div class="mt-4">
                <ng-content />
            </div>
        </div>
    `
})
export class AppEmptyStateComponent {
    readonly message = input.required<string>();
    readonly hint = input<string>();
    readonly iconClass = input<string>('pi pi-inbox');
}
