import { functionsRouter } from './registry.js';

// Side-effect imports: each module below calls registerFunction() on load,
// mutating the shared `functionsRouter` from registry.ts.
import './_registerAll.js';

export default functionsRouter;
