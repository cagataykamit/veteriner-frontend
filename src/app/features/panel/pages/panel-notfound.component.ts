import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/** Panel altında bulunmayan adres: menü görünür kalır (genel site 404'üne atılmaz). */
@Component({
    selector: 'app-panel-notfound',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card flex flex-col items-center text-center py-12">
            <i class="pi pi-compass text-4xl text-muted-color mb-4"></i>
            <h1 class="text-2xl font-semibold mt-0 mb-2">Sayfa bulunamadı</h1>
            <p class="text-muted-color mt-0 mb-6">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
            <a pButton routerLink="/panel"><i class="p-button-icon pi pi-home"></i>Ana sayfaya dön</a>
        </div>
    `
})
export class PanelNotfoundComponent {}
