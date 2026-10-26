import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div class="layout-footer">Vetinity</div>`
})
export class AppFooter {}
