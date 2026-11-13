import { writeFileSync } from 'node:fs';
import { renderSeedSql } from '../src/data/render-seed';

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), renderSeedSql(), 'utf8');
