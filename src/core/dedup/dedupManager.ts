import { dedupEngine } from './dedupEngine';
import { backgroundScanner } from './backgroundScanner';

export { dedupEngine, backgroundScanner };

// Start background scanner by default
backgroundScanner.start();
