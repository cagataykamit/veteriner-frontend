import workspace from '../../../../angular.json';

describe('site derleme ayarı', () => {
    // SSR kritik CSS'i yazı tipi adresini `deployUrl`'den çözer; `baseHref`'ten farklıysa `/media/...` yazılır, ilk istek 404 alır.
    it('deployUrl baseHref ile aynı: kritik CSS yazı tipleri /k/media altından', () => {
        const options = workspace.projects.site.architect.build.options;

        expect(options.baseHref).toBe('/k/');
        expect(options.deployUrl).toBe(options.baseHref);
    });
});
