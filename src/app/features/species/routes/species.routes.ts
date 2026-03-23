import { Routes } from '@angular/router';
import { SpeciesFormPageComponent } from '@/app/features/species/pages/species-form-page/species-form-page.component';
import { SpeciesListPageComponent } from '@/app/features/species/pages/species-list-page/species-list-page.component';

export default [
    { path: '', component: SpeciesListPageComponent },
    { path: 'new', component: SpeciesFormPageComponent },
    { path: ':id/edit', component: SpeciesFormPageComponent }
] as Routes;
