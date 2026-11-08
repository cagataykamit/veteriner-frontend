import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, RESPONSE_INIT, signal } from '@angular/core';
import type { SiteSlot } from '@site-engine';
import { SiteHead } from '../site-head';
import { VetFinderCardComponent } from './vet-finder-card.component';
import {
    VET_FINDER_LIST_PATH,
    VET_FINDER_ROOT,
    VET_FINDER_SLOTS_PATH,
    type VetFinderCard,
    type VetFinderList,
    type VetFinderNextSlots,
    type VetFinderRequestState,
    vetFinderHead,
    vetFinderHref
} from './vet-finder-state';

interface PlaceLink {
    readonly href: string;
    readonly name: string;
    readonly count: number;
}

interface ServiceLink {
    readonly href: string;
    readonly name: string;
    readonly active: boolean;
}

/**
 * Veteriner bul sayfası (TIER-015, ADR-047). Liste sunucuda çizilir ve JS'siz okunur; filtreler gerçek bağlantıdır. Tarayıcıda yalnız iki
 * ek iş vardır: kartların en yakın saati (sayfa başına tek istek) ve isteğe bağlı konumla yeniden sıralama. İkisi de site sunucusuna
 * gider; konum gövdeyle gönderilir, adrese yazılmaz.
 */
