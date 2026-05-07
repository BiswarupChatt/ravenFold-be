import { register } from 'node:module';

register('./src/loaders/alias-loader.js', import.meta.url);

await import('./src/server.js');
