import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';
import { ResetPasswordPageComponent } from './reset-password-page.component';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login },
    { path: 'forgot-password', component: ForgotPasswordPageComponent },
    { path: 'reset-password', component: ResetPasswordPageComponent }
] as Routes;
