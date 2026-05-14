/**
 * OpenAPI Module
 * 
 * Exports OpenAPI specification and route handlers for API documentation.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Express, Request, Response } from 'express';
import { openAPISpec } from './spec';

export { openAPISpec } from './spec';

/**
 * Handler to serve OpenAPI spec as JSON
 */
function getOpenAPISpec(_req: Request, res: Response) {
  res.json(openAPISpec);
}

/**
 * Register OpenAPI documentation routes
 */
export function registerOpenAPIRoutes(app: Express): void {
  app.get('/api/openapi.json', getOpenAPISpec);
}
