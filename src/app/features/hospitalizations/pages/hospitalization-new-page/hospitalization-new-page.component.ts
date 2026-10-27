import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HospitalizationFormComponent } from '@/app/entities/procedure/components/hospitalization-form.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/** Ayrı oluşturma sayfası: form bileşenini adres çubuğu bağlamıyla (query) çalıştırır; kayıttan sonra detaya gider. */
@Component({
    selector: 'app-hospitalization-new-page',
    standalone: true,
    imports: [AppPageHeaderComponent, HospitalizationFormComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header categoryLink="/panel/hospitalizations" categoryLinkLabel="Listeye dön" title="Yeni yatış" description="Yatış kaydı oluşturun." />
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
