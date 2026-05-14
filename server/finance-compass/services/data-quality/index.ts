export { dataQualityService, DataQualityService } from './quality-validation.service';
export type { QualityValidationResult, BackfillStats } from './quality-validation.service';

export { anonymousExportService, AnonymousExportService } from './anonymous-export.service';
export type { AnonymousAssessmentRecord, AnonymousDataExport } from './anonymous-export.service';

export { widgetQualityService, WidgetQualityService } from './widget-quality.service';
export type { WidgetSessionSummary, WidgetQualityStats, WidgetBackfillStats } from './widget-quality.service';

export { 
  runStartupBackfill, 
  getLastBackfillResult, 
  isBackfillInProgress, 
  scheduleStartupBackfill 
} from './startup-backfill';
