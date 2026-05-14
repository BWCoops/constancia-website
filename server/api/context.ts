/**
 * API Context Factory
 * 
 * Creates dependency injection context for API handlers.
 * This is the wiring layer that connects routes to core services
 * with their required dependencies.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { Request } from 'express';
import { ConfigurationError } from '../core/types';

// FinanceCompass domain interfaces
import type {
  IAssessmentRepository,
  IQuestionRepository,
  IResponseRepository,
  IContactRepository as IFCContactRepository,
  ICompanyRepository,
  IRoiProfileRepository,
  IReportRepository,
  IAiClient,
  IEmailService as IFCEmailService,
} from '../core/finance-compass/interfaces';

// Content domain interfaces
import type {
  IBlogPostRepository,
  IBlogCategoryRepository,
  IResourceRepository,
  IResourceSessionRepository,
  IResourceLeadRepository,
  IContentService,
} from '../core/content/interfaces';
import type { ResourceSession, ResourceLead } from '../core/content/types';

// Leads domain interfaces
import type {
  ILeadRepository,
  IContactRepository as ILeadsContactRepository,
  IOtpRepository,
} from '../core/leads/interfaces';

// Analytics domain interfaces
import type {
  IPageViewRepository,
  ISessionRepository as IAnalyticsSessionRepository,
  IDownloadRepository,
} from '../core/analytics/interfaces';

// Security domain interfaces
import type {
  IRateLimitRepository,
  ISecurityEventRepository,
  ISessionRepository as ISecuritySessionRepository,
} from '../core/security/interfaces';

// Admin domain interfaces
import type {
  IAdminUserRepository,
  IAuditLogRepository,
  IFeatureFlagRepository,
  IDashboardRepository,
  IGDPRRepository,
} from '../core/admin/interfaces';

// Chat domain interfaces
import type {
  IConversationRepository,
} from '../core/chat/interfaces';

// ComparisonTools domain interfaces
import type {
  IVendorRepository,
} from '../core/comparison-tools/interfaces';

// Content domain repositories
import {
  createBlogPostRepository,
  createBlogCategoryRepository,
  createResourceRepository,
} from '../db/content';

// Leads domain repositories
import {
  createLeadRepository,
  createContactRepository,
  createOtpRepository,
} from '../db/leads';

// Analytics domain repositories
import {
  createPageViewRepository,
  createSessionRepository as createAnalyticsSessionRepository,
  createDownloadRepository,
} from '../db/analytics';

// Security domain repositories
import {
  createRateLimitRepository,
  createSecurityEventRepository,
  createSessionRepository as createSecuritySessionRepository,
} from '../db/security';

// Admin domain repositories
import {
  createAdminUserRepository,
  createAuditLogRepository,
  createFeatureFlagRepository,
  createDashboardRepository,
  createGDPRRepository,
} from '../db/admin';

// Chat domain repositories
import {
  createConversationRepository,
} from '../db/chat';

// ComparisonTools domain repositories
import {
  createVendorRepository,
} from '../db/comparison-tools';

// FinanceCompass domain repositories
import {
  createAssessmentRepository,
  createQuestionRepository,
  createResponseRepository,
  createContactRepository as createFCContactRepository,
  createCompanyRepository,
  createRoiProfileRepository,
  createReportRepository,
} from '../db/finance-compass';

// Content domain services
import { ContentService } from '../core/content/services/content.service';

// Storage for repository instantiation
import { storage } from '../storage';

/**
 * Request context containing all injected dependencies
 */
export interface ApiContext {
  // Request metadata
  requestId: string;
  userId?: string;
  sessionId?: string;
  
  // FinanceCompass repositories
  financeCompass: {
    assessmentRepo: IAssessmentRepository;
    questionRepo: IQuestionRepository;
    responseRepo: IResponseRepository;
    contactRepo: IFCContactRepository;
    companyRepo: ICompanyRepository;
    roiProfileRepo: IRoiProfileRepository;
    reportRepo: IReportRepository;
  };
  
