import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import type { ProductDrugInfoVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { DrugGuideService } from '@/app/entities/drug-guide/services/drug-guide.service';

/**
 * Reçete satırı ve uygulama formunda seçili klinik ürünün rehber bilgisi (REF-001 Dilim 2): bağlı ruhsatlı ürünün etken
 * maddeleri ve hastanın türü ruhsatta yoksa engellemeyen bilgi notu. Ürün rehbere bağlı değilse hiçbir şey göstermez.
 * Doz ya da tedavi önermez; kayıt engellenmez.
 */
@Component({
    selector: 'app-product-drug-info-note',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (info(); as i) {
            <div class="mt-1 text-sm" data-testid="product-drug-info">
                <p class="m-0 text-muted-color">Etken madde: {{ ingredientNames(i) }}</p>
                @if (i.notLicensedForPetSpecies) {
                    <p class="m-0 mt-1 text-amber-700 dark:text-amber-300" role="status" data-testid="product-species-note"><i class="pi pi-info-circle text-xs mr-1" aria-hidden="true"></i>{{ speciesNote(i) }}</p>
                }
            </div>
        }
    `
})
export class ProductDrugInfoNoteComponent {
    readonly productId = input<string | null>(null);
    readonly petId = input<string | null>(null);

    private readonly service = inject(DrugGuideService);

    private readonly key = computed(() => ({ productId: this.productId()?.trim() || null, petId: this.petId()?.trim() || null }));

    /** Bilgi alınamazsa (ör. `DrugGuide.Read` yok) sessizce gizlenir: not yardımcıdır, akışı durdurmaz. */
    readonly info = toSignal(
        toObservable(this.key).pipe(
            switchMap(({ productId, petId }) =>
                !productId
                    ? of(null)
                    : this.service.getProductInfo([productId], petId).pipe(
                          map((rows) => rows.find((r) => r.productId === productId) ?? null),
                          catchError(() => of(null))
                      )
            )
        ),
        { initialValue: null as ProductDrugInfoVm | null }
    );

    /** Bilgi notu (ADR-049 K4); engellemez, doz ya da tedavi önermez. */
    speciesNote(i: ProductDrugInfoVm): string {
        const listed = i.targetSpecies.length > 0 ? ` (ruhsattaki türler: ${i.targetSpecies.join(', ')})` : '';

        return `Bu ürün ruhsatında ${i.petSpeciesName ?? 'bu tür'} için kayıtlı değil${listed}.`;
    }

    ingredientNames(i: ProductDrugInfoVm): string {
        return i.activeIngredients.map((a) => a.name).join(', ');
    }
}
