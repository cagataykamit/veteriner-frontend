import { Routes } from '@angular/router';
import { BreedFormPageComponent } from '@/app/features/breeds/pages/breed-form-page/breed-form-page.component';
import { BreedsListPageComponent } from '@/app/features/breeds/pages/breeds-list-page/breeds-list-page.component';

export default [
    { path: '', component: BreedsListPageComponent },
    { path: 'new', component: BreedFormPageComponent },
    { path: ':id/edit', component: BreedFormPageComponent }
] as Routes;