  // Content repositories and services
  content: {
    blogPostRepo: IBlogPostRepository;
    blogCategoryRepo: IBlogCategoryRepository;
    resourceRepo: IResourceRepository;
    service: IContentService;
  };
  
  // Leads repositories
  leads: {
    leadRepo: ILeadRepository;
    contactRepo: ILeadsContactRepository;
    otpRepo: IOtpRepository;
  };
  
  // Analytics repositories
  analytics: {
    pageViewRepo: IPageViewRepository;
    sessionRepo: IAnalyticsSessionRepository;
    downloadRepo: IDownloadRepository;
  };
  
  // Security repositories
  security: {
    rateLimitRepo: IRateLimitRepository;
    securityEventRepo: ISecurityEventRepository;
    sessionRepo: ISecuritySessionRepository;
  };
  
  // Admin repositories
  admin: {
    adminUserRepo: IAdminUserRepository;
    auditLogRepo: IAuditLogRepository;
    featureFlagRepo: IFeatureFlagRepository;
    dashboardRepo: IDashboardRepository;
    gdprRepo: IGDPRRepository;
  };
  
  // Chat repositories
  chat: {
    conversationRepo: IConversationRepository;
  };
  
  // ComparisonTools repositories
  comparisonTools: {
    vendorRepo: IVendorRepository;
  };
  
  // External services
  services: {
    aiClient: IAiClient;
    emailService: IFCEmailService;
  };
  
  // Feature flags
  featureFlags: {
    isEnabled(flag: string): boolean;
  };
}

/**
 * Minimal context for public endpoints that don't need full DI
 */
export interface PublicApiContext {
  requestId: string;
  financeCompass: {
    assessmentRepo: IAssessmentRepository;
    questionRepo: IQuestionRepository;
    responseRepo: IResponseRepository;
    contactRepo: IFCContactRepository;
    companyRepo: ICompanyRepository;
    roiProfileRepo: IRoiProfileRepository;
    reportRepo: IReportRepository;
  };
  
  // Content repositories for public access
  content: {
    blogPostRepo: IBlogPostRepository;
    blogCategoryRepo: IBlogCategoryRepository;
    resourceRepo: IResourceRepository;
    service: IContentService;
  };
  
