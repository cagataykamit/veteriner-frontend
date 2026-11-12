import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, linkedSignal, RESPONSE_INIT, signal } from '@angular/core';
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
    /** Seçicide o an seçili olan yer. */
    readonly current?: boolean;
}

/** Tanıtım sitesinin logosu (`angular.json` → `_brand`); adres uygulamanın tabanına (`/k/`) göre çözülür. */
const LOGO = '_brand/vetinity-compact.svg';
const LOGO_DARK = '_brand/vetinity-compact-dark.svg';

/** Tanıtım sitesi ve panel aynı alan adındadır; bu sayfalar o uygulamada yaşar, burada yalnız bağlantı verilir. */
const MARKETING_LINKS = {
    home: '/',
    listing: '/ozellikler#hasta-sahibi',
    login: '/auth/login',
    privacy: '/gizlilik',
    terms: '/kullanim-sartlari'
} as const;

interface ServiceLink {
    readonly href: string;
    readonly name: string;
    readonly active: boolean;
}

/**
 * Veteriner bul sayfası (TIER-015, ADR-047). Liste sunucuda çizilir ve JS'siz okunur; il, ilçe ve filtreler gerçek bağlantıdır (seçiciler
 * `<details>`). Tarayıcıda yalnız üç ek iş vardır: kartların en yakın saati (sayfa başına tek istek), isteğe bağlı konumla yeniden
 * sıralama ve açık seçicinin dışarı tıklama ya da Escape ile kapanması. İstekler site sunucusuna gider; konum gövdeyle gönderilir,
 * adrese yazılmaz. Görünüm tanıtım sitesinin markasıdır (`vet-finder.css`).
 */
