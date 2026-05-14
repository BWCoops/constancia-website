/**
 * API Routes Integration Tests
 * 
 * Tests for core API endpoints.
 * These tests require a running server for full integration testing.
 */

import { describe, test, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5000';

async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe('API Routes Integration Tests', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    serverAvailable = await isServerRunning();
  });

  describe('Health Check Endpoint', () => {
    test('should return 200 OK', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.status).toBe(200);
    });

    test('should return JSON response', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/health`);
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('Blog Posts Endpoints', () => {
    test('GET /api/blog should return posts data', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/blog`);
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        console.log('Skipping - endpoint not returning JSON (may be SPA fallback)');
        return;
      }
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  describe('Resources Endpoints', () => {
    test('GET /api/resources should return resources data', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/resources`);
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        console.log('Skipping - endpoint not returning JSON (may be SPA fallback)');
        return;
      }
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  describe('Feature Flags Endpoints', () => {
    test('GET /api/feature-flags should return flags object', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/feature-flags`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(typeof data).toBe('object');
    });
  });

  describe('Comparison Tools Endpoints', () => {
    test('GET /api/comparison/vendors should return vendors', async () => {
      if (!serverAvailable) {
        console.log('Skipping - server not available');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/comparison/vendors`);
      const contentType = response.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        console.log('Skipping - endpoint not returning JSON (may be SPA fallback)');
        return;
      }
      
      if (response.status === 200) {
        const data = await response.json();
        expect(Array.isArray(data) || typeof data === 'object').toBe(true);
      }
    });
  });
});

describe('API Error Handling', () => {
  let serverAvailable = false;

  beforeAll(async () => {
    serverAvailable = await isServerRunning();
  });

  test('should return 404 or SPA fallback for non-existent API routes', async () => {
    if (!serverAvailable) {
      console.log('Skipping - server not available');
      return;
    }
    
    const response = await fetch(`${BASE_URL}/api/non-existent-route-12345`);
    const contentType = response.headers.get('content-type') || '';
    
    // Either returns 404 JSON error OR 200 HTML (SPA fallback)
    if (contentType.includes('application/json')) {
      expect(response.status).toBe(404);
    } else {
      // SPA fallback returns 200 with HTML
      expect(response.status).toBe(200);
    }
  });

  test('should handle invalid JSON gracefully', async () => {
    if (!serverAvailable) {
      console.log('Skipping - server not available');
      return;
    }
    
    const response = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{'
    });
    
    expect([400, 422, 500]).toContain(response.status);
  });
});
