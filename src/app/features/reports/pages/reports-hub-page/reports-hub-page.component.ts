import { Component, computed, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { type CardEntry, REPORT_SECTIONS, visibleGroups } from '@/app/core/routing/panel-navigation';
import { ReportPreferencesService, reportKeyFromRoute } from '@/app/features/reports/shared/report-preferences.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { NavigationCardsComponent } from '@/app/shared/ui/navigation-cards/navigation-cards.component';

/**
 * Rapor Merkezi: erişilebilen raporları gruplanmış kartlarla listeler (ADR-003). Kullanıcının favorileri (REPORT-003) en üstte
 * ayrı bölümde, eklenme sırasıyla; yalnız izni olan raporlar görünür (favori izin açmaz). Favoriler yüklenemezse merkez yine çalışır.
 */
@Component({
    selector: 'app-reports-hub-page',
    standalone: true,
    imports: [AppPageHeaderComponent, NavigationCardsComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Raporlar" description="Randevu, klinik ve para raporlarına buradan ulaşın." />

        @if (favoriteError(); as message) {
            <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ message }}</p>
        }

        @if (favoriteEntries().length > 0) {
            <h5 class="mt-0 mb-3" data-testid="favorites-section"><i class="pi pi-star-fill text-amber-500 mr-2" aria-hidden="true"></i>{{ copy.reportsFavoritesSection }}</h5>
            <app-navigation-cards [entries]="favoriteEntries()" [favoriteRoutes]="favoriteRoutes()" (favoriteToggle)="toggleFavorite($event)" class="block mb-6" />
        }

        @for (section of sections; track section.label) {
            <h5 class="mt-0 mb-3">{{ section.label }}</h5>
            <app-navigation-cards [entries]="section.entries" [favoriteRoutes]="favoriteRoutes()" (favoriteToggle)="toggleFavorite($event)" class="block mb-6" />
        }
    `
})
export class ReportsHubPageComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly preferences = inject(ReportPreferencesService);

    readonly copy = PANEL_COPY;
    readonly sections = visibleGroups(REPORT_SECTIONS, (claim) => this.auth.hasOperationClaim(claim));

    /** Favori rapor anahtarları, eklenme sırasıyla (sunucu sırası; yeni eklenen sona). */
    readonly favoriteKeys = signal<readonly string[]>([]);
    readonly favoriteError = signal<string | null>(null);

    private readonly visibleEntries: readonly CardEntry[] = this.sections.flatMap((s) => s.entries);

    readonly favoriteEntries = computed(() =>
        this.favoriteKeys().flatMap((key) => this.visibleEntries.filter((e) => reportKeyFromRoute(e.route) === key))
    );

    readonly favoriteRoutes = computed<ReadonlySet<string>>(() => new Set(this.favoriteEntries().map((e) => e.route)));

    ngOnInit(): void {
        this.preferences.listFavoriteKeys().subscribe({
            next: (keys) => this.favoriteKeys.set(keys),
            error: () => this.favoriteKeys.set([])
        });
    }

    /** İyimser güncelleme: yıldız hemen değişir, istek başarısızsa önceki duruma döner ve uyarı gösterilir. */
    toggleFavorite(route: string): void {
        const key = reportKeyFromRoute(route);

        if (!key) {
            return;
        }

        const before = this.favoriteKeys();
        const isFavorite = before.includes(key);

        this.favoriteError.set(null);
        this.favoriteKeys.set(isFavorite ? before.filter((k) => k !== key) : [...before, key]);

        (isFavorite ? this.preferences.removeFavorite(key) : this.preferences.addFavorite(key)).subscribe({
            error: () => {
                this.favoriteKeys.set(before);
                this.favoriteError.set(PANEL_COPY.reportsFavoriteSaveFailed);
            }
        });
    }
}
