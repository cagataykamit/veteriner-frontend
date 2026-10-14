import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HospitalizationFormComponent } from '@/app/features/hospitalizations/components/hospitalization-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-hospitalization-new-page',
    standalone: true,
    imports: [RouterLink, AppPageHeaderComponent, HospitalizationFormComponent],
    template: `
        <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        <app-page-header title="Yeni yatış" description="Yatış kaydı oluşturun." />
        <app-hospitalization-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class HospitalizationNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/hospitalizations']);
    }

    onSaved(id: string): void {
        void this.router.navigate(['/panel/hospitalizations', id], { queryParams: { saved: 'created' } });
    }
}