  // Analytics repositories for tracking
  analytics: {
    pageViewRepo: IPageViewRepository;
    sessionRepo: IAnalyticsSessionRepository;
    downloadRepo: IDownloadRepository;
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Cached repository instances (singleton pattern for efficiency)
let _contentRepositories: {
  blogPostRepo: IBlogPostRepository;
  blogCategoryRepo: IBlogCategoryRepository;
  resourceRepo: IResourceRepository;
} | null = null;

let _leadsRepositories: {
  leadRepo: ILeadRepository;
  contactRepo: ILeadsContactRepository;
  otpRepo: IOtpRepository;
} | null = null;

let _analyticsRepositories: {
  pageViewRepo: IPageViewRepository;
  sessionRepo: IAnalyticsSessionRepository;
  downloadRepo: IDownloadRepository;
} | null = null;

let _securityRepositories: {
  rateLimitRepo: IRateLimitRepository;
  securityEventRepo: ISecurityEventRepository;
  sessionRepo: ISecuritySessionRepository;
} | null = null;

let _adminRepositories: {
  adminUserRepo: IAdminUserRepository;
  auditLogRepo: IAuditLogRepository;
  featureFlagRepo: IFeatureFlagRepository;
  dashboardRepo: IDashboardRepository;
  gdprRepo: IGDPRRepository;
} | null = null;

let _chatRepositories: {
  conversationRepo: IConversationRepository;
} | null = null;

let _comparisonToolsRepositories: {
  vendorRepo: IVendorRepository;
} | null = null;

let _financeCompassRepositories: {
  assessmentRepo: IAssessmentRepository;
  questionRepo: IQuestionRepository;
  responseRepo: IResponseRepository;
  contactRepo: IFCContactRepository;
  companyRepo: ICompanyRepository;
  roiProfileRepo: IRoiProfileRepository;
  reportRepo: IReportRepository;
} | null = null;

function getContentRepositories() {
  if (!_contentRepositories) {
    _contentRepositories = {
      blogPostRepo: createBlogPostRepository(storage),
      blogCategoryRepo: createBlogCategoryRepository(storage),
      resourceRepo: createResourceRepository(storage),
    };
  }
  return _contentRepositories;
}

function getLeadsRepositories() {
  if (!_leadsRepositories) {
    _leadsRepositories = {
      leadRepo: createLeadRepository(storage),
      contactRepo: createContactRepository(storage),
      otpRepo: createOtpRepository(storage),
    };
  }
  return _leadsRepositories;
}

function getAnalyticsRepositories() {
  if (!_analyticsRepositories) {
    _analyticsRepositories = {
      pageViewRepo: createPageViewRepository(storage),
      sessionRepo: createAnalyticsSessionRepository(storage),
      downloadRepo: createDownloadRepository(storage),
    };
  }
  return _analyticsRepositories;
}

function getSecurityRepositories() {
  if (!_securityRepositories) {
    _securityRepositories = {
      rateLimitRepo: createRateLimitRepository(),
      securityEventRepo: createSecurityEventRepository(storage),
      sessionRepo: createSecuritySessionRepository(storage),
    };
  }
  return _securityRepositories;
}

function getAdminRepositories() {
  if (!_adminRepositories) {
    _adminRepositories = {
      adminUserRepo: createAdminUserRepository(storage),
      auditLogRepo: createAuditLogRepository(storage),
      featureFlagRepo: createFeatureFlagRepository(storage),
      dashboardRepo: createDashboardRepository(storage),
      gdprRepo: createGDPRRepository(storage),
    };
  }
  return _adminRepositories;
}

function getChatRepositories() {
  if (!_chatRepositories) {
    _chatRepositories = {
      conversationRepo: createConversationRepository(storage),
    };
  }
  return _chatRepositories;
}

function getComparisonToolsRepositories() {
  if (!_comparisonToolsRepositories) {
    _comparisonToolsRepositories = {
      vendorRepo: createVendorRepository(storage),
    };
  }
  return _comparisonToolsRepositories;
}

function getFinanceCompassRepositories() {
  if (!_financeCompassRepositories) {
    _financeCompassRepositories = {
      assessmentRepo: createAssessmentRepository(),
      questionRepo: createQuestionRepository(),
      responseRepo: createResponseRepository(),
      contactRepo: createFCContactRepository(),
      companyRepo: createCompanyRepository(),
      roiProfileRepo: createRoiProfileRepository(),
      reportRepo: createReportRepository(),
    };
  }
  return _financeCompassRepositories;
}

/**
 * NullObject pattern implementations for repositories not yet wired
 * These provide safe no-op implementations that throw clear errors if mutating methods are called
 */
class NullResourceSessionRepository implements IResourceSessionRepository {
  async findById(_id: string): Promise<ResourceSession | null> { return null; }
  async findByEmailHash(_emailHash: string): Promise<ResourceSession | null> { return null; }
  async findValidSession(_sessionId: string): Promise<ResourceSession | null> { return null; }
  
  async create(_data: any): Promise<ResourceSession> {
    throw new Error('NullResourceSessionRepository.create: Not implemented. Wire actual repository.');
  }
  async revoke(_id: string): Promise<void> {
    throw new Error('NullResourceSessionRepository.revoke: Not implemented. Wire actual repository.');
  }
  async refreshExpiry(_id: string, _newExpiresAt: Date): Promise<void> {
    throw new Error('NullResourceSessionRepository.refreshExpiry: Not implemented. Wire actual repository.');
  }
}

class NullResourceLeadRepository implements IResourceLeadRepository {
  async findById(_id: string): Promise<ResourceLead | null> { return null; }
  async findByEmailHash(_emailHash: string): Promise<ResourceLead | null> { return null; }
  
  async create(_data: any): Promise<ResourceLead> {
    throw new Error('NullResourceLeadRepository.create: Not implemented. Wire actual repository.');
  }
  async update(_id: string, _data: any): Promise<ResourceLead | null> {
    throw new Error('NullResourceLeadRepository.update: Not implemented. Wire actual repository.');
  }
  async markVerified(_id: string): Promise<ResourceLead | null> {
    throw new Error('NullResourceLeadRepository.markVerified: Not implemented. Wire actual repository.');
  }
}

// Singleton instances for the null repositories
const nullSessionRepo = new NullResourceSessionRepository();
const nullLeadRepo = new NullResourceLeadRepository();

/**
 * Build API context for a request
 * 
 * Wires all domain repositories and services.
 */
export function buildApiContext(req: Request): ApiContext {
  const contentRepos = getContentRepositories();
  const leadsRepos = getLeadsRepositories();
  const analyticsRepos = getAnalyticsRepositories();
  const securityRepos = getSecurityRepositories();
  const adminRepos = getAdminRepositories();
  const chatRepos = getChatRepositories();
  const comparisonToolsRepos = getComparisonToolsRepositories();
  const financeCompassRepos = getFinanceCompassRepositories();
  
  // Create content service with wired repositories
  const contentService = new ContentService({
    blogPostRepository: contentRepos.blogPostRepo,
    blogCategoryRepository: contentRepos.blogCategoryRepo,
    resourceRepository: contentRepos.resourceRepo,
    resourceSessionRepository: nullSessionRepo,
    resourceLeadRepository: nullLeadRepo,
  });

  return {
    requestId: generateRequestId(),
    userId: undefined,
    sessionId: undefined,
    
    financeCompass: financeCompassRepos,
    content: {
      ...contentRepos,
      service: contentService,
    },
    leads: leadsRepos,
    analytics: analyticsRepos,
    security: securityRepos,
    admin: adminRepos,
    chat: chatRepos,
    comparisonTools: comparisonToolsRepos,
    
    services: {
      aiClient: nullAiClient,
      emailService: nullEmailService,
    },
    
    featureFlags: {
      isEnabled: (_flag: string) => true, // Default to enabled
    },
  };
}

// NullObject implementations for external services
const nullAiClient: IAiClient = {
  async generateCompletion() {
    return { success: false, error: new ConfigurationError('AI client not configured') };
  },
};

const nullEmailService: IFCEmailService = {
  async sendOtp() {
    return { success: false, error: new ConfigurationError('Email service not configured') };
  },
  async sendReportReady() {
    return { success: false, error: new ConfigurationError('Email service not configured') };
  },
};

/**
 * Build public API context for Content domain
 */
export function buildPublicApiContext(req: Request): PublicApiContext {
  const contentRepos = getContentRepositories();
  const financeCompassRepos = getFinanceCompassRepositories();
  const analyticsRepos = getAnalyticsRepositories();
  
  // Create content service with wired repositories
  const contentService = new ContentService({
    blogPostRepository: contentRepos.blogPostRepo,
    blogCategoryRepository: contentRepos.blogCategoryRepo,
    resourceRepository: contentRepos.resourceRepo,
    resourceSessionRepository: nullSessionRepo,
    resourceLeadRepository: nullLeadRepo,
  });

  return {
    requestId: generateRequestId(),
    financeCompass: financeCompassRepos,
    content: {
      ...contentRepos,
      service: contentService,
    },
    analytics: analyticsRepos,
  };
}

/**
 * Attach context to Express request
 */
declare global {
  namespace Express {
    interface Request {
      ctx?: ApiContext;
      publicCtx?: PublicApiContext;
    }
  }
}

/**
 * Middleware to attach context to request
 * Will be used once repositories are implemented
 */
export function attachContextMiddleware() {
  return (req: Request, _res: any, next: () => void) => {
    const ctx = buildApiContext(req);
    if (ctx) {
      req.ctx = ctx;
    }
    next();
  };
}
