import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ADMINISTRATION_ROUTE_OPTIONS, ADMINISTRATION_SITE_MAX, type AdministrationRouteApi } from '@/app/entities/administration/utils/administration-route.utils';

/**
 * Uygulama yolu (liste) ve bölgesi (serbest metin) alanları (RECORD-005); ikisi de isteğe bağlı. Uygulama diyaloğu ve aşı
 * formları aynı alanı kullanır. Ebeveyn grid'inde iki yarım sütun kaplar.
 */
@Component({
    selector: 'app-administration-route-site-fields',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule],
    host: { class: 'contents' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="col-span-12 sm:col-span-6">
            <label [for]="idPrefix() + '-route'" class="block text-sm font-medium text-muted-color mb-2">Uygulama yolu</label>
            <p-select [inputId]="idPrefix() + '-route'" [formControl]="routeControl()" [options]="routeOptions" optionLabel="label" optionValue="value" [showClear]="true" placeholder="Seçilmedi" appendTo="body" class="w-full" />
        </div>
        <div class="col-span-12 sm:col-span-6">
            <label [for]="idPrefix() + '-site'" class="block text-sm font-medium text-muted-color mb-2">Uygulama bölgesi</label>
            <input [id]="idPrefix() + '-site'" type="text" class="w-full p-inputtext p-component" [formControl]="siteControl()" placeholder="örn. sağ arka bacak" autocomplete="off" [attr.maxlength]="siteMax" />
        </div>
    `
})
export class AdministrationRouteSiteFieldsComponent {
    readonly routeControl = input.required<FormControl<AdministrationRouteApi | null>>();
    readonly siteControl = input.required<FormControl<string>>();
    readonly idPrefix = input('route-site');

    protected readonly routeOptions = ADMINISTRATION_ROUTE_OPTIONS;
    protected readonly siteMax = ADMINISTRATION_SITE_MAX;
}