@Component({
    selector: 'site-vet-finder-page',
    standalone: true,
    imports: [VetFinderCardComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '(document:click)': 'closePicks($event.target)', '(document:keydown.escape)': 'closePicks(null)' },
    template: `
        <div class="vf">
            <header class="vf-top">
                <div class="vf-wrap">
                    <a class="vf-brand" [href]="root" aria-label="Vetinity Veteriner bul">
                        <picture>
                            <source [attr.srcset]="logoDark" media="(prefers-color-scheme: dark)" />
                            <img [src]="logo" alt="Vetinity" width="160" height="40" />
                        </picture>
                        <span>Veteriner bul</span>
                    </a>
                    <p class="vf-top-clinic">
                        <span>Klinik misiniz?</span>
                        <a [href]="links.listing">Kliniğinizi listeleyin</a>
                    </p>
                </div>
            </header>

            <main class="vf-main">
                <section class="vf-hero">
                    <div class="vf-wrap">
                        @if (crumbs().length) {
                            <nav class="vf-crumbs" aria-label="Konum">
                                <a [href]="root">Veteriner bul</a>
                                @for (crumb of crumbs(); track crumb.href) {
                                    <span aria-hidden="true">/</span>
                                    <a [href]="crumb.href">{{ crumb.name }}</a>
                                }
                            </nav>
                        } @else {
                            <p class="vf-eyebrow">Veteriner bul</p>
                        }
                        <h1 class="vf-title">{{ head().heading }}</h1>
                        @if (lead(); as text) {
                            <p class="vf-lead">{{ text }}</p>
                        }
                    </div>
                </section>

                <div class="vf-wrap">
                    @if (list(); as l) {
                        @if (hasClinics()) {
                            <!-- İl ve ilçe listeleri <details> içinde gerçek bağlantıdır: JS'siz açılır, arama motoru izler -->
                            <div class="vf-finder">
                                <div class="vf-finder-row">
                                    <details class="vf-pick" name="vf-pick">
                                        <summary>
                                            <i class="pi pi-map-marker" aria-hidden="true"></i>
                                            <span><small>İl</small><strong>{{ l.city?.name ?? 'Tüm iller' }}</strong></span>
                                            <i class="pi pi-chevron-down" aria-hidden="true"></i>
                                        </summary>
                                        <ul class="vf-pick-menu">
                                            @for (place of cityPicks(); track place.href) {
                                                <li>
                                                    <a [href]="place.href" [attr.aria-current]="place.current ? 'true' : null">{{ place.name }} <span>{{ place.count }}</span></a>
                                                </li>
                                            }
                                        </ul>
                                    </details>
                                    @if (districtPicks().length) {
                                        <details class="vf-pick" name="vf-pick">
                                            <summary>
                                                <i class="pi pi-building" aria-hidden="true"></i>
                                                <span><small>İlçe</small><strong>{{ l.district?.name ?? 'Tüm ilçeler' }}</strong></span>
                                                <i class="pi pi-chevron-down" aria-hidden="true"></i>
                                            </summary>
                                            <ul class="vf-pick-menu">
                                                @for (place of districtPicks(); track place.href) {
                                                    <li>
                                                        <a [href]="place.href" [attr.aria-current]="place.current ? 'true' : null">{{ place.name }} <span>{{ place.count }}</span></a>
                                                    </li>
                                                }
                                            </ul>
                                        </details>
                                    } @else {
                                        <div class="vf-pick is-off">
                                            <i class="pi pi-building" aria-hidden="true"></i>
                                            <span><small>İlçe</small><strong>Önce il seçin</strong></span>
                                        </div>
                                    }
                                    <a class="vf-toggle" [class.is-on]="l.openNow" [href]="openNowHref()" [attr.aria-current]="l.openNow ? 'true' : null">
                                        <i aria-hidden="true"></i>Şu an açık
                                    </a>
                                    @if (l.anyClinicHasLocation && l.total > 0) {
                                        <button type="button" class="vf-btn" [disabled]="locating() === 'busy'" (click)="sortByLocation()">
                                            <i class="pi pi-compass" aria-hidden="true"></i>{{ locating() === 'busy' ? 'Konum alınıyor…' : 'Konumuma göre sırala' }}
                                        </button>
                                    }
                                </div>
                                @if (l.anyClinicHasLocation && l.total > 0) {
                                    <p class="vf-finder-note">{{ locateNote() }}</p>
                                }
                            </div>
                        }

                        @if (l.total > 0) {
                            <div class="vf-results-head">
                                <h2 class="vf-count">{{ l.total }} klinik</h2>
                                <span class="vf-count-note">{{ countNote() }}</span>
                            </div>
                        }

                        @if (serviceLinks().length && (l.total > 0 || l.service)) {
                            <div class="vf-services" role="group" aria-label="Hizmete göre filtrele">
                                <span class="vf-services-label">Hizmet</span>
                                <ul class="vf-chips">
                                    @for (service of serviceLinks(); track service.href) {
                                        <li>
                                            <a class="vf-chip" [class.is-on]="service.active" [href]="service.href" [attr.aria-current]="service.active ? 'true' : null">
                                                {{ service.name }}
                                                @if (service.active) {
                                                    <i class="pi pi-times" aria-hidden="true"></i>
                                                }
                                            </a>
                                        </li>
                                    }
                                </ul>
                            </div>
                        }

                        @if (l.total === 0) {
                            @if (hasClinics()) {
                                <section class="vf-empty" aria-live="polite">
                                    <span class="vf-empty-icon" aria-hidden="true"><i class="pi pi-search"></i></span>
                                    <h2>{{ l.openNow || l.service ? 'Bu filtrelere uyan klinik yok' : 'Bu bölgede henüz listelenen klinik yok' }}</h2>
                                    @if (l.suggestedDistricts.length) {
                                        <p>{{ l.city?.name }} içinde şu ilçelere bakabilirsiniz:</p>
                                        <ul class="vf-chips" aria-label="Diğer ilçeler">
                                            @for (d of l.suggestedDistricts; track d.slug) {
                                                <li>
                                                    <a class="vf-chip" [href]="districtHref(l, d.slug)">{{ d.name }} <span>{{ d.clinicCount }}</span></a>
                                                </li>
                                            }
                                        </ul>
                                    }
                                    @if (l.openNow || l.service) {
                                        <a class="vf-btn" [href]="clearFiltersHref()">Filtreleri kaldır</a>
                                    }
                                </section>
                            } @else {
                                <section class="vf-empty">
                                    <span class="vf-empty-icon" aria-hidden="true"><i class="pi pi-map-marker"></i></span>
                                    <h2>Klinikler listelenmeye başlıyor</h2>
                                    <p>Veteriner bul yeni açıldı. Klinikler katıldıkça il ve ilçenize göre burada göreceksiniz.</p>
                                </section>
                            }
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
                            <span class="vf-empty-icon" aria-hidden="true"><i class="pi pi-info-circle"></i></span>
                            <p>{{ state().status === 'notfound' ? 'Adres yanlış olabilir ya da bu bölgedeki klinikler henüz listelenmiyor.' : 'Kısa bir süre sonra yeniden deneyin.' }}</p>
                            @if (cityLinks().length) {
                                <ul class="vf-chips" aria-label="İller">
                                    @for (place of cityLinks(); track place.href) {
                                        <li>
                                            <a class="vf-chip" [href]="place.href">{{ place.name }} <span>{{ place.count }}</span></a>
                                        </li>
                                    }
                                </ul>
                            }
                        </section>
                    }

                    <aside class="vf-clinic" aria-labelledby="vf-clinic-title">
                        <div>
                            <h2 id="vf-clinic-title">Klinik misiniz? Burada yer alın</h2>
                            <p>Listelenmek ücretsizdir ve sıra ödemeyle değişmez. Adresiniz, saatleriniz ve randevu bağlantınız tek kartta görünür.</p>
                            <small>Vetinity kullanıyorsanız: panelde Ayarlar &gt; Veteriner bul.</small>
                        </div>
                        <a class="vf-btn" [href]="links.home">Vetinity'yi tanıyın</a>
                    </aside>

                    <section class="vf-how" aria-labelledby="vf-how-title">
                        <h2 id="vf-how-title">Nasıl sıralıyoruz</h2>
                        <ol>
                            <li><b>Önce şu an açık olanlar</b><span>Açık klinikler listenin başında gelir.</span></li>
                            <li><b>Sonra size yakın olanlar</b><span>Konum paylaşırsanız mesafeye, paylaşmazsanız ilçe ve ile göre.</span></li>
                            <li><b>Sıra ödemeyle değişmez</b><span>Klinikler listelenmek için ücret ödemez.</span></li>
                        </ol>
                        <details>
                            <summary>Bilmeniz gerekenler</summary>
                            <ul>
                                <li>Karttaki bilgileri klinik kendisi girer. Yorum ve puan yoktur.</li>
                                <li>Mesafe, yalnız klinik konumunu verdiyse hesaplanır. Eşit durumda klinikler ada göre sıralanır.</li>
                                <li>Saatler Türkiye saatiyledir.</li>
                                <li>Randevu talebiniz klinik onaylayınca kesinleşir.</li>
                            </ul>
                        </details>
                    </section>
                </div>
            </main>

            <footer class="vf-foot">
                <div class="vf-wrap">
                    <img [src]="logoDark" alt="Vetinity" width="120" height="30" />
                    <nav aria-label="Alt bilgi">
                        <a [href]="links.home">Vetinity nedir?</a>
                        <a [href]="links.login">Klinik girişi</a>
                        <a [href]="links.privacy">Gizlilik</a>
                        <a [href]="links.terms">Kullanım şartları</a>
                    </nav>
                </div>
            </footer>
        </div>
    `
})
export class VetFinderPageComponent {
    readonly state = input.required<VetFinderRequestState>();

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly siteHead = inject(SiteHead);
    private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

