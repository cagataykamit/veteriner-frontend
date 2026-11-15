import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { injectReturnTarget, resolveReturnTarget, type ReturnTarget } from './return-target.utils';

describe('resolveReturnTarget', () => {
    const current = '/panel/pets/new?clientId=c1';

    it('önce güvenli returnUrl', () => {
        const query = convertToParamMap({ returnUrl: '/panel/appointments?view=week', clientId: 'c1' });

        expect(resolveReturnTarget(query, '/panel/today', current, '/panel/pets')).toEqual({ url: '/panel/appointments?view=week', source: 'returnUrl' });
    });

    it('panel dışı returnUrl yok sayılır, gelinen sayfaya dönülür', () => {
        const query = convertToParamMap({ returnUrl: 'https://kotu.example/x' });

        expect(resolveReturnTarget(query, '/panel/clients/c1', current, '/panel/pets')).toEqual({ url: '/panel/clients/c1', source: 'previous' });
    });

    it('gelinen sayfa aynı sayfaysa ya da panel dışıysa bağlamdaki karta dönülür; en özel bağlam önce', () => {
        const query = convertToParamMap({ clientId: 'c1', petId: 'p1', examinationId: 'e1' });

        expect(resolveReturnTarget(query, '/panel/pets/new', current, '/panel/pets').url).toBe('/panel/examinations/e1');
        expect(resolveReturnTarget(query, '/auth/login', current, '/panel/pets').url).toBe('/panel/examinations/e1');
        expect(resolveReturnTarget(convertToParamMap({ clientId: 'c1' }), null, current, '/panel/pets')).toEqual({ url: '/panel/clients/c1', source: 'context' });
    });

    it('hiçbiri yoksa liste', () => {
        expect(resolveReturnTarget(convertToParamMap({}), null, '/panel/pets/new', '/panel/pets')).toEqual({ url: '/panel/pets', source: 'list' });
    });
});

@Component({ template: '' })
class BlankComponent {}

@Component({ template: '' })
class NewPageComponent {
    readonly target: ReturnTarget = injectReturnTarget('/panel/pets');
}

describe('injectReturnTarget', () => {
    it('gezinme sırasında bir önceki panel sayfasını yakalar', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'panel/clients/:id', component: BlankComponent },
                    { path: 'panel/pets/new', component: NewPageComponent }
                ])
            ]
        });
        const harness = await RouterTestingHarness.create('/panel/clients/c1?tab=pets');
        const page = await harness.navigateByUrl('/panel/pets/new?clientId=c1', NewPageComponent);

        expect(page.target).toEqual({ url: '/panel/clients/c1?tab=pets', source: 'previous' });
    });

    it('doğrudan açılışta bağlamdaki karta döner', async () => {
        TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'panel/pets/new', component: NewPageComponent }])] });
        const harness = await RouterTestingHarness.create();
        const page = await harness.navigateByUrl('/panel/pets/new?clientId=c1', NewPageComponent);

        expect(page.target).toEqual({ url: '/panel/clients/c1', source: 'context' });
    });
});
