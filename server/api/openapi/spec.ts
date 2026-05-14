/**
 * OpenAPI Specification
 * 
 * Centralized API documentation for the 1QG platform.
 * This file exports the OpenAPI specification object that can be:
 * - Served as JSON endpoint
 * - Used to generate Swagger UI
 * - Used for validation and type generation
 * 
 * @generated-by-ai (human-reviewed)
 */

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  patch?: Operation;
  delete?: Operation;
  put?: Operation;
}

interface Operation {
  summary: string;
  description?: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
}

interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required?: boolean;
  schema: Schema;
  description?: string;
}

interface RequestBody {
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

interface Response {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

interface Schema {
  type?: string;
  format?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  $ref?: string;
  enum?: string[];
  description?: string;
  nullable?: boolean;
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
}

/**
 * OpenAPI specification for the 1QG API
 */
export const openAPISpec: OpenAPISpec = {
  openapi: '3.0.3',
  info: {
    title: '1QG Platform API',
    version: '1.0.0',
    description: 'API for the 1QG AI-powered business solutions platform',
  },
  servers: [
    {
      url: '/api',
      description: 'API server',
    },
  ],
  paths: {
    // Feature Flags
    '/feature-flags': {
      get: {
        summary: 'Get feature flags',
        description: 'Returns the effective feature flag values for the client',
        tags: ['Feature Flags'],
        responses: {
          '200': {
            description: 'Feature flag values',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FeatureFlags',
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/admin/feature-flags': {
      get: {
        summary: 'Get all feature flags with override status',
        description: 'Admin endpoint to get detailed feature flag information',
        tags: ['Feature Flags', 'Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Detailed feature flag information',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminFeatureFlagsResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/admin/feature-flags/{featureKey}': {
      patch: {
        summary: 'Update feature flag override',
        description: 'Set or update a feature flag override',
        tags: ['Feature Flags', 'Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'featureKey',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The feature flag key',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/FeatureFlagOverrideRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Override updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/FeatureFlagOverrideResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Remove feature flag override',
        description: 'Revert a feature flag to its environment default',
        tags: ['Feature Flags', 'Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'featureKey',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Override removed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeleteOverrideResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid feature key',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    
    // Analytics/Tracking
    '/track/page-view': {
      post: {
        summary: 'Track page view',
        description: 'Record a page view event for analytics',
        tags: ['Analytics'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PageViewRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Page view tracked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PageViewResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid page view data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/track/ad-click': {
      post: {
        summary: 'Track ad click',
        description: 'Record an ad click event for analytics with fraud detection',
        tags: ['Analytics'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AdClickRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ad click tracked successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdClickResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid ad click data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    
    // Blog Posts
    '/blog/posts': {
      get: {
        summary: 'List blog posts',
        description: 'Get a list of blog posts with optional filtering',
        tags: ['Content', 'Blog'],
        parameters: [
          {
            name: 'categoryId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by category ID',
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['draft', 'published', 'archived'] },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer' },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'List of blog posts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BlogPost' },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/blog/posts/{slug}': {
      get: {
        summary: 'Get blog post by slug',
        description: 'Get a single blog post by its URL slug',
        tags: ['Content', 'Blog'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Blog post details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BlogPost' },
              },
            },
          },
          '400': {
            description: 'Invalid slug parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '404': {
            description: 'Blog post not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/blog/categories': {
      get: {
        summary: 'List blog categories',
        description: 'Get all blog categories',
        tags: ['Content', 'Blog'],
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BlogCategory' },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/blog/categories/{slug}': {
      get: {
        summary: 'Get blog category by slug',
        description: 'Get a single blog category by its URL slug',
        tags: ['Content', 'Blog'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Category details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BlogCategory' },
              },
            },
          },
          '400': {
            description: 'Invalid slug parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/blog/featured': {
      get: {
        summary: 'Get featured blog posts',
        description: 'Get featured/highlighted blog posts',
        tags: ['Content', 'Blog'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Maximum number of posts to return (default: 5)',
          },
        ],
        responses: {
          '200': {
            description: 'List of featured posts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BlogPost' },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/blog/search': {
      get: {
        summary: 'Search blog posts',
        description: 'Search blog posts by keyword',
        tags: ['Content', 'Blog'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search query (min 2 characters)',
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/BlogPost' },
                },
              },
            },
          },
          '400': {
            description: 'Invalid search query',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    
    // Resources
    '/resources': {
      get: {
        summary: 'List resources',
        description: 'Get downloadable resources',
        tags: ['Content', 'Resources'],
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by category',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'List of resources',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Resource' },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/resources/{slug}': {
      get: {
        summary: 'Get resource by slug',
        description: 'Get a single resource by its URL slug',
        tags: ['Content', 'Resources'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Resource details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Resource' },
              },
            },
          },
          '400': {
            description: 'Invalid slug parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '404': {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    '/resources/featured': {
      get: {
        summary: 'Get featured resources',
        description: 'Get featured/highlighted resources',
        tags: ['Content', 'Resources'],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Maximum number of resources to return',
          },
        ],
        responses: {
          '200': {
            description: 'List of featured resources',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Resource' },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      // Error Schemas
      ApiError: {
        type: 'object',
        description: 'Standard API error response',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', description: 'Always false for errors' },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', description: 'Error code identifier' },
              message: { type: 'string', description: 'Human-readable error message' },
            },
          },
        },
      },
      ValidationError: {
        type: 'object',
        description: 'Validation error response with field-level details',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', description: 'Always false for errors' },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', description: 'Error code (VALIDATION_ERROR)' },
              message: { type: 'string', description: 'Human-readable error message' },
              fields: {
                type: 'object',
                description: 'Field-level validation errors',
              },
            },
          },
        },
      },
      
      // Feature Flags
      FeatureFlags: {
        type: 'object',
        description: 'Complete feature flag values',
        required: ['home', 'about', 'services', 'solutions', 'comparisonTools', 'financeCompass', 'blog', 'resources', 'contact'],
        properties: {
          home: { type: 'boolean', description: 'Home page enabled (always true)' },
          about: { type: 'boolean', description: 'About section enabled' },
          services: { type: 'boolean', description: 'Services section enabled' },
          solutions: { type: 'boolean', description: 'Solutions section enabled' },
          comparisonTools: { type: 'boolean', description: 'Comparison tools enabled' },
          financeCompass: { type: 'boolean', description: 'FinanceCompass feature enabled' },
          blog: { type: 'boolean', description: 'Blog/Insights Hub enabled' },
          resources: { type: 'boolean', description: 'Resources/Files enabled' },
          contact: { type: 'boolean', description: 'Contact section enabled' },
        },
      },
      AdminFeatureFlagsResponse: {
        type: 'object',
        description: 'Admin response with detailed flag information',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['flags'],
            properties: {
              flags: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['key', 'label', 'envDefault', 'hasOverride', 'effectiveValue'],
                  properties: {
                    key: { type: 'string' },
                    label: { type: 'string' },
                    envDefault: { type: 'boolean' },
                    hasOverride: { type: 'boolean' },
                    overrideValue: { type: 'boolean', nullable: true },
                    effectiveValue: { type: 'boolean' },
                    updatedBy: { type: 'string', nullable: true },
                    updatedAt: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      FeatureFlagOverrideRequest: {
        type: 'object',
        required: ['isEnabled'],
        properties: {
          isEnabled: { type: 'boolean', description: 'New override value' },
          updatedBy: { type: 'string', description: 'Identifier of who made the change' },
        },
      },
      FeatureFlagOverrideResponse: {
        type: 'object',
        description: 'Response after updating a feature flag override',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['override'],
            properties: {
              override: {
                type: 'object',
                properties: {
                  featureKey: { type: 'string' },
                  isEnabled: { type: 'boolean' },
                  updatedBy: { type: 'string' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      DeleteOverrideResponse: {
        type: 'object',
        description: 'Response after deleting a feature flag override',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['deleted'],
            properties: {
              deleted: { type: 'boolean' },
            },
          },
        },
      },
      
      // Analytics Schemas
      PageViewRequest: {
        type: 'object',
        description: 'Page view tracking request',
        required: ['sessionId', 'path'],
        properties: {
          sessionId: { type: 'string', description: 'Unique session identifier' },
          visitorId: { type: 'string', description: 'Persistent visitor identifier' },
          path: { type: 'string', description: 'Page path being viewed' },
          referrer: { type: 'string', description: 'Referring URL' },
          userAgent: { type: 'string', description: 'Browser user agent' },
          duration: { type: 'number', description: 'Time spent on page in seconds' },
        },
      },
      PageViewResponse: {
        type: 'object',
        description: 'Page view tracking response',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['tracked'],
            properties: {
              tracked: { type: 'boolean' },
            },
          },
        },
      },
      AdClickRequest: {
        type: 'object',
        description: 'Ad click tracking request with UTM parameters',
        properties: {
          landingPage: { type: 'string', description: 'Landing page URL' },
          utmSource: { type: 'string', description: 'UTM source parameter' },
          utmMedium: { type: 'string', description: 'UTM medium parameter' },
          utmCampaign: { type: 'string', description: 'UTM campaign parameter' },
          utmContent: { type: 'string', description: 'UTM content parameter' },
          utmTerm: { type: 'string', description: 'UTM term parameter' },
          gclid: { type: 'string', description: 'Google Click ID' },
          screenResolution: { type: 'string', description: 'Screen resolution' },
          language: { type: 'string', description: 'Browser language' },
          timezone: { type: 'string', description: 'User timezone' },
          sessionDuration: { type: 'number', description: 'Session duration in seconds' },
          hasMouseMovement: { type: 'boolean', description: 'Whether mouse movement was detected' },
          hasScrolled: { type: 'boolean', description: 'Whether user has scrolled' },
          hasClicked: { type: 'boolean', description: 'Whether user has clicked on page' },
          hasFormInteraction: { type: 'boolean', description: 'Whether user interacted with forms' },
        },
      },
      AdClickResponse: {
        type: 'object',
        description: 'Ad click tracking response',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            required: ['tracked'],
            properties: {
              tracked: { type: 'boolean' },
              suspiciousScore: { type: 'number', description: 'Fraud detection score (0-100)' },
            },
          },
        },
      },
      
      // Blog Schemas
      BlogPost: {
        type: 'object',
        description: 'Complete blog post',
        required: ['id', 'title', 'slug', 'excerpt', 'content', 'categoryId', 'author', 'publishedAt', 'readingTime', 'tags', 'featured', 'isPublished', 'views'],
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          title: { type: 'string', description: 'Post title' },
          slug: { type: 'string', description: 'URL-friendly slug' },
          excerpt: { type: 'string', description: 'Short excerpt/summary' },
          content: { type: 'string', description: 'Full post content (HTML or Markdown)' },
          heroImage: { type: 'string', description: 'Hero image URL', nullable: true },
          categoryId: { type: 'string', description: 'Category ID' },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Post tags',
          },
          author: { type: 'string', description: 'Author name' },
          authorImage: { type: 'string', description: 'Author avatar URL', nullable: true },
          publishedAt: { type: 'string', description: 'Publication date' },
          readingTime: { type: 'string', description: 'Estimated reading time' },
          featured: { type: 'boolean', description: 'Whether post is featured' },
          isPublished: { type: 'boolean', description: 'Whether post is published' },
          views: { type: 'integer', description: 'View count' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', nullable: true },
        },
      },
      BlogCategory: {
        type: 'object',
        description: 'Blog category',
        required: ['id', 'name', 'slug'],
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          name: { type: 'string', description: 'Category name' },
          slug: { type: 'string', description: 'URL-friendly slug' },
          description: { type: 'string', description: 'Category description', nullable: true },
        },
      },
      
      // Resource Schemas
      Resource: {
        type: 'object',
        description: 'Downloadable resource file',
        required: ['id', 'title', 'slug', 'description', 'category', 'fileType', 'fileUrl', 'fileSize', 'downloadCount', 'viewCount', 'featured', 'publishedAt', 'isPublished'],
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          title: { type: 'string', description: 'Resource title' },
          slug: { type: 'string', description: 'URL-friendly slug' },
          description: { type: 'string', description: 'Resource description' },
          category: { type: 'string', description: 'Resource category' },
          fileType: { type: 'string', description: 'File type (pdf, xlsx, etc.)' },
          fileUrl: { type: 'string', description: 'Download URL' },
          fileSize: { type: 'string', description: 'File size (human-readable)' },
          downloadCount: { type: 'integer', description: 'Number of downloads' },
          viewCount: { type: 'integer', description: 'Number of views' },
          featured: { type: 'boolean', description: 'Whether resource is featured' },
          publishedAt: { type: 'string', description: 'Publication date' },
          isPublished: { type: 'boolean', description: 'Whether resource is published' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp', nullable: true },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
