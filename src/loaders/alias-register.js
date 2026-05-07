import { register } from 'node:module';

register('./alias-loader.js', import.meta.url);
