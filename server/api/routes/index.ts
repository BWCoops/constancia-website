import { Router } from "express";
import blogRoutes from "./blog.routes";
import resourcesRoutes from "./resources.routes";
import contactRoutes from "./contact.routes";
import analyticsRoutes from "./analytics.routes";
import adminRoutes from "./admin.routes";
import comparisonExportRoutes from "./comparison-export.routes";

const router = Router();

router.use("/blog", blogRoutes);

router.use("/", resourcesRoutes);

router.use("/contact", contactRoutes);

router.use("/track", analyticsRoutes);

router.use("/admin", adminRoutes);

router.use("/", comparisonExportRoutes);

export default router;
