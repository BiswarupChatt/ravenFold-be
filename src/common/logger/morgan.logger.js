import morgan from 'morgan';
import { nodeEnv } from '@/config/env.config.js';

export default morgan(nodeEnv === 'production' ? 'combined' : 'dev');
