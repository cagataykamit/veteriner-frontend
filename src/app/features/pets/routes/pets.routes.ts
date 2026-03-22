import { Routes } from '@angular/router';
import { PetDetailPageComponent } from '@/app/features/pets/pages/pet-detail-page/pet-detail-page.component';
import { PetsListPageComponent } from '@/app/features/pets/pages/pets-list-page/pets-list-page.component';

export default [
    { path: '', component: PetsListPageComponent },
    { path: ':id', component: PetDetailPageComponent }
] as Routes;
