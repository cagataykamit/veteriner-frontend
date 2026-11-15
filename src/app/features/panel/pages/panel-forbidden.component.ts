import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/** Rota koruması yetki bulamadığında: panel içinde kalır, sayfanın var olduğunu ama yetki gerektiğini söyler. */
@Component({
    selector: 'app-panel-forbidden',
    standalone: true,
    imports: [RouterLink, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card flex flex-col items-center text-center py-12">
            <i class="pi pi-lock text-4xl text-muted-color mb-4"></i>
            <h1 class="text-2xl font-semibold mt-0 mb-2">Bu sayfa için yetkiniz yok</h1>
            <p class="text-muted-color mt-0 mb-6">Yöneticinize başvurun.</p>
            <a pButton routerLink="/panel"><i class="p-button-icon pi pi-home"></i>Ana sayfaya dön</a>
        </div>
    `
})
export class PanelForbiddenComponent {}
