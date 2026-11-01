import { execSync } from 'child_process';
execSync('git checkout src/apps/web/ui/library/GridView.tsx');
console.log('Reverted');
