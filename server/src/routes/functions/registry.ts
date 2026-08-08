import { Router, type Request, type Response } from 'express';
import { createBase44Compat } from '../../base44Compat.js';

export type FunctionHandler = (req: Request, res: Response, base44: ReturnType<typeof createBase44Compat>) => Promise<void> | void;

export const functionsRouter = Router();

/**
 * Every ported Base44 function (originally `base44/functions/<name>/entry.ts`,
 * a `Deno.serve` handler) is registered here under its original name so the
 * frontend's `base44.functions.invoke('<name>', payload)` calls keep working
 * unchanged — same endpoint name, same POST-body-in/JSON-out contract.
 *
 * Lives in its own module (not routes/functions/index.ts) so per-function
 * files can import just the registry without creating an import cycle back
 * through the aggregator that loads them.
 */
export function registerFunction(name: string, handler: FunctionHandler) {
  functionsRouter.post(`/${name}`, async (req, res) => {
    const base44 = createBase44Compat(req.currentUser ?? null, true);
    try {
      await handler(req, res, base44);
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(error.status || 500).json({ error: error.message || 'Internal error' });
      }
    }
  });
}
