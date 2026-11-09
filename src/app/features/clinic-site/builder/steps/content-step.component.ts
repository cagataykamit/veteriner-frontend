import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { conceptByKey, type CopyKey, type SiteArticle, type SiteBranch, type SiteFaq, type SiteFeature, type SiteImage, type SiteMember, type SiteService, STOCK_GALLERY, stockArticlePhoto, stockSectionPhoto, stockServicePhoto, type StoredSiteConfig } from '@site-engine';
import { slugify, uniqueSlug } from '@/app/features/clinic-site/builder/site-checks';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { WFieldComponent, WImageComponent, WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

type Content = StoredSiteConfig['content'];

/** Elle yazılmış öneriler; yapay zekâ üretimi yok, kliniğe dair iddia içermez (K14). Hepsi değiştirilebilir. */
const SUGGESTIONS: Partial<Record<CopyKey, readonly string[]>> = {
    heroTitle: ['Kedi ve köpeğiniz için yakın bir klinik.', 'Küçük dostlarınız için düzenli bakım.', 'Muayeneden aşıya, her adımı birlikte planlıyoruz.'],
    heroText: ['Randevunuzu arayarak ya da buradan alabilirsiniz.', 'Aşı takvimi, muayene ve takip tek yerde.', 'Sorularınız için arayın, birlikte bakalım.'],
    ctaPrimary: ['Randevu al', 'Randevu talep et', 'Hemen ara'],
    aboutText: ['Küçük hayvanlara bakan bir kliniğiz. Her muayenenin sonunda ne yapıldığını ve sırada ne olduğunu anlatırız.', 'Kliniğimiz kedi, köpek ve küçük evcil hayvanlara hizmet veriyor. Tedavi öncesi seçenekleri sizinle konuşuruz.'],
    servicesIntro: ['Günlük bakımdan planlı işlemlere kadar klinikte yaptıklarımız.', 'Muayene, aşı, laboratuvar ve daha fazlası.'],
    contactText: ['Randevu ve sorularınız için arayın ya da uğrayın.', 'Gelmeden önce aramanızı öneririz; size uygun saati birlikte belirleyelim.']
};

/** Tıklanınca boş hizmet kartı açar; klinik yapmadığı hizmeti eklemez, metni kendisi yazar. */
const SERVICE_SUGGESTIONS: readonly string[] = ['Genel muayene', 'Aşı ve koruyucu bakım', 'Laboratuvar', 'Cerrahi', 'Diş bakımı', 'Görüntüleme', 'Kısırlaştırma', 'Mikroçip'];

const COPY_GROUPS: readonly { readonly title: string; readonly fields: readonly { readonly key: CopyKey; readonly label: string; readonly rows?: number }[] }[] = [
    {
        title: 'Hero ve düğmeler',
        fields: [
            { key: 'heroEyebrow', label: 'Üst satır' },
            { key: 'heroTitle', label: 'Başlık', rows: 2 },
            { key: 'heroText', label: 'Açıklama', rows: 2 },
            { key: 'ctaPrimary', label: 'Ana düğme metni' },
            { key: 'ctaSecondary', label: 'İkinci düğme metni' }
        ]
    },
    {
        title: 'Bölüm başlıkları',
        fields: [
            { key: 'aboutTitle', label: 'Tanıtım başlığı' },
            { key: 'aboutText', label: 'Tanıtım metni', rows: 4 },
            { key: 'servicesTitle', label: 'Hizmetler başlığı' },
            { key: 'servicesIntro', label: 'Hizmetler açıklaması', rows: 2 },
            { key: 'teamTitle', label: 'Hekimler başlığı' },
            { key: 'teamIntro', label: 'Hekimler açıklaması', rows: 2 },
            { key: 'featuresTitle', label: 'Öne çıkanlar başlığı' },
            { key: 'galleryTitle', label: 'Galeri başlığı' },
            { key: 'guideTitle', label: 'Rehber başlığı' },
            { key: 'contactTitle', label: 'İletişim başlığı' },
            { key: 'contactText', label: 'İletişim açıklaması', rows: 2 }
        ]
    }
];

const replaceAt = <T>(list: readonly T[], index: number, change: Partial<T>): T[] => list.map((item, i) => (i === index ? { ...item, ...change } : item));

/** 5. adım: içerik. Boş metinde konseptin önerdiği cümle kullanılır ve kutuda soluk görünür; klinik yazınca onun metni geçerlidir. */
@Component({
    selector: 'app-content-step',
    standalone: true,
    imports: [WFieldComponent, WImageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let c = content();
        @for (group of copyGroups; track group.title; let first = $first) {
            <details class="fold" [open]="first">
                <summary>{{ group.title }}<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
                <div class="fold-body">
                    @for (field of group.fields; track field.key) {
                        <div class="with-tips">
                            <app-w-field [label]="field.label" [rows]="field.rows ?? 1" [value]="c.copy[field.key]" [placeholder]="voice()[field.key]" (valueChange)="setCopy(field.key, $event)" />
                            @if (suggestions[field.key]; as tips) {
                                <div class="tips" role="group" [attr.aria-label]="field.label + ' önerileri'">
                                    @for (tip of tips; track tip) {
                                        <button type="button" class="tip" (click)="setCopy(field.key, tip)">{{ tip }}</button>
                                    }
                                </div>
                            }
                        </div>
                    }
                    @if (first) {
                        <div>
                            <p class="mini">Hero fotoğrafı</p>
                            <app-w-image label="Hero fotoğrafı yükle" [reference]="c.heroImage?.src ?? null" [stock]="sectionStock('hero')" (referenceChange)="setHero($event)" />
                        </div>
                        <div>
                            <p class="mini">Tanıtım fotoğrafı</p>
                            <app-w-image label="Tanıtım fotoğrafı yükle" [reference]="c.aboutImage?.src ?? null" [stock]="sectionStock('about')" (referenceChange)="setAbout($event)" />
                        </div>
                    }
                </div>
            </details>
        }

        <details class="fold">
            <summary>Hizmetler ({{ c.services.length }})<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                @for (service of c.services; track $index; let i = $index) {
                    <div class="item">
                        <div class="item-head">
                            <strong>{{ service.title || 'Yeni hizmet' }}</strong>
                            <button type="button" class="wbtn ghost small" (click)="removeService(i)">Sil</button>
                        </div>
                        <app-w-field label="Ad" [value]="service.title" (valueChange)="patchService(i, { title: $event })" (committed)="settleServiceSlug(i)" />
                        <app-w-field label="Kısa açıklama" [rows]="2" [value]="service.summary" (valueChange)="patchService(i, { summary: $event })" />
                        <app-w-field label="Detay sayfası metni" [rows]="4" hint="Boş satırla paragraf ayrılır." [value]="service.body" (valueChange)="patchService(i, { body: $event })" />
                        <app-w-image label="Hizmet görseli yükle" [reference]="service.image?.src ?? null" [stock]="serviceStock(service.slug, i)" (referenceChange)="patchService(i, { image: toImage($event, service.title) })" />
                    </div>
                }
                <button type="button" class="wbtn" (click)="addService()"><i class="pi pi-plus" aria-hidden="true"></i>Hizmet ekle</button>
                @if (serviceTips().length) {
                    <div class="tips" role="group" aria-label="Sık eklenen hizmetler">
                        @for (tip of serviceTips(); track tip) {
                            <button type="button" class="tip" (click)="addService(tip)">{{ tip }}</button>
                        }
                    </div>
                }
            </div>
        </details>

        <details class="fold">
            <summary>Hekimler ve ekip ({{ c.members.length }})<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                @for (member of c.members; track $index; let i = $index) {
                    <div class="item">
                        <div class="item-head">
                            <strong>{{ member.name || 'Yeni kişi' }}</strong>
                            <button type="button" class="wbtn ghost small" (click)="removeMember(i)">Sil</button>
                        </div>
                        <app-w-field label="Ad soyad" [claimCheck]="false" [value]="member.name" (valueChange)="patchMember(i, { name: $event })" (committed)="settleMemberSlug(i)" />
                        <app-w-field label="Unvan" [value]="member.title" (valueChange)="patchMember(i, { title: $event })" />
                        <app-w-field label="İlgi alanları" hint="Virgülle ayırın. Belgeniz yoksa uzmanlık yazmayın." [value]="member.specialties" (valueChange)="patchMember(i, { specialties: $event })" />
                        <app-w-field label="Kısa biyografi" [rows]="3" [value]="member.bio" (valueChange)="patchMember(i, { bio: $event })" />
                        <div class="seg">
                            <button type="button" [attr.aria-pressed]="member.kind === 'hekim'" (click)="patchMember(i, { kind: 'hekim' })">Hekim</button>
                            <button type="button" [attr.aria-pressed]="member.kind === 'ekip'" (click)="patchMember(i, { kind: 'ekip' })">Ekip</button>
                        </div>
                        <app-w-image label="Fotoğraf yükle" [reference]="member.image?.src ?? null" emptyText="Fotoğraf yoksa baş harfler çizilir." (referenceChange)="patchMember(i, { image: toImage($event, member.name) })" />
                    </div>
                }
                <button type="button" class="wbtn" (click)="addMember()"><i class="pi pi-plus" aria-hidden="true"></i>Kişi ekle</button>
            </div>
        </details>

        <details class="fold">
            <summary>Öne çıkanlar ({{ c.features.length }})<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                @for (feature of c.features; track $index; let i = $index) {
                    <div class="item">
                        <app-w-field label="Başlık" [value]="feature.title" (valueChange)="patchList('features', i, { title: $event })" />
                        <app-w-field label="Açıklama" [rows]="2" [value]="feature.text" (valueChange)="patchList('features', i, { text: $event })" />
                        <button type="button" class="wbtn ghost small rm" (click)="removeFrom('features', i)">Sil</button>
                    </div>
                }
                <button type="button" class="wbtn" (click)="addFeature()"><i class="pi pi-plus" aria-hidden="true"></i>Ekle</button>
                <div>
                    <p class="mini">Bölüm fotoğrafı</p>
                    <app-w-image label="Bölüm fotoğrafı yükle" [reference]="c.featuresImage?.src ?? null" [stock]="sectionStock('features')" (referenceChange)="setFeatures($event)" />
                </div>
            </div>
        </details>

        <details class="fold">
            <summary>Galeri ({{ c.gallery.length }})<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                <p class="warn"><i class="pi pi-info-circle" aria-hidden="true"></i><span>Tanınabilir insan olmayan fotoğraflar seçin; hayvan sahibinin iznini alın, önce/sonra görseli kullanmayın.</span></p>
                @for (photo of c.gallery; track $index; let i = $index) {
                    <div class="item">
                        <app-w-image label="Fotoğraf değiştir" [reference]="photo.src" (referenceChange)="setGalleryImage(i, $event)" />
                        <app-w-field label="Alt metin" [claimCheck]="false" hint="Fotoğrafı görmeyen ziyaretçi için kısa açıklama." [error]="photo.alt.trim() ? null : 'Alt metin ekleyin.'" [value]="photo.alt" (valueChange)="patchList('gallery', i, { alt: $event })" />
                    </div>
                } @empty {
                    <p class="hint">Hazır fotoğraflar görünüyor, değiştirebilirsiniz. İlk yüklemenizle kendi galeriniz başlar; hepsini kaldırırsanız hazır fotoğraflar döner.</p>
                    <ul class="stock-strip">
                        @for (photo of stockGallery; track photo.src) {
                            <li><img [src]="photo.src" [alt]="photo.alt" loading="lazy" /></li>
                        }
                    </ul>
                }
                <app-w-image label="Yeni fotoğraf yükle" emptyText="Yeni fotoğrafı buraya sürükleyin." (referenceChange)="addGallery($event)" />
            </div>
        </details>

        <details class="fold">
            <summary>Sağlık rehberi ({{ c.articles.length }})<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                <p class="hint">Elle yazın, ürün ve ilaç adı kullanmayın. Sitede "hekiminize danışın" notuyla görünür.</p>
                @for (article of c.articles; track $index; let i = $index) {
                    <div class="item">
                        <app-w-field label="Başlık" [value]="article.title" (valueChange)="patchList('articles', i, { title: $event })" (committed)="settleArticleSlug(i)" />
                        <app-w-field label="Kategori" [value]="article.category" (valueChange)="patchList('articles', i, { category: $event })" />
                        <app-w-field label="Özet" [rows]="2" [value]="article.summary" (valueChange)="patchList('articles', i, { summary: $event })" />
                        <app-w-field label="Metin" [rows]="5" [value]="article.body" (valueChange)="patchList('articles', i, { body: $event })" />
                        <app-w-image label="Yazı görseli yükle" [reference]="article.image?.src ?? null" [stock]="articleStock(article.slug, i)" (referenceChange)="patchList('articles', i, { image: toImage($event, article.title) })" />
                        <button type="button" class="wbtn ghost small rm" (click)="removeFrom('articles', i)">Sil</button>
                    </div>
                }
                <button type="button" class="wbtn" (click)="addArticle()"><i class="pi pi-plus" aria-hidden="true"></i>Yazı ekle</button>
            </div>
        </details>

        <details class="fold">
            <summary>SSS, acil ve şubeler<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                @for (faq of c.faqs; track $index; let i = $index) {
                    <div class="item">
                        <app-w-field label="Soru" [value]="faq.question" (valueChange)="patchList('faqs', i, { question: $event })" />
                        <app-w-field label="Yanıt" [rows]="2" [value]="faq.answer" (valueChange)="patchList('faqs', i, { answer: $event })" />
                        <button type="button" class="wbtn ghost small rm" (click)="removeFrom('faqs', i)">Sil</button>
                    </div>
                }
                <button type="button" class="wbtn" (click)="addFaq()"><i class="pi pi-plus" aria-hidden="true"></i>Soru ekle</button>
                <app-w-field label="Acil durum metni" [rows]="4" [value]="c.emergencyText" (valueChange)="setEmergency($event)" />
                @for (branch of c.branches; track $index; let i = $index) {
                    <div class="item">
                        <app-w-field label="Şube adı" [claimCheck]="false" [value]="branch.name" (valueChange)="patchList('branches', i, { name: $event })" />
                        <app-w-field label="Adres" [claimCheck]="false" [value]="branch.address" (valueChange)="patchList('branches', i, { address: $event })" />
                        <app-w-field label="Telefon" [claimCheck]="false" [value]="branch.phone" (valueChange)="patchList('branches', i, { phone: $event })" />
                        <button type="button" class="wbtn ghost small rm" (click)="removeFrom('branches', i)">Sil</button>
                    </div>
                }
                <button type="button" class="wbtn" (click)="addBranch()"><i class="pi pi-plus" aria-hidden="true"></i>Şube ekle</button>
            </div>
        </details>

        <details class="fold">
            <summary>Yüklenen görseller ({{ store.images().length }}/100)<i class="pi pi-angle-down" aria-hidden="true"></i></summary>
            <div class="fold-body">
                <p class="hint">Bir alandan "Kaldır" görseli yalnız o alandan çıkarır. Dosyayı buradan silersiniz; taslakta ya da yayında kullanılan görsel silinmez.</p>
                @if (store.actionError(); as message) {
                    <p class="bad-note" role="alert"><i class="pi pi-times-circle" aria-hidden="true"></i><span>{{ message }}</span></p>
                }
                <ul class="library">
                    @for (image of store.images(); track image.id) {
                        <li>
                            @if (store.imageSrc(image.reference); as src) {
                                <img [src]="src" alt="" />
                            } @else {
                                <span class="no-thumb"><i class="pi pi-image" aria-hidden="true"></i></span>
                            }
                            <span class="size">{{ sizeLabel(image.sizeBytes) }}</span>
                            <button type="button" class="wbtn ghost small" [disabled]="store.actionBusy()" (click)="store.deleteImage(image.id)">Sil</button>
                        </li>
                    } @empty {
                        <li class="hint">Henüz görsel yüklenmedi.</li>
                    }
                </ul>
            </div>
        </details>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            :host {
                display: grid;
                gap: 8px;
            }

            .with-tips {
                display: grid;
                gap: 8px;
            }

            .tips {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .tip {
                min-height: 36px;
                padding: 6px 10px;
                border: 1px solid var(--w-line);
                border-radius: 8px;
                background: var(--w-soft);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 12px;
                line-height: 1.3;
                text-align: left;
                cursor: pointer;
            }

            .tip:hover {
                border-color: var(--w-line-strong);
            }

            .mini {
                margin-bottom: 6px;
                font-size: 13px;
                font-weight: 600;
            }

            .item {
                display: grid;
                gap: 10px;
                padding: 12px;
                border-radius: 10px;
                background: var(--w-soft);
            }

            .item-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                font-size: 14px;
            }

            .rm {
                justify-self: start;
            }

            .stock-strip {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
                gap: 6px;
            }

            .stock-strip img {
                display: block;
                width: 100%;
                aspect-ratio: 1;
                border-radius: 8px;
                object-fit: cover;
            }

            .library {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
                gap: 8px;
            }

            .library li {
                display: grid;
                gap: 4px;
                justify-items: start;
                font-size: 12px;
            }

            .library img,
            .no-thumb {
                display: grid;
                place-items: center;
                width: 100%;
                aspect-ratio: 4 / 3;
                border-radius: 8px;
                background: var(--w-soft);
                color: var(--w-muted);
                object-fit: cover;
            }

            .size {
                color: var(--w-muted);
            }
        `
    ]
})
export class ContentStepComponent {
    protected readonly store = inject(SiteBuilderStore);

    protected readonly copyGroups = COPY_GROUPS;
    protected readonly suggestions = SUGGESTIONS;
    protected readonly stockGallery = STOCK_GALLERY;
    protected readonly serviceStock = stockServicePhoto;
    protected readonly articleStock = stockArticlePhoto;
    protected readonly content = computed(() => this.store.stored().content);
    protected readonly voice = computed(() => conceptByKey(this.store.stored().design.conceptKey).voice);
    protected readonly serviceTips = computed(() => SERVICE_SUGGESTIONS.filter((tip) => !this.content().services.some((service) => service.title.trim() === tip)));

    private patch(change: Partial<Content>, key?: string): void {
        this.store.patchContent((content) => ({ ...content, ...change }), key);
    }

    protected sizeLabel(bytes: number): string {
        return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
    }

    protected setCopy(key: CopyKey, value: string): void {
        this.patch({ copy: { ...this.content().copy, [key]: value } }, `copy.${key}`);
    }

    protected toImage(reference: string | null, alt: string): SiteImage | null {
        return reference ? { src: reference, alt: alt.trim() || 'Klinikten fotoğraf' } : null;
    }

    protected setHero(reference: string | null): void {
        this.patch({ heroImage: this.toImage(reference, this.store.record().name) });
    }

    protected setAbout(reference: string | null): void {
        this.patch({ aboutImage: this.toImage(reference, this.store.record().name) });
    }

    protected setFeatures(reference: string | null): void {
        this.patch({ featuresImage: this.toImage(reference, this.store.record().name) });
    }

    /** Seçili bölüm alternatifinin hazır karesi; sitede çizilenle aynı. */
    protected sectionStock(type: 'hero' | 'about' | 'features'): SiteImage | null {
        return stockSectionPhoto(this.store.stored().design.sections[type], type);
    }

    protected patchService(index: number, change: Partial<SiteService>): void {
        this.patch({ services: replaceAt(this.content().services, index, change) }, `service.${index}`);
    }

    protected addService(title = ''): void {
        const slug = uniqueSlug(slugify(title) || 'yeni-hizmet', this.content().services.map((service) => service.slug));

        this.patch({ services: [...this.content().services, { slug, title, summary: '', body: '', image: null }] });
    }

    protected removeService(index: number): void {
        this.patch({ services: this.content().services.filter((_, i) => i !== index) });
    }

    protected patchMember(index: number, change: Partial<SiteMember>): void {
        this.patch({ members: replaceAt(this.content().members, index, change) }, `member.${index}`);
    }

    protected addMember(): void {
        const slug = uniqueSlug('yeni-kisi', this.content().members.map((member) => member.slug));

        this.patch({ members: [...this.content().members, { slug, kind: 'hekim', name: '', title: 'Veteriner hekim', specialties: '', bio: '', image: null }] });
    }

    protected removeMember(index: number): void {
        this.patch({ members: this.content().members.filter((_, i) => i !== index) });
    }

    /** Geçici adres ilk başlık yazılınca bir kez gerçek adrese döner; sonra değişmez, paylaşılmış bağlantı bozulmaz. */
    protected settleServiceSlug(index: number): void {
        const list = this.content().services;
        const slug = settledSlug(list[index].slug, list[index].title, 'yeni-hizmet', list.map((item) => item.slug));

        if (slug) this.patchService(index, { slug });
    }

    protected settleMemberSlug(index: number): void {
        const list = this.content().members;
        const slug = settledSlug(list[index].slug, list[index].name, 'yeni-kisi', list.map((item) => item.slug));

        if (slug) this.patchMember(index, { slug });
    }

    protected settleArticleSlug(index: number): void {
        const list = this.content().articles;
        const slug = settledSlug(list[index].slug, list[index].title, 'yeni-yazi', list.map((item) => item.slug));

        if (slug) this.patchList('articles', index, { slug });
    }

    protected patchList<K extends 'features' | 'gallery' | 'articles' | 'faqs' | 'branches'>(key: K, index: number, change: Partial<Content[K][number]>): void {
        const list = this.content()[key] as readonly Content[K][number][];

        this.patch({ [key]: replaceAt(list, index, change) } as Partial<Content>, `${key}.${index}`);
    }

    protected removeFrom(key: 'features' | 'gallery' | 'articles' | 'faqs' | 'branches', index: number): void {
        const list = this.content()[key] as readonly unknown[];

        this.patch({ [key]: list.filter((_, i) => i !== index) } as Partial<Content>);
    }

    protected addFeature(): void {
        const item: SiteFeature = { title: '', text: '' };

        this.patch({ features: [...this.content().features, item] });
    }

    protected addArticle(): void {
        const slug = uniqueSlug('yeni-yazi', this.content().articles.map((article) => article.slug));
        const item: SiteArticle = { slug, category: '', title: '', summary: '', body: '', minutes: 3, image: null };

        this.patch({ articles: [...this.content().articles, item] });
    }

    protected addFaq(): void {
        const item: SiteFaq = { question: '', answer: '' };

        this.patch({ faqs: [...this.content().faqs, item] });
    }

    protected addBranch(): void {
        const item: SiteBranch = { name: '', address: '', phone: '' };

        this.patch({ branches: [...this.content().branches, item] });
    }

    protected setEmergency(value: string): void {
        this.patch({ emergencyText: value }, 'emergency');
    }

    protected setGalleryImage(index: number, reference: string | null): void {
        if (reference) this.patchList('gallery', index, { src: reference });
        else this.removeFrom('gallery', index);
    }

    protected addGallery(reference: string | null): void {
        if (reference) this.patch({ gallery: [...this.content().gallery, { src: reference, alt: '' }] });
    }
}

function settledSlug(current: string, title: string, placeholder: string, taken: readonly string[]): string | null {
    const base = slugify(title);

    if (!base || !current.startsWith(placeholder)) return null;

    return uniqueSlug(base, taken.filter((slug) => slug !== current));
}
