/**
 * Site çizim motorunun dışa açık yüzü (`@site-engine`, ADR-045 K3 ve K12). Panel önizlemesi ve ayrı site uygulaması aynı bileşenleri
 * buradan alır. Motor yalnız `SiteConfig` alıp çizer: panele, sihirbaza ve panel oturumuna bağımlı değildir (`eslint.config.js`).
 */
export * from './model/site.model';
export { SiteRendererComponent } from './engine/site-renderer.component';
export { findAlternative, SECTION_REGISTRY, sectionAlternatives, type SectionAlternative } from './engine/section-registry';
export { conceptByKey, designFromConcept, SITE_CONCEPTS, type SiteConcept } from './engine/site-concepts';
export { SITE_FONTS, fontByKey, type SiteFont } from './engine/site-fonts';
export { buildSiteTokens, colorWarnings, GROUNDS, groundOf, RADIUS_OPTIONS, type ContrastWarning } from './engine/site-tokens';
export { contrast, ensureContrast, hexToHsl, hexToRgb, hslToHex, isHex, luminance, mix, readableOn, rgbToHex, rgbToHsl, type Hsl, type Rgb } from './engine/site-color.utils';
export { isStockPhoto, STOCK_GALLERY, STOCK_PHOTOS, stockArticlePhoto, stockSectionPhoto, stockServicePhoto, stockSharePhoto, type StockSlot } from './engine/stock-photos';
export { safeHref, safeImageSrc } from './engine/site-links';
export * from './engine/site-stored-config';
export { sitePagePaths, sitePageHead, siteJsonLd, siteRobotsTxt, siteRootUrl, siteSitemapXml, seoDescription, seoTitle, type SitePageHead } from './engine/site-seo';
