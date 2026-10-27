import { CommonModule } from '@angular/common';
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TagModule } from 'primeng/tag';

export type StatusTagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

@Component({
    selector: 'app-status-tag',
    standalone: true,
    imports: [CommonModule, TagModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: ` <p-tag [value]="label()" [severity]="severity()" /> `
})
export class AppStatusTagComponent {
    readonly label = input.required<string>();
    readonly severity = input<StatusTagSeverity>('secondary');
}