@Component({
    selector: 'site-vet-finder-page',
    standalone: true,
    imports: [VetFinderCardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="vf">
            <header class="vf-top">
                <a class="vf-brand" [href]="root">Vetinity <span>Veteriner bul</span></a>
            </header>

            <main class="vf-main">
                @if (crumbs().length) {
                    <nav class="vf-crumbs" aria-label="Konum">
                        <a [href]="root">Veteriner bul</a>
                        @for (crumb of crumbs(); track crumb.href) {
                            <span aria-hidden="true">/</span>
                            <a [href]="crumb.href">{{ crumb.name }}</a>
                        }
                    </nav>
                }
                <h1 class="vf-title">{{ head().heading }}</h1>

                @if (list(); as l) {
                    <p class="vf-lead">
                        {{ l.total }} klinik
                        @if (l.openNow) {
                            · şu an açık olanlar
                        }
                        @if (l.usesDistance) {
                            · konumunuza göre sıralı
                        }
                    </p>

                    <div class="vf-filters" role="group" aria-label="Filtreler">
                        <a class="vf-chip" [class.is-on]="l.openNow" [href]="openNowHref()" [attr.aria-pressed]="l.openNow">Şu an açık</a>
                        @for (service of serviceLinks(); track service.href) {
                            <a class="vf-chip" [class.is-on]="service.active" [href]="service.href" [attr.aria-pressed]="service.active">{{ service.name }}</a>
                        }
                    </div>

                    @if (l.anyClinicHasLocation && l.total > 0) {
                        <div class="vf-locate">
                            <button type="button" class="vf-btn" [disabled]="locating() === 'busy'" (click)="sortByLocation()">
                                {{ locating() === 'busy' ? 'Konum alınıyor…' : 'Konumuma göre sırala' }}
                            </button>
                            <small>{{ locateNote() }}</small>
                        </div>
                    }

                    @if (placeLinks().length) {
                        <nav class="vf-places" [attr.aria-label]="l.city ? 'İlçeler' : 'İller'">
                            @for (place of placeLinks(); track place.href) {
                                <a [href]="place.href">{{ place.name }} <span>{{ place.count }}</span></a>
                            }
                        </nav>
                    }

                    @if (l.total === 0) {
                        <section class="vf-empty" aria-live="polite">
                            <p>Bu filtrelerle listelenen klinik yok.</p>
                            @if (l.suggestedDistricts.length) {
                                <p>{{ l.city?.name }} içindeki diğer ilçelere bakabilirsiniz:</p>
                                <nav class="vf-places" aria-label="Diğer ilçeler">
                                    @for (d of l.suggestedDistricts; track d.slug) {
                                        <a [href]="districtHref(l, d.slug)">{{ d.name }} <span>{{ d.clinicCount }}</span></a>
                                    }
                                </nav>
                            }
                            @if (l.openNow || l.service) {
                                <a class="vf-btn" [href]="clearFiltersHref()">Filtreleri kaldır</a>
                            }
                        </section>
                    } @else {
                        <ol class="vf-list">
                            @for (card of l.clinics; track card.key) {
                                <li><site-vet-finder-card [card]="card" [slot]="slots()[card.key]" [now]="now" /></li>
                            }
                        </ol>
                        @if (location()) {
                            @if (l.total > l.clinics.length) {
                                <button type="button" class="vf-btn vf-more" [disabled]="loadingMore()" (click)="loadMore()">Daha fazla klinik</button>
                            }
                        } @else if (l.page > 1 || l.total > l.page * l.pageSize) {
                            <nav class="vf-pages" aria-label="Sayfalar">
                                @if (l.page > 1) {
                                    <a class="vf-btn" [href]="pageHref(l.page - 1)" rel="prev">Önceki sayfa</a>
                                }
                                @if (l.total > l.page * l.pageSize) {
                                    <a class="vf-btn" [href]="pageHref(l.page + 1)" rel="next">Sonraki sayfa</a>
                                }
                            </nav>
                        }
                    }
                } @else {
                    <section class="vf-empty">
                        <p>{{ state().status === 'notfound' ? 'Adres yanlış olabilir ya da bu bölgedeki klinikler henüz listelenmiyor.' : 'Kısa bir süre sonra yeniden deneyin.' }}</p>
                        @if (cityLinks().length) {
                            <nav class="vf-places" aria-label="İller">
                                @for (place of cityLinks(); track place.href) {
                                    <a [href]="place.href">{{ place.name }} <span>{{ place.count }}</span></a>
                                }
                            </nav>
                        }
                    </section>
                }

                <section class="vf-how" aria-labelledby="vf-how-title">
                    <h2 id="vf-how-title">Nasıl sıralıyoruz</h2>
                    <p>
                        Önce şu an açık klinikler gelir. Sonra yakınlığa bakılır: konumunuzu paylaşırsanız ve klinik konumunu verdiyse mesafeye göre, paylaşmazsanız aynı
                        ilçe, sonra aynı il. Eşitlikte klinik adına göre sıralanır. Sıra ödemeyle değişmez; klinikler listelenmek için ücret ödemez.
                    </p>
                    <p>Kartlardaki bilgileri klinikler kendisi verir. Yorum ve puan yoktur. Saatler İstanbul saatine göredir; randevu talebi klinik onaylayınca kesinleşir.</p>
                </section>
            </main>

            <footer class="vf-foot">
                <p>Klinik misiniz? Vetinity panelinde Ayarlar &gt; Veteriner bul'dan listelenmeyi açıp kapatabilirsiniz.</p>
            </footer>
        </div>
    `
})
export class VetFinderPageComponent {
    readonly state = input.required<VetFinderRequestState>();

    private readonly siteHead = inject(SiteHead);
    private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

    protected readonly root = VET_FINDER_ROOT;
    protected readonly now = new Date();
    /** Konumla yeniden sıralanınca değişir; ilk değer sunucudan. */
    protected readonly list = linkedSignal<VetFinderList | null>(() => this.state().list);
    protected readonly slots = signal<Readonly<Record<string, SiteSlot | null>>>({});
    protected readonly location = signal<{ readonly lat: number; readonly lng: number } | null>(null);
    protected readonly locating = signal<'idle' | 'busy' | 'done' | 'denied' | 'error'>('idle');
    protected readonly loadingMore = signal(false);

    protected readonly head = computed(() => vetFinderHead(this.state()));
    protected readonly crumbs = computed(() => {
        const l = this.state().list;
        const crumbs: { href: string; name: string }[] = [];

        if (l?.city) crumbs.push({ href: vetFinderHref({ city: l.city.slug }), name: l.city.name });
        if (l?.city && l.district) crumbs.push({ href: vetFinderHref({ city: l.city.slug, district: l.district.slug }), name: l.district.name });

        return crumbs;
    });

    protected readonly cityLinks = computed<PlaceLink[]>(() =>
        (this.state().regions?.cities ?? []).map((c) => ({ href: vetFinderHref({ city: c.slug }), name: c.name, count: c.clinicCount }))
    );

    /** Kökte iller, il sayfasında ilçeler; ilçe sayfasında yer listesi yok (üst gezinme yeter). */
    protected readonly placeLinks = computed<PlaceLink[]>(() => {
        const l = this.state().list;

        if (!l || l.district) return [];
        if (!l.city) return this.cityLinks();

        const city = this.state().regions?.cities.find((c) => c.slug === l.city!.slug);

        return (city?.districts ?? []).map((d) => ({ href: vetFinderHref({ city: city!.slug, district: d.slug }), name: d.name, count: d.clinicCount }));
    });

    /** İlçe sayfasında yalnız o ilçede verilen hizmetler, il ve kökte tüm liste. Seçili hizmete tıklamak filtreyi kaldırır. */
    protected readonly serviceLinks = computed<ServiceLink[]>(() => {
        const l = this.state().list;
        const regions = this.state().regions;

        if (!l || !regions) return [];

        const district = l.district ? regions.cities.find((c) => c.slug === l.city?.slug)?.districts.find((d) => d.slug === l.district!.slug) : null;
        const offered = district ? new Set(district.services.map((s) => s.key)) : null;
        const base = { city: l.city?.slug ?? null, district: l.district?.slug ?? null, openNow: l.openNow };

        return regions.services
            .filter((s) => !offered || offered.has(s.key) || s.key === l.service?.key)
            .map((s) => {
                const active = s.key === l.service?.key;

                return { href: vetFinderHref({ ...base, service: active ? null : s.key }), name: s.name, active };
            });
    });

    protected readonly locateNote = computed(() => {
        switch (this.locating()) {
            case 'done':
                return 'Konumunuz yalnız bu sıralama için kullanıldı, yaklaşık 1 km\'ye yuvarlandı ve saklanmadı.';
            case 'denied':
                return 'Konum izni verilmedi; liste ilçe ve il sırasıyla kaldı.';
            case 'error':
                return 'Konum alınamadı; liste ilçe ve il sırasıyla kaldı.';
            default:
                return 'Konumunuz yalnız sıralama için kullanılır ve saklanmaz.';
        }
    });

    constructor() {
        effect(() => {
            const state = this.state();

            this.siteHead.applyVetFinder(this.head());
            if (this.responseInit) this.responseInit.status = state.status === 'ok' ? 200 : state.status === 'notfound' ? 404 : 503;
        });
        afterNextRender(() => void this.loadSlots(this.list()?.clinics ?? []));
    }

    protected openNowHref(): string {
        const l = this.list()!;

        return vetFinderHref({ city: l.city?.slug, district: l.district?.slug, service: l.service?.key, openNow: !l.openNow });
    }

    protected clearFiltersHref(): string {
        const l = this.list()!;

        return vetFinderHref({ city: l.city?.slug, district: l.district?.slug });
    }

    protected pageHref(page: number): string {
        const l = this.list()!;

        return vetFinderHref({ city: l.city?.slug, district: l.district?.slug, service: l.service?.key, openNow: l.openNow, page });
    }

    protected districtHref(l: VetFinderList, district: string): string {
        return vetFinderHref({ city: l.city?.slug, district, service: l.service?.key });
    }

    protected sortByLocation(): void {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            this.locating.set('error');

            return;
        }

        this.locating.set('busy');
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const location = { lat: Math.round(coords.latitude * 100) / 100, lng: Math.round(coords.longitude * 100) / 100 };
                const list = await this.fetchList(1, location);

                if (!list) {
                    this.locating.set('error');

                    return;
                }

                this.location.set(location);
                this.list.set(list);
                this.locating.set('done');
                await this.loadSlots(list.clinics);
            },
            (error) => this.locating.set(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'),
            { maximumAge: 10 * 60 * 1000, timeout: 10_000 }
        );
    }

    protected async loadMore(): Promise<void> {
        const current = this.list();
        const location = this.location();

        if (!current || !location) return;

        this.loadingMore.set(true);
        const next = await this.fetchList(current.page + 1, location);

        this.loadingMore.set(false);

        if (!next) return;

        this.list.set({ ...next, clinics: [...current.clinics, ...next.clinics.filter((c) => !current.clinics.some((x) => x.key === c.key))] });
        await this.loadSlots(next.clinics);
    }

    private async fetchList(page: number, location: { readonly lat: number; readonly lng: number }): Promise<VetFinderList | null> {
        const l = this.state().list;

        try {
            const response = await fetch(VET_FINDER_LIST_PATH, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ city: l?.city?.slug ?? null, district: l?.district?.slug ?? null, service: l?.service?.key ?? null, openNow: l?.openNow ?? false, page, ...location })
            });

            return response.ok ? ((await response.json()) as VetFinderList) : null;
        } catch {
            return null;
        }
    }

    /** Yalnız saati gösterilebilecek kartlar sorulur; hata ya da hız sınırında kart saatsiz kalır, randevu düğmesi durur. */
    private async loadSlots(cards: readonly VetFinderCard[]): Promise<void> {
        const known = this.slots();
        const keys = cards.filter((c) => c.showsNextSlot && c.bookingUrl && !(c.key in known)).map((c) => c.key);

        if (keys.length === 0) return;

        try {
            const response = await fetch(`${VET_FINDER_SLOTS_PATH}?keys=${keys.map(encodeURIComponent).join(',')}`, { headers: { accept: 'application/json' } });

            if (!response.ok) return;

            const body = (await response.json()) as VetFinderNextSlots;

            this.slots.update((slots) => ({ ...slots, ...Object.fromEntries(body.items.map((item) => [item.key, item.slot])) }));
        } catch {
            // Saat isteğe bağlıdır; kart saatsiz kalır.
        }
    }
}