    protected readonly root = VET_FINDER_ROOT;
    protected readonly links = MARKETING_LINKS;
    protected readonly logo = LOGO;
    protected readonly logoDark = LOGO_DARK;
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

    /** Hiç klinik listelenmiyorsa seçiciler ve filtreler gösterilmez; sayfa durumu söyler, uydurma sayı yazmaz. */
    protected readonly hasClinics = computed(() => (this.state().regions?.totalClinics ?? 0) > 0);

    /** İl seçicisi: "Tüm iller" ve klinik listelenen iller. */
    protected readonly cityPicks = computed<PlaceLink[]>(() => {
        const regions = this.state().regions;
        const current = this.state().list?.city?.slug ?? null;

        return [
            { href: VET_FINDER_ROOT, name: 'Tüm iller', count: regions?.totalClinics ?? 0, current: current === null },
            ...(regions?.cities ?? []).map((c) => ({ href: vetFinderHref({ city: c.slug }), name: c.name, count: c.clinicCount, current: c.slug === current }))
        ];
    });

    /** İlçe seçicisi: yalnız il seçiliyken; "Tüm ilçeler" il sayfasıdır. */
    protected readonly districtPicks = computed<PlaceLink[]>(() => {
        const l = this.state().list;
        const city = l?.city ? this.state().regions?.cities.find((c) => c.slug === l.city!.slug) : null;

        if (!l || !city) return [];

        return [
            { href: vetFinderHref({ city: city.slug }), name: 'Tüm ilçeler', count: city.clinicCount, current: !l.district },
            ...city.districts.map((d) => ({ href: vetFinderHref({ city: city.slug, district: d.slug }), name: d.name, count: d.clinicCount, current: d.slug === l.district?.slug }))
        ];
    });

    protected readonly lead = computed(() => {
        const l = this.state().list;

        if (!l) return null;

        return l.city
            ? 'Adres, telefon ve çalışma saatleri tek kartta. Uygun saati seçip randevu talebinizi bırakın.'
            : 'İl ve ilçenizdeki klinikleri, çalışma saatlerini ve en yakın randevu saatini tek yerde görün.';
    });

    protected readonly countNote = computed(() => {
        const l = this.list();

        if (!l) return '';

        return [l.openNow ? 'yalnız şu an açık olanlar' : 'önce şu an açık olanlar', l.usesDistance ? 'konumunuza göre sıralı' : null].filter(Boolean).join(' · ');
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

    /** Açık il/ilçe seçicisini kapatır; tıklanan yer seçicinin içindeyse o seçici açık kalır. */
    protected closePicks(target: EventTarget | null): void {
        for (const pick of this.host.nativeElement.querySelectorAll<HTMLDetailsElement>('details.vf-pick[open]')) {
            if (!(target instanceof Node) || !pick.contains(target)) pick.open = false;
        }
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
