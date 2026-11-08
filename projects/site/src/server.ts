import { join } from 'node:path';
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { type NextFunction, type Request, type Response } from 'express';
import { siteRobotsTxt, siteSitemapXml } from '@site-engine';
import { publishedSiteConfig, type SiteRequestState } from './app/site-state';
import { loadPublicSite, readSiteServerConfig, redirectLocation, withNextSlots } from './server/site-loader';
import { parseVetFinderUrl, VET_FINDER_LIST_PATH, VET_FINDER_ROOT, VET_FINDER_SLOTS_PATH, type VetFinderRequestState } from './app/vet-finder/vet-finder-state';
import { loadVetFinderListByBody, loadVetFinderPage, loadVetFinderSlots, vetFinderRobotsLines, vetFinderSitemapXml } from './server/vet-finder-loader';

/**
 * Klinik sitelerinin ve Veteriner bul sayfalarının Node sunucusu (ADR-045 K12, ADR-047). Her istekte yayınlanmış yapılandırmayı API'den
 * alır, Angular ile çizer. Eski adresi burada 301'ler; durum kodlarını ve baş etiketlerini Angular tarafı yazar. Panel kodu ve oturumu
 * yoktur, kimliksizdir.
 */
const config = readSiteServerConfig(process.env);
const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine({ allowedHosts: [...config.allowedHosts] });

app.disable('x-powered-by');
// Güvenilen vekil sayısı kadar sağdan okunur; varsayılan 0: ziyaretçinin yazdığı başlık yok sayılır.
app.set('trust proxy', config.trustedProxyHops > 0 ? config.trustedProxyHops : false);
// `ng serve` taban yolu (`/k`) kırpıp iletir; yollar dağıtımdaki gibi tam adrese göre eşleşsin.
app.use((req, _res, next) => {
    req.url = req.originalUrl;
    next();
});

async function render(req: Request, res: Response, next: NextFunction, state: SiteRequestState | VetFinderRequestState): Promise<void> {
    try {
        const rendered = await angularApp.handle(req, state);

        if (!rendered) {
            next();

            return;
        }

        // Kapanan site gecikmesiz görünsün (K13): yanıt saklanmaz, her istekte durum yeniden okunur.
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        await writeResponseToNodeResponse(rendered, res);
    } catch (error) {
        next(error);
    }
}

app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(siteRobotsTxt() + vetFinderRobotsLines(config.origin));
});

// -- Veteriner bul (ADR-047): tarayıcının ek istekleri bu sunucuya gelir, API'ye sunucu gider. Konum gövdeyle gelir, sorguya yazılmaz.
app.get(`${VET_FINDER_ROOT}/sitemap.xml`, async (req, res) => {
    const loaded = await loadVetFinderPage(null, req.ip, config);

    if (loaded.regions) res.type('application/xml').send(vetFinderSitemapXml(loaded.regions, config.origin));
    else res.status(503).type('text/plain').send('Site haritası şu anda yok.');
});

app.get(VET_FINDER_SLOTS_PATH, async (req, res) => {
    const result = await loadVetFinderSlots(req.query['keys'], req.ip, config);

    res.setHeader('Cache-Control', 'no-store');
    if (result.ok) res.json(result.body);
    else res.status(result.status === 429 ? 429 : 503).json({ items: [] });
});

app.post(VET_FINDER_LIST_PATH, express.json({ limit: '2kb' }), async (req, res) => {
    const result = await loadVetFinderListByBody(req.body, req.ip, config);

    res.setHeader('Cache-Control', 'no-store');
    if (result.ok) res.json(result.body);
    else res.status(result.status === 404 ? 404 : result.status === 429 ? 429 : 503).json(null);
});

// Uygulama `/k/` tabanında yaşar: istek Angular'a `/k/veteriner/...` olarak verilir (`veteriner` klinik adresi olarak ayrılmış sözcüktür,
// çakışmaz). Tarayıcıda yönlendirici bu sayfalarda çalışmaz (`main.ts`), adres çubuğu `/veteriner/...` kalır.
app.get(`${VET_FINDER_ROOT}{/*rest}`, async (req, res, next) => {
    const state = await loadVetFinderPage(parseVetFinderUrl(req.originalUrl), req.ip, config);

    req.originalUrl = `/k${req.originalUrl}`;
    await render(req, res, next, state);
});

app.get('/k/:slug/sitemap.xml', async (req, res) => {
    const loaded = await loadPublicSite(req.params.slug, req.ip, config);

    if (loaded.kind === 'redirect') {
        res.redirect(301, redirectLocation(req.originalUrl, loaded.slug));
    } else if (loaded.kind === 'published') {
        res.type('application/xml').send(siteSitemapXml(publishedSiteConfig(loaded), config.origin, loaded.publishedAtUtc));
    } else {
        res.status(loaded.kind === 'unavailable' ? 503 : 404).type('text/plain').send('Site haritası yok.');
    }
});

app.use('/k', express.static(browserDistFolder, { maxAge: '1y', immutable: true, index: false, redirect: false }));

app.get('/k/:slug{/*rest}', async (req, res, next) => {
    const loaded = await loadPublicSite(req.params.slug, req.ip, config);

    if (loaded.kind === 'redirect') {
        res.redirect(301, redirectLocation(req.originalUrl, loaded.slug));

        return;
    }

    await render(req, res, next, loaded.kind === 'published' ? await withNextSlots(loaded, req.ip, config) : loaded);
});

app.use((req, res, next) => void render(req, res, next, { kind: 'notfound' }));

if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4400;

    app.listen(port, (error) => {
        if (error) throw error;

        console.log(`Site sunucusu http://localhost:${port} üzerinde.`);
    });
}

/** `ng serve` ve dağıtım sarmalayıcıları bu işleyiciyi kullanır. */
export const reqHandler = createNodeRequestHandler(app);
