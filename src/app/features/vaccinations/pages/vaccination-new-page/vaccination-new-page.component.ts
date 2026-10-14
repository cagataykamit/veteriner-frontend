import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaccinationFormComponent, type VaccinationSavedEvent } from '@/app/features/vaccinations/components/vaccination-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-vaccination-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, VaccinationFormComponent],
    template: `
        <app-page-header categoryLink="/panel/vaccinations" categoryLinkLabel="Aşı listesine dön" title="Yeni Aşı" description="Aşı kaydı oluşturun." />
        <app-vaccination-form [contextParams]="contextParams" (saved)="onSaved($event)" (cancelled)="goList()" />
    `
})
export class VaccinationNewPageComponent {
    private readonly router = inject(Router);
    readonly contextParams = inject(ActivatedRoute).snapshot.queryParamMap;

    goList(): void {
        void this.router.navigate(['/panel/vaccinations']);
    }

    onSaved({ id, stockNotice }: VaccinationSavedEvent): void {
        void this.router.navigate(['/panel/vaccinations', id], {
            queryParams: { saved: '1' },
            state: stockNotice ? { stockNotice } : undefined
        });
    }
}
