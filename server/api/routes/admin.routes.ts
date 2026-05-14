import { Router } from "express";
import {
  getAdminFeatureFlags,
  updateFeatureFlagOverride,
  deleteFeatureFlagOverride,
} from "../feature-flags";

const router = Router();

router.get("/feature-flags", getAdminFeatureFlags);

router.patch("/feature-flags/:featureKey", updateFeatureFlagOverride);

router.delete("/feature-flags/:featureKey", deleteFeatureFlagOverride);

export default router;
