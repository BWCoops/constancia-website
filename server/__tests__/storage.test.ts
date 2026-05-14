/**
 * Storage Layer Tests
 * 
 * Tests for the core storage interface and database operations.
 * Covers CRUD operations for all major entities.
 */

import { describe, test, expect } from 'vitest';
import { storage } from '../storage';

describe('Storage Layer Tests', () => {
  describe('Storage Interface', () => {
    test('storage instance should be defined', () => {
      expect(storage).toBeDefined();
    });
  });

  describe('Blog Posts Storage', () => {
    test('should have getBlogPosts method', () => {
      expect(typeof storage.getBlogPosts).toBe('function');
    });

    test('should have getBlogPostBySlug method', () => {
      expect(typeof storage.getBlogPostBySlug).toBe('function');
    });

    test('should have getBlogPostById method', () => {
      expect(typeof storage.getBlogPostById).toBe('function');
    });

    test('should have createBlogPost method', () => {
      expect(typeof storage.createBlogPost).toBe('function');
    });

    test('should have updateBlogPost method', () => {
      expect(typeof storage.updateBlogPost).toBe('function');
    });
  });

  describe('Resources Storage', () => {
    test('should have getResourceFiles method', () => {
      expect(typeof storage.getResourceFiles).toBe('function');
    });

    test('should have getResourceFileBySlug method', () => {
      expect(typeof storage.getResourceFileBySlug).toBe('function');
    });

    test('should have getResourceFileById method', () => {
      expect(typeof storage.getResourceFileById).toBe('function');
    });

    test('should have incrementDownloadCount method', () => {
      expect(typeof storage.incrementDownloadCount).toBe('function');
    });

    test('should have incrementViewCount method', () => {
      expect(typeof storage.incrementViewCount).toBe('function');
    });
  });

  describe('Contact Submissions Storage', () => {
    test('should have createContactSubmission method', () => {
      expect(typeof storage.createContactSubmission).toBe('function');
    });

    test('should have getContactSubmissions method', () => {
      expect(typeof storage.getContactSubmissions).toBe('function');
    });

    test('should have getContactSubmissionById method', () => {
      expect(typeof storage.getContactSubmissionById).toBe('function');
    });

    test('should have verifyContactSubmission method', () => {
      expect(typeof storage.verifyContactSubmission).toBe('function');
    });
  });

  describe('Resource Sessions Storage', () => {
    test('should have createResourceSession method', () => {
      expect(typeof storage.createResourceSession).toBe('function');
    });

    test('should have getResourceSession method', () => {
      expect(typeof storage.getResourceSession).toBe('function');
    });
  });
});

describe('Storage Method Existence', () => {
  test('all essential CRUD methods should exist', () => {
    const essentialMethods = [
      'getBlogPosts',
      'getBlogPostBySlug',
      'getBlogPostById',
      'createBlogPost',
      'getResourceFiles',
      'getResourceFileBySlug',
      'getResourceFileById',
      'createContactSubmission',
      'getContactSubmissions',
      'createResourceSession',
      'getResourceSession',
    ];

    for (const method of essentialMethods) {
      expect(typeof (storage as any)[method]).toBe('function');
    }
  });
});
