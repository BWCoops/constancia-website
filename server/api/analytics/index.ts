/**
 * Analytics API Module
 * 
 * Registers analytics/tracking routes for page views and ad clicks.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Express } from 'express';
import { trackPageView, trackAdClick } from './handlers';

export function registerAnalyticsRoutes(app: Express): void {
  app.post('/api/track/page-view', trackPageView);
  app.post('/api/track/ad-click', trackAdClick);
}

export * from './handlers';
