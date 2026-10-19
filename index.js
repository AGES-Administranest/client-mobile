/**
 * @format
 */

// Primeiro import do bundle: inicializa o dev client (dev menu e
// launcher). Inerte em build de release.
import 'expo-dev-client';
import { registerRootComponent } from 'expo';

import { App } from './src/app/App';

registerRootComponent(App);
