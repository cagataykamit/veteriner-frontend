import { join } from 'node:path';
import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { type NextFunction, type Request, type Response } from 'express';
import { siteRobotsTxt, siteSitemapXml } from '@site-engine';
import { publishedSiteConfig, type SiteRequestState } from './app/site-state';
import { loadPublicSite, readSiteServerConfig, redirectLocation } from './server/site-loader';

/**
 * Klinik sitelerinin Node sunucusu (ADR-045 K12). Her istekte yayınlanmış yapılandırmayı API'den alır, Angular ile çizer. Eski adresi
 * burada 301'ler; durum kodlarını ve baş etiketlerini Angular tarafı yazar. Panel kodu ve oturumu yoktur, kimliksizdir.
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

async function render(req: Request, res: Response, next: NextFunction, state: SiteRequestState): Promise<void> {
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
    res.type('text/plain').send(siteRobotsTxt());
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

    await render(req, res, next, loaded);
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
