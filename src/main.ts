import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { registerPanelProblemMessages } from './problem-messages';

registerPanelProblemMessages();
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
