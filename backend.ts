/**
 * Root entry point for the Odd One Out Express + TypeScript Highscore Backend.
 *
 * Run directly from project root:
 *   npm run backend
 *   (or: cd backend && npm run dev)
 */
import { app, startServer } from './backend/src/index';

export { app, startServer };

if (require.main === module) {
  startServer();
}
