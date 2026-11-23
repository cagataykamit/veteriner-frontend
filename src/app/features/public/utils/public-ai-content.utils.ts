/**
 * Yapay zekâ yardımcısı (AI-001…004, AI-006; ADR-008, ADR-044): ana sayfa, Özellikler bölümü ve SSS aynı metinleri buradan okur.
 * Yalnız çalışan işlevler yazılır; her çıktı taslaktır, hekim onaylamadan kayda geçmez. Klinikte kapalı başlar, talep üzerine
 * Vetinity açar: "hemen kullanın" denmez. Sağlayıcı adı yazılmaz (hukuki metinlerde var). Aylık kredi paket kataloğundan
 * (`monthlyAiCredits`, backend `Ai:PlanMonthlyCredits`); burada sayı yok.
 */

export const PUBLIC_AI_SECTION = {
    /** Özellikler sayfasındaki bölüm kimliği (dizin, bağlantı). */
    id: 'yapay-zeka',
    indexTitle: 'Yapay zekâ yardımcısı',
    eyebrow: 'Yapay zekâ yardımcısı',
    title: 'Taslağı yapay zekâ hazırlar, kararı hekim verir',
    lead: 'Muayene notunu düzenlemek, hastanın geçmişini özetlemek ve hasta sahibine yazmak için yanınızda bir yardımcı. Siz istediğinizde, açık olan kayıt için çalışır.',
    homeTitle: 'Yapay zekâ yardımcısı',
    homeLead: 'Not düzenleme, geçmiş özeti ve hasta sahibine yazılacak metinlerde taslağı hazırlar; kayda geçirme kararı hekimindir.',
    homeLinkLabel: 'Yapay zekâ yardımcısını tanıyın',
    /** Telefondaki zaman çizgisinde durağın etiketi (T-03 B). */
    timelineMark: 'Hekim istediğinde',
    creditsNote: 'Aylık yapay zekâ kredisi pakete göre değişir; Paketler sayfasındaki karşılaştırmada yazar.'
} as const;

export interface PublicAiFeatureDef {
    readonly title: string;
    readonly text: string;
    readonly icon: string;
}

export const PUBLIC_AI_FEATURES: readonly PublicAiFeatureDef[] = [
    { title: 'Muayene notunu alanlara ayırır', text: 'Serbest yazdığınız notu şikâyet, bulgular, tanı ve plan alanlarına yerleştirir.', icon: 'pi pi-list-check' },
    { title: 'Hasta geçmişini özetler', text: 'Uzun geçmişi muayeneden önce birkaç satırda toplar; her satır kaynağına bağlanır.', icon: 'pi pi-history' },
    { title: 'Hasta sahibine bilgilendirme', text: 'Muayeneden sonra hasta sahibine gidecek açıklamanın taslağını hazırlar.', icon: 'pi pi-comment' },
    { title: 'Taburcu talimatı', text: 'Yatıştan çıkan hasta için evde bakım talimatının taslağını yazar.', icon: 'pi pi-home' },
    { title: 'Doğal dille kayıt arama', text: '"Son üç ayda kusma şikâyetiyle gelen kediler" gibi yazarak kayıtları bulursunuz.', icon: 'pi pi-search' }
];

/** Kurallar: taslak, hekim onayı, iz ve açılış. */
export const PUBLIC_AI_RULES: readonly string[] = [
    'Her öneri taslaktır; hekim onaylamadan kayda geçmez.',
    'Yalnız siz istediğinizde ve açık olan kayıt için çalışır.',
    'Her kullanım denetim kaydına yazılır.',
    'Kliniğinizde kapalı başlar; talep ettiğinizde Vetinity açar.'
];
