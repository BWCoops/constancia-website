import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Download, 
  Image as ImageIcon,
  Linkedin,
  Instagram,
  Globe,
  RefreshCw,
  Check,
  Star,
  Sparkles,
  Building2,
  Brain,
  TrendingUp,
  Palette,
  LayoutGrid,
  Megaphone,
  Video,
  Play,
  Clock,
  Wand2,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Upload,
  ExternalLink,
  Loader2,
  Chrome
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import AdminLayout from "./AdminLayout";

// Marketing asset type from database
interface MarketingAsset {
  id: string;
  name: string;
  description: string | null;
  type: "image" | "video" | "template";
  category: "linkedin" | "google" | "social" | "website" | "email";
  platform: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  dimensions: { width: number; height: number } | null;
  fileSize: number | null;
  mimeType: string | null;
  tags: string[];
  featured: boolean;
  isActive: boolean;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

import whiteLogo from "@assets/constancia-logo-dark.png";
import gradientLogo from "@assets/constancia-logo.png";
import iconWhite from "@assets/constancia-logo-dark.png";

// Stock-image / marketing-asset placeholders. The original stock_images/
// and marketing/ directories were never checked into the repo, so we alias
// every name to the brand logo as a benign placeholder. Replace per-asset
// when the real images are re-uploaded into attached_assets/.
const peopleProfessional1 = whiteLogo;
const peopleProfessional2 = whiteLogo;
const peopleProfessional3 = whiteLogo;
const peopleTeam1 = whiteLogo;
const peopleTeam2 = whiteLogo;
const peopleTeam3 = whiteLogo;
const londonOffice = whiteLogo;
const stockBusiness1 = whiteLogo;
const stockBusiness2 = whiteLogo;
const stockBusiness3 = whiteLogo;
const stockData1 = whiteLogo;
const stockData2 = whiteLogo;
const stockData3 = whiteLogo;
const stockCloud1 = whiteLogo;
const stockCloud2 = whiteLogo;
const stockCloud3 = whiteLogo;
const stockExec1 = whiteLogo;
const stockExec2 = whiteLogo;
const stockExec3 = whiteLogo;
const stockDigital1 = whiteLogo;
const stockDigital2 = whiteLogo;
const stockDigital3 = whiteLogo;
const teamsGradient1 = whiteLogo;
const teamsGradient2 = whiteLogo;
const teamsGradient3 = whiteLogo;
const teamsStock1 = whiteLogo;
const teamsStock2 = whiteLogo;
const teamsStock3 = whiteLogo;



// Brand colors
const BRAND = {
  navy: "#12161D",
  cyan: "#7FB8A3",
  teal: "#8E4F67",
};

// Tagline configuration (matches footer format exactly)
const TAGLINE = {
  line1: "Finance Transformed.",
  line2: "Designed for Change.",
  line3: "Driven by Technology.",  // Cyan italic in footer
};

// Gradient cover configurations
type AssetType = 
  | "linkedin-cover" 
  | "social-square" 
  | "hero" 
  | "email-header"
  | "google-display-medium"
  | "google-display-leaderboard"
  | "google-display-skyscraper"
  | "google-display-mobile"
  | "google-display-large-rectangle"
  | "google-display-half-page"
  | "linkedin-sponsored"
  | "linkedin-carousel"
  | "linkedin-message"
  | "teams-background"
  | "zoom-background";

interface GradientCoverConfig {
  id: string;
  name: string;
  description: string;
  type: AssetType;
  dimensions: { width: number; height: number };
  gradientStyle: string;
  gradientAngle: number;
  colorStops: { color: string; position: number }[];
  logoPosition: "left" | "right" | "center";
  taglinePosition: "left" | "right" | "center";
  featured?: boolean;
  adFormat?: string;
  iconOnly?: boolean;
}

const gradientCovers: GradientCoverConfig[] = [
  // LinkedIn Covers - Gradient styles (Logo & Tagline on RIGHT to avoid profile picture overlap)
  {
    id: "grad-linkedin-navy-cyan",
    name: "Navy to Cyan Gradient",
    description: "Classic Constancia brand gradient - professional and modern",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "grad-linkedin-deep-navy",
    name: "Deep Navy Professional",
    description: "Sophisticated dark gradient with subtle teal accent",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 40 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "grad-linkedin-cyan-fade",
    name: "Cyan Horizon",
    description: "Bright cyan fading to deep navy - energetic and forward-thinking",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.cyan, position: 0 },
      { color: BRAND.teal, position: 30 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
  {
    id: "grad-linkedin-teal-center",
    name: "Teal Radiance",
    description: "Centered teal glow with navy edges - balanced and focused",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
  {
    id: "grad-linkedin-diagonal",
    name: "Diagonal Flow",
    description: "Dynamic diagonal gradient - movement and progress",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 45,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 30 },
      { color: BRAND.teal, position: 70 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "grad-linkedin-subtle",
    name: "Subtle Navy",
    description: "Understated navy gradient - elegant and professional",
    type: "linkedin-cover",
    dimensions: { width: 1584, height: 396 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
  // Social Square - Gradient
  {
    id: "grad-social-brand",
    name: "Brand Gradient Square",
    description: "Perfect for social media posts and announcements",
    type: "social-square",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 60 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
  },
  {
    id: "grad-social-dark",
    name: "Deep Navy Square",
    description: "Dark professional square for impactful statements",
    type: "social-square",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 70 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
  },
  // Hero Banner - Gradient
  {
    id: "grad-hero-wide",
    name: "Wide Hero Gradient",
    description: "Full-width website hero with brand gradient",
    type: "hero",
    dimensions: { width: 1920, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
  },
  // Email Header - Gradient
  {
    id: "grad-email-compact",
    name: "Email Header Gradient",
    description: "Compact branded header for email campaigns",
    type: "email-header",
    dimensions: { width: 600, height: 200 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
  },
  // Google Display Ads - Various Formats
  {
    id: "google-medium-rect",
    name: "Google Medium Rectangle",
    description: "300×250 - Most common display ad size",
    type: "google-display-medium",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "Google Display",
  },
  {
    id: "google-leaderboard",
    name: "Google Leaderboard",
    description: "728×90 - Top of page banner",
    type: "google-display-leaderboard",
    dimensions: { width: 728, height: 90 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "left",
    featured: true,
    adFormat: "Google Display",
  },
  {
    id: "google-skyscraper",
    name: "Google Wide Skyscraper",
    description: "160×600 - Sidebar vertical ad",
    type: "google-display-skyscraper",
    dimensions: { width: 160, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  {
    id: "google-mobile-banner",
    name: "Google Mobile Banner",
    description: "320×50 - Mobile leaderboard",
    type: "google-display-mobile",
    dimensions: { width: 320, height: 50 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "left",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  {
    id: "google-large-rect",
    name: "Google Large Rectangle",
    description: "336×280 - Enhanced visibility ad",
    type: "google-display-large-rectangle",
    dimensions: { width: 336, height: 280 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 60 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "Google Display",
  },
  {
    id: "google-half-page",
    name: "Google Half Page",
    description: "300×600 - High impact vertical",
    type: "google-display-half-page",
    dimensions: { width: 300, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 40 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  // LinkedIn Ads - Sponsored Content & Messaging
  {
    id: "linkedin-sponsored-content",
    name: "LinkedIn Sponsored Content",
    description: "1200×627 - Single image ad in feed",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 60 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-sponsored-dark",
    name: "LinkedIn Sponsored Dark",
    description: "1200×627 - Professional dark theme",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-carousel",
    name: "LinkedIn Carousel Card",
    description: "1080×1080 - Square for carousel ads",
    type: "linkedin-carousel",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 60 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-message-ad",
    name: "LinkedIn Message Ad",
    description: "300×250 - Sponsored InMail banner",
    type: "linkedin-message",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  // === ADDITIONAL GOOGLE ADS (Icon Only & Gradient Variants) ===
  {
    id: "google-medium-rect-icon",
    name: "Google Medium Rectangle (Icon)",
    description: "300×250 - Icon-only minimal design",
    type: "google-display-medium",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-leaderboard-icon",
    name: "Google Leaderboard (Icon)",
    description: "728×90 - Icon-only banner",
    type: "google-display-leaderboard",
    dimensions: { width: 728, height: 90 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 40 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-medium-rect-cyan",
    name: "Google Medium Rectangle (Cyan Wave)",
    description: "300×250 - Bright cyan gradient",
    type: "google-display-medium",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 45,
    colorStops: [
      { color: BRAND.teal, position: 0 },
      { color: BRAND.cyan, position: 50 },
      { color: "#FFFFFF", position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "Google Display",
  },
  {
    id: "google-large-rect-dark",
    name: "Google Large Rectangle (Deep Navy)",
    description: "336×280 - Premium dark theme",
    type: "google-display-large-rectangle",
    dimensions: { width: 336, height: 280 },
    gradientStyle: "linear",
    gradientAngle: 160,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  {
    id: "google-large-rect-icon",
    name: "Google Large Rectangle (Icon)",
    description: "336×280 - Icon-only modern design",
    type: "google-display-large-rectangle",
    dimensions: { width: 336, height: 280 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-half-page-icon",
    name: "Google Half Page (Icon)",
    description: "300×600 - Icon-only vertical",
    type: "google-display-half-page",
    dimensions: { width: 300, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-skyscraper-icon",
    name: "Google Skyscraper (Icon)",
    description: "160×600 - Icon-only sidebar",
    type: "google-display-skyscraper",
    dimensions: { width: 160, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.cyan, position: 0 },
      { color: BRAND.teal, position: 40 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-mobile-banner-icon",
    name: "Google Mobile Banner (Icon)",
    description: "320×50 - Icon-only mobile",
    type: "google-display-mobile",
    dimensions: { width: 320, height: 50 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
    iconOnly: true,
  },
  {
    id: "google-leaderboard-diagonal",
    name: "Google Leaderboard (Diagonal Flow)",
    description: "728×90 - Dynamic diagonal gradient",
    type: "google-display-leaderboard",
    dimensions: { width: 728, height: 90 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "left",
    adFormat: "Google Display",
  },
  {
    id: "google-medium-rect-radial",
    name: "Google Medium Rectangle (Center Glow)",
    description: "300×250 - Radial teal glow effect",
    type: "google-display-medium",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 45 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  {
    id: "google-half-page-cyan",
    name: "Google Half Page (Cyan Focus)",
    description: "300×600 - Cyan-dominant vertical",
    type: "google-display-half-page",
    dimensions: { width: 300, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.cyan, position: 0 },
      { color: BRAND.teal, position: 30 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "Google Display",
  },
  {
    id: "google-skyscraper-dark",
    name: "Google Skyscraper (Deep Navy)",
    description: "160×600 - Elegant dark sidebar",
    type: "google-display-skyscraper",
    dimensions: { width: 160, height: 600 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 70 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  {
    id: "google-mobile-banner-teal",
    name: "Google Mobile Banner (Teal Accent)",
    description: "320×50 - Teal-centered mobile",
    type: "google-display-mobile",
    dimensions: { width: 320, height: 50 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.teal, position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "left",
    taglinePosition: "center",
    adFormat: "Google Display",
  },
  // === ADDITIONAL LINKEDIN ADS (Icon Only & Gradient Variants) ===
  {
    id: "linkedin-sponsored-icon",
    name: "LinkedIn Sponsored (Icon)",
    description: "1200×627 - Icon-only brand awareness",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
    iconOnly: true,
  },
  {
    id: "linkedin-carousel-icon",
    name: "LinkedIn Carousel (Icon)",
    description: "1080×1080 - Icon-only square",
    type: "linkedin-carousel",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
    iconOnly: true,
  },
  {
    id: "linkedin-message-icon",
    name: "LinkedIn Message Ad (Icon)",
    description: "300×250 - Icon-only InMail banner",
    type: "linkedin-message",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
    iconOnly: true,
  },
  {
    id: "linkedin-sponsored-cyan-wave",
    name: "LinkedIn Sponsored (Cyan Wave)",
    description: "1200×627 - Bright cyan gradient",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 45,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 40 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-sponsored-deep-navy",
    name: "LinkedIn Sponsored (Deep Navy)",
    description: "1200×627 - Premium dark professional",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 160,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-carousel-diagonal",
    name: "LinkedIn Carousel (Diagonal Flow)",
    description: "1080×1080 - Dynamic diagonal square",
    type: "linkedin-carousel",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 45,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 30 },
      { color: BRAND.teal, position: 70 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-carousel-teal-center",
    name: "LinkedIn Carousel (Teal Focus)",
    description: "1080×1080 - Centered teal glow",
    type: "linkedin-carousel",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-message-cyan",
    name: "LinkedIn Message Ad (Cyan Accent)",
    description: "300×250 - Bright cyan InMail",
    type: "linkedin-message",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.cyan, position: 0 },
      { color: BRAND.teal, position: 40 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-sponsored-horizontal",
    name: "LinkedIn Sponsored (Horizontal Flow)",
    description: "1200×627 - Left-to-right gradient",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.teal, position: 50 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-carousel-cyan-top",
    name: "LinkedIn Carousel (Cyan Sky)",
    description: "1080×1080 - Cyan fading downward",
    type: "linkedin-carousel",
    dimensions: { width: 1080, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: BRAND.cyan, position: 0 },
      { color: BRAND.teal, position: 30 },
      { color: BRAND.navy, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    featured: true,
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-message-dark",
    name: "LinkedIn Message Ad (Deep Navy)",
    description: "300×250 - Premium dark InMail",
    type: "linkedin-message",
    dimensions: { width: 300, height: 250 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  {
    id: "linkedin-sponsored-subtle",
    name: "LinkedIn Sponsored (Subtle Navy)",
    description: "1200×627 - Understated elegant",
    type: "linkedin-sponsored",
    dimensions: { width: 1200, height: 627 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 50 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "center",
    taglinePosition: "center",
    adFormat: "LinkedIn Ads",
  },
  // === TEAMS & ZOOM VIRTUAL BACKGROUNDS ===
  {
    id: "teams-bg-navy-flow",
    name: "Teams - Navy Flow",
    description: "1920×1080 - Professional dark gradient with flowing accents",
    type: "teams-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 40 },
      { color: BRAND.teal, position: 85 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "teams-bg-deep-navy",
    name: "Teams - Deep Navy",
    description: "1920×1080 - Sophisticated dark professional",
    type: "teams-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 180,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
  {
    id: "teams-bg-teal-accent",
    name: "Teams - Teal Accent",
    description: "1920×1080 - Navy with teal accent corner",
    type: "teams-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 120,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "teams-bg-minimal",
    name: "Teams - Minimal Navy",
    description: "1920×1080 - Clean minimal design",
    type: "teams-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 90,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: "#12161D", position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
  {
    id: "zoom-bg-navy-flow",
    name: "Zoom - Navy Flow",
    description: "1920×1080 - Professional dark gradient with flowing accents",
    type: "zoom-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 135,
    colorStops: [
      { color: "#12161D", position: 0 },
      { color: BRAND.navy, position: 40 },
      { color: BRAND.teal, position: 85 },
      { color: BRAND.cyan, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
    featured: true,
  },
  {
    id: "zoom-bg-teal-accent",
    name: "Zoom - Teal Accent",
    description: "1920×1080 - Navy with teal accent corner",
    type: "zoom-background",
    dimensions: { width: 1920, height: 1080 },
    gradientStyle: "linear",
    gradientAngle: 120,
    colorStops: [
      { color: BRAND.navy, position: 0 },
      { color: BRAND.navy, position: 60 },
      { color: BRAND.teal, position: 100 },
    ],
    logoPosition: "right",
    taglinePosition: "right",
  },
];


// Teams gradient backgrounds (AI-generated with logo and tagline included)
// Stock photo backgrounds (branding added on download)

interface TeamsBackgroundConfig {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  featured?: boolean;
}

const teamsBackgrounds: TeamsBackgroundConfig[] = [
  {
    id: "teams-gradient-1",
    name: "Navy Cyan Gradient",
    description: "Branded gradient with logo and tagline included",
    imagePath: teamsGradient1,
    featured: true,
  },
  {
    id: "teams-gradient-2",
    name: "Navy Teal Gradient",
    description: "Corporate gradient with geometric patterns",
    imagePath: teamsGradient2,
    featured: true,
  },
  {
    id: "teams-gradient-3",
    name: "Abstract Gradient",
    description: "Flowing abstract brand design",
    imagePath: teamsGradient3,
    featured: true,
  },
];

const stockBackgrounds: TeamsBackgroundConfig[] = [
  {
    id: "stock-conference",
    name: "Executive Conference Room",
    description: "Professional boardroom - branding added on download",
    imagePath: teamsStock1,
    featured: true,
  },
  {
    id: "stock-office",
    name: "Modern Office Space",
    description: "Contemporary workspace - branding added on download",
    imagePath: teamsStock2,
  },
  {
    id: "stock-tech",
    name: "Technology Workspace",
    description: "Tech environment - branding added on download",
    imagePath: teamsStock3,
  },
  {
    id: "stock-london",
    name: "UK London Office",
    description: "London business workspace - branding added on download",
    imagePath: londonOffice,
    featured: true,
  },
];

type StockAssetType = "linkedin-cover" | "social-square" | "story" | "hero" | "email-header";
type AssetCategory = "professional" | "technology" | "ai" | "executive" | "digital" | "data";

interface AssetConfig {
  id: string;
  name: string;
  description: string;
  background: string;
  type: StockAssetType;
  category: AssetCategory;
  dimensions: { width: number; height: number };
  logoPosition: "left" | "center" | "right" | "bottom-left" | "bottom-center";
  logoScale: number;
  overlay: "dark" | "gradient" | "light" | "none";
  featured?: boolean;
}

const categoryInfo: Record<AssetCategory, { label: string; icon: typeof Building2; color: string }> = {
  professional: { label: "Professional", icon: Building2, color: "bg-[#7FB8A3]/100" },
  technology: { label: "Technology", icon: Globe, color: "bg-[#7FB8A3]/100" },
  ai: { label: "AI & Innovation", icon: Brain, color: "bg-purple-500" },
  executive: { label: "Executive", icon: Star, color: "bg-amber-500" },
  digital: { label: "Digital Transform", icon: TrendingUp, color: "bg-emerald-500" },
  data: { label: "Data & Analytics", icon: Sparkles, color: "bg-indigo-500" },
};

const assets: AssetConfig[] = [
  // LinkedIn Covers - Professional (Logo on right to avoid profile picture overlap)
  {
    id: "linkedin-pro-1",
    name: "Executive Boardroom",
    description: "Premium corporate setting with strategic leadership focus",
    background: stockExec1,
    type: "linkedin-cover",
    category: "executive",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
    featured: true,
  },
  {
    id: "linkedin-pro-2",
    name: "Business Strategy Session",
    description: "Modern collaborative consulting environment",
    background: stockBusiness1,
    type: "linkedin-cover",
    category: "professional",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
    featured: true,
  },
  {
    id: "linkedin-pro-3",
    name: "Professional Team",
    description: "Dynamic team collaboration in contemporary office",
    background: stockBusiness2,
    type: "linkedin-cover",
    category: "professional",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
  },
  // LinkedIn Covers - Technology
  {
    id: "linkedin-tech-1",
    name: "Cloud Infrastructure",
    description: "Modern enterprise cloud computing visualization",
    background: stockCloud1,
    type: "linkedin-cover",
    category: "technology",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
    featured: true,
  },
  {
    id: "linkedin-tech-2",
    name: "Enterprise Solutions",
    description: "Sleek technology infrastructure imagery",
    background: stockCloud2,
    type: "linkedin-cover",
    category: "technology",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
  },
  {
    id: "linkedin-tech-3",
    name: "Digital Systems",
    description: "Advanced technology systems visualization",
    background: stockCloud3,
    type: "linkedin-cover",
    category: "technology",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
  },
  // LinkedIn Covers - AI & Innovation (using abstract data imagery)
  {
    id: "linkedin-ai-1",
    name: "Innovation Networks",
    description: "Abstract innovation and connectivity visualization",
    background: stockData3,
    type: "linkedin-cover",
    category: "ai",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
    featured: true,
  },
  {
    id: "linkedin-ai-2",
    name: "Digital Intelligence",
    description: "Abstract digital patterns and innovation",
    background: stockDigital3,
    type: "linkedin-cover",
    category: "ai",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
  },
  {
    id: "linkedin-ai-3",
    name: "Smart Technology",
    description: "Abstract technology transformation",
    background: stockDigital2,
    type: "linkedin-cover",
    category: "ai",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
  },
  // LinkedIn Covers - Data Analytics
  {
    id: "linkedin-data-1",
    name: "Data Insights",
    description: "Business intelligence and analytics dashboard",
    background: stockData1,
    type: "linkedin-cover",
    category: "data",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
    featured: true,
  },
  {
    id: "linkedin-data-2",
    name: "Analytics Dashboard",
    description: "Real-time data visualization and insights",
    background: stockData2,
    type: "linkedin-cover",
    category: "data",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
  },
  {
    id: "linkedin-data-3",
    name: "Business Metrics",
    description: "KPI tracking and performance analytics",
    background: stockData3,
    type: "linkedin-cover",
    category: "data",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
  },
  // LinkedIn Covers - Digital Transformation
  {
    id: "linkedin-digital-1",
    name: "Digital Innovation",
    description: "Business transformation through technology",
    background: stockDigital1,
    type: "linkedin-cover",
    category: "digital",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
    featured: true,
  },
  {
    id: "linkedin-digital-2",
    name: "Connected Enterprise",
    description: "Integrated digital business ecosystem",
    background: stockDigital2,
    type: "linkedin-cover",
    category: "digital",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "dark",
  },
  {
    id: "linkedin-digital-3",
    name: "Future of Work",
    description: "Next-generation workplace technology",
    background: stockDigital3,
    type: "linkedin-cover",
    category: "digital",
    dimensions: { width: 1584, height: 396 },
    logoPosition: "right",
    logoScale: 0.28,
    overlay: "gradient",
  },
  // Social Square Posts
  {
    id: "social-exec-1",
    name: "Leadership Square",
    description: "Executive presence for social feeds",
    background: stockExec2,
    type: "social-square",
    category: "executive",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "dark",
    featured: true,
  },
  {
    id: "social-tech-1",
    name: "Tech Innovation",
    description: "Technology-focused social content",
    background: stockCloud1,
    type: "social-square",
    category: "technology",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "gradient",
    featured: true,
  },
  {
    id: "social-ai-1",
    name: "Innovation Insights",
    description: "Abstract innovation themed posts",
    background: stockDigital1,
    type: "social-square",
    category: "ai",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "dark",
    featured: true,
  },
  {
    id: "social-data-1",
    name: "Data Analytics",
    description: "Analytics and insights social content",
    background: stockData1,
    type: "social-square",
    category: "data",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "gradient",
  },
  {
    id: "social-digital-1",
    name: "Digital Transform",
    description: "Transformation journey visual",
    background: stockDigital1,
    type: "social-square",
    category: "digital",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "dark",
  },
  {
    id: "social-business-1",
    name: "Professional Consulting",
    description: "Business consulting imagery",
    background: stockBusiness3,
    type: "social-square",
    category: "professional",
    dimensions: { width: 1080, height: 1080 },
    logoPosition: "bottom-center",
    logoScale: 0.25,
    overlay: "gradient",
  },
  // Website Hero Banners
  {
    id: "hero-exec-1",
    name: "Executive Hero",
    description: "Premium hero for leadership pages",
    background: stockExec3,
    type: "hero",
    category: "executive",
    dimensions: { width: 1920, height: 600 },
    logoPosition: "center",
    logoScale: 0.18,
    overlay: "dark",
    featured: true,
  },
  {
    id: "hero-tech-1",
    name: "Technology Hero",
    description: "Tech-focused website banner",
    background: stockCloud2,
    type: "hero",
    category: "technology",
    dimensions: { width: 1920, height: 600 },
    logoPosition: "center",
    logoScale: 0.18,
    overlay: "gradient",
    featured: true,
  },
  {
    id: "hero-ai-1",
    name: "Innovation Hero",
    description: "Abstract technology website header",
    background: stockData1,
    type: "hero",
    category: "ai",
    dimensions: { width: 1920, height: 600 },
    logoPosition: "center",
    logoScale: 0.18,
    overlay: "dark",
  },
  {
    id: "hero-data-1",
    name: "Analytics Hero",
    description: "Data-focused website banner",
    background: stockData2,
    type: "hero",
    category: "data",
    dimensions: { width: 1920, height: 600 },
    logoPosition: "center",
    logoScale: 0.18,
    overlay: "gradient",
  },
  // Email Headers
  {
    id: "email-pro-1",
    name: "Professional Email",
    description: "Corporate email header banner",
    background: stockBusiness1,
    type: "email-header",
    category: "professional",
    dimensions: { width: 600, height: 200 },
    logoPosition: "center",
    logoScale: 0.35,
    overlay: "dark",
    featured: true,
  },
  {
    id: "email-tech-1",
    name: "Tech Email",
    description: "Technology-themed email header",
    background: stockCloud3,
    type: "email-header",
    category: "technology",
    dimensions: { width: 600, height: 200 },
    logoPosition: "center",
    logoScale: 0.35,
    overlay: "gradient",
  },
];

// Video asset configurations
interface VideoAssetConfig {
  id: string;
  name: string;
  description: string;
  platform: "linkedin" | "google" | "instagram" | "youtube" | "website";
  dimensions: { width: number; height: number };
  aspectRatio: "16:9" | "9:16" | "1:1";
  duration: number;
  style: "abstract" | "corporate" | "data" | "technology" | "people";
  featured?: boolean;
  peopleImage?: string;
}

const videoAssets: VideoAssetConfig[] = [
  // LinkedIn Videos
  {
    id: "video-linkedin-brand-1",
    name: "Brand Introduction",
    description: "Abstract data flow animation with Constancia branding",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "abstract",
    featured: true,
  },
  {
    id: "video-linkedin-tech-1",
    name: "Technology Showcase",
    description: "Modern tech visualization with gradient transitions",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "technology",
  },
  {
    id: "video-linkedin-data-1",
    name: "Data Analytics Motion",
    description: "Abstract data visualization with flowing particles",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 8,
    style: "data",
  },
  // Google Ads Videos
  {
    id: "video-google-bumper-1",
    name: "Bumper Ad - Brand",
    description: "6-second brand awareness bumper ad",
    platform: "google",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "abstract",
    featured: true,
  },
  {
    id: "video-google-skippable-1",
    name: "Skippable Ad - Services",
    description: "Professional services showcase video",
    platform: "google",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 8,
    style: "corporate",
  },
  // Instagram/Social Videos
  {
    id: "video-social-story-1",
    name: "Story Format - Brand",
    description: "Vertical brand story with abstract animations",
    platform: "instagram",
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    duration: 6,
    style: "abstract",
    featured: true,
  },
  {
    id: "video-social-reel-1",
    name: "Reel Format - Tech",
    description: "Engaging tech-themed vertical video",
    platform: "instagram",
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    duration: 8,
    style: "technology",
  },
  {
    id: "video-social-square-1",
    name: "Square Post - Data",
    description: "Square format data visualization animation",
    platform: "instagram",
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: "1:1",
    duration: 6,
    style: "data",
  },
  // Website Videos
  {
    id: "video-website-hero-1",
    name: "Hero Background",
    description: "Loopable abstract background for website hero",
    platform: "website",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 8,
    style: "abstract",
    featured: true,
  },
  {
    id: "video-website-about-1",
    name: "About Section",
    description: "Corporate overview animation",
    platform: "website",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "corporate",
  },
  // PEOPLE STYLE VIDEOS - Real business professionals with animated overlays
  {
    id: "video-linkedin-people-1",
    name: "Professional at Work",
    description: "Business professional with animated tech overlays",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "people",
    peopleImage: peopleProfessional1,
    featured: true,
  },
  {
    id: "video-linkedin-people-2",
    name: "Finance Expert",
    description: "Finance professional with data visualization animations",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 8,
    style: "people",
    peopleImage: peopleProfessional2,
  },
  {
    id: "video-linkedin-team-1",
    name: "Team Collaboration",
    description: "Diverse business team with collaborative tech elements",
    platform: "linkedin",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "people",
    peopleImage: peopleTeam1,
    featured: true,
  },
  {
    id: "video-social-people-story-1",
    name: "Expert Story",
    description: "Vertical story featuring business professional",
    platform: "instagram",
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    duration: 6,
    style: "people",
    peopleImage: peopleProfessional3,
  },
  {
    id: "video-social-team-story-1",
    name: "Team Story",
    description: "Vertical story featuring business team collaboration",
    platform: "instagram",
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: "9:16",
    duration: 6,
    style: "people",
    peopleImage: peopleTeam2,
    featured: true,
  },
  {
    id: "video-google-people-1",
    name: "Professional Expertise",
    description: "Business expert showcase for Google ads",
    platform: "google",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 6,
    style: "people",
    peopleImage: peopleProfessional1,
  },
  {
    id: "video-website-people-hero-1",
    name: "People Hero Background",
    description: "Professional team hero with tech overlays",
    platform: "website",
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: "16:9",
    duration: 8,
    style: "people",
    peopleImage: peopleTeam3,
    featured: true,
  },
  {
    id: "video-social-people-square-1",
    name: "Expert Square Post",
    description: "Square format featuring finance professional",
    platform: "instagram",
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: "1:1",
    duration: 6,
    style: "people",
    peopleImage: peopleProfessional2,
  },
];

const platformInfo: Record<VideoAssetConfig["platform"], { label: string; icon: typeof Video; color: string }> = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "bg-[#0077B5]" },
  google: { label: "Google Ads", icon: Video, color: "bg-red-500" },
  instagram: { label: "Instagram", icon: Instagram, color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  youtube: { label: "YouTube", icon: Play, color: "bg-red-600" },
  website: { label: "Website", icon: Globe, color: "bg-brand-navy" },
};

const styleInfo: Record<VideoAssetConfig["style"], { label: string; description: string }> = {
  abstract: { label: "Abstract", description: "Flowing shapes, particles, and gradient animations" },
  corporate: { label: "Corporate", description: "Professional business-focused visuals" },
  data: { label: "Data", description: "Data visualization and analytics themes" },
  technology: { label: "Technology", description: "Modern tech and innovation themes" },
  people: { label: "People", description: "Professional business people with animated overlays" },
};

function getStockAssetLayout(position: AssetConfig["logoPosition"], type: string) {
  const isLinkedIn = type === "linkedin-cover";
  const isSquare = type === "social-square";
  const isHero = type === "hero";
  const isEmail = type === "email-header";
  
  let logoX = 50;
  let logoY = 35;
  let taglineY = 58;
  
  if (isLinkedIn) {
    logoX = position === "right" ? 75 : position === "left" ? 25 : 50;
    logoY = 32;
    taglineY = 62;
  } else if (isSquare) {
    logoX = 50;
    logoY = 38;
    taglineY = 62;
  } else if (isHero) {
    logoX = 50;
    logoY = 35;
    taglineY = 60;
  } else if (isEmail) {
    logoX = 50;
    logoY = 32;
    taglineY = 65;
  }
  
  return { logoX, logoY, taglineY };
}

function getLogoPosition(position: AssetConfig["logoPosition"], dimensions: { width: number; height: number }, type?: string) {
  const layout = getStockAssetLayout(position, type || "");
  return { x: layout.logoX, y: layout.logoY };
}

function buildGradientCSS(cover: GradientCoverConfig): string {
  const stops = cover.colorStops.map(s => `${s.color} ${s.position}%`).join(', ');
  return `linear-gradient(${cover.gradientAngle}deg, ${stops})`;
}

function isAdFormat(type: string): boolean {
  return type.startsWith("google-display") || 
         type === "linkedin-sponsored" || 
         type === "linkedin-sponsored-dark" ||
         type === "linkedin-carousel" || 
         type === "linkedin-message";
}

interface AdFormatConfig {
  logo: { widthPercent: number; position: "left" | "center" | "right" };
  tagline: { show: boolean; fontSizeRatio: number };
  layout: "horizontal" | "vertical" | "compact" | "default";
}

function getAdFormatConfig(type: string, dimensions: { width: number; height: number }): AdFormatConfig {
  const aspectRatio = dimensions.width / dimensions.height;
  const isWide = aspectRatio > 3;
  const isTall = aspectRatio < 0.5;
  const isCompact = dimensions.width < 350 && dimensions.height < 300;
  
  if (isWide) {
    return {
      logo: { widthPercent: 0.12, position: "left" },
      tagline: { show: true, fontSizeRatio: 0.22 },
      layout: "horizontal",
    };
  }
  
  if (isTall) {
    return {
      logo: { widthPercent: 0.65, position: "center" },
      tagline: { show: true, fontSizeRatio: 0.08 },
      layout: "vertical",
    };
  }
  
  if (isCompact) {
    return {
      logo: { widthPercent: 0.45, position: "center" },
      tagline: { show: false, fontSizeRatio: 0 },
      layout: "compact",
    };
  }
  
  return {
    logo: { widthPercent: 0.35, position: "center" },
    tagline: { show: true, fontSizeRatio: 0.028 },
    layout: "default",
  };
}

function getAdLogoScale(config: AdFormatConfig, dimensions: { width: number; height: number }): string {
  return `${config.logo.widthPercent * 100}%`;
}

function getHorizontalAdScale(dimensions: { width: number; height: number }) {
  const baselineWidth = 728;
  const baselineHeight = 90;
  const widthScale = dimensions.width / baselineWidth;
  const heightScale = dimensions.height / baselineHeight;
  const scale = Math.min(widthScale, heightScale);
  
  const baseFontSize = 11;
  const baseLogoHeight = 38;
  const baseGap = 8;
  const baseDividerPadding = 8;
  
  return {
    fontSize: Math.max(baseFontSize * scale, 8),
    logoHeight: Math.max(baseLogoHeight * scale, 24),
    gap: Math.max(baseGap * scale, 4),
    dividerPadding: Math.max(baseDividerPadding * scale, 4),
    showTagline: dimensions.width >= 300 && dimensions.height >= 50,
  };
}

function getAdFontSize(config: AdFormatConfig, dimensions: { width: number; height: number }): number {
  if (config.layout === "horizontal") {
    return getHorizontalAdScale(dimensions).fontSize;
  }
  if (config.layout === "vertical") {
    return Math.max(dimensions.width * config.tagline.fontSizeRatio, 12);
  }
  return Math.max(dimensions.width * config.tagline.fontSizeRatio, 14);
}

function getGradientLogoPosition(position: "left" | "right" | "center", type: string) {
  if (type === "linkedin-cover") {
    switch (position) {
      case "left": return { x: 6, y: 35, anchor: "left" as const };
      case "right": return { x: 80, y: 35, anchor: "right" as const };
      case "center": return { x: 50, y: 35, anchor: "center" as const };
    }
  }
  if (isAdFormat(type)) {
    return { x: 50, y: 40, anchor: "center" as const };
  }
  return { x: 50, y: 30, anchor: "center" as const };
}

function getTaglineLayout(position: "left" | "right" | "center", type: string) {
  if (type === "linkedin-cover") {
    switch (position) {
      case "left": return { x: 6, y: 72, align: "left" as const };
      case "right": return { x: 80, y: 72, align: "right" as const };
      case "center": return { x: 50, y: 75, align: "center" as const };
    }
  }
  if (type === "social-square" || type === "linkedin-carousel") {
    return { x: 50, y: 75, align: "center" as const };
  }
  if (type === "linkedin-sponsored") {
    return { x: 50, y: 70, align: "center" as const };
  }
  if (isAdFormat(type)) {
    return { x: 50, y: 75, align: "center" as const };
  }
  return { x: 50, y: 70, align: "center" as const };
}

function getTypeLabel(type: string): string {
  if (type === "linkedin-cover") return "LinkedIn Cover";
  if (type === "social-square") return "Social";
  if (type === "hero") return "Hero";
  if (type === "email-header") return "Email";
  if (type.startsWith("google-display")) return "Google Ads";
  if (type.startsWith("linkedin-sponsored")) return "LinkedIn Ad";
  if (type === "linkedin-carousel") return "LinkedIn Carousel";
  if (type === "linkedin-message") return "LinkedIn Message";
  return "Cover";
}

function GradientCoverPreview({
  cover,
  onDownload,
  isDownloading
}: {
  cover: GradientCoverConfig;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  const gradientCSS = buildGradientCSS(cover);
  
  const isLinkedIn = cover.type === "linkedin-cover";
  const isSquare = cover.type === "social-square" || cover.type === "linkedin-carousel";
  const isAd = isAdFormat(cover.type);
  const adConfig = isAd ? getAdFormatConfig(cover.type, cover.dimensions) : null;

  const renderAdContent = () => {
    if (!adConfig) return null;
    
    const logoWidth = getAdLogoScale(adConfig, cover.dimensions);
    const logoSrc = cover.iconOnly ? iconWhite : whiteLogo;
    const iconSize = cover.iconOnly ? '40%' : logoWidth;
    
    if (cover.iconOnly) {
      return (
        <div className="absolute flex items-center justify-center w-full h-full">
          <img 
            src={iconWhite}
            alt="Constancia Icon"
            className="drop-shadow-lg"
            style={{ width: iconSize, height: 'auto', maxWidth: '120px' }}
          />
        </div>
      );
    }
    
    if (adConfig.layout === "horizontal") {
      const scale = getHorizontalAdScale(cover.dimensions);
      const lineHeightPx = scale.fontSize * 1.2;
      return (
        <div className="absolute flex items-center justify-center w-full h-full">
          <div 
            className="flex items-center"
            style={{ gap: `${scale.gap}px`, padding: `0 ${scale.gap}px` }}
          >
            <img 
              src={logoSrc}
              alt="Constancia Logo"
              className="drop-shadow-xl"
              style={{ 
                height: `${scale.logoHeight}px`,
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
              }}
            />
            {scale.showTagline && (
              <div 
                className="flex flex-col justify-center"
                style={{ 
                  borderLeft: '1px solid rgba(255,255,255,0.3)',
                  paddingLeft: `${scale.dividerPadding}px`,
                  gap: '0px'
                }}
              >
                <span 
                  className="text-white font-medium whitespace-nowrap"
                  style={{ 
                    fontSize: `${scale.fontSize}px`,
                    lineHeight: `${lineHeightPx}px`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  {TAGLINE.line1}
                </span>
                <span 
                  className="font-medium italic whitespace-nowrap"
                  style={{ 
                    color: BRAND.cyan,
                    fontSize: `${scale.fontSize}px`,
                    lineHeight: `${lineHeightPx}px`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  {TAGLINE.line2}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (adConfig.layout === "vertical") {
      return (
        <div className="absolute flex flex-col items-center justify-center gap-4 w-full h-full p-4">
          <img 
            src={logoSrc}
            alt="Constancia Logo"
            className="drop-shadow-lg"
            style={{ width: logoWidth, height: 'auto' }}
          />
          {adConfig.tagline.show && (
            <div className="flex flex-col items-center text-center">
              <span className="text-white text-xs font-medium drop-shadow-md leading-tight">
                {TAGLINE.line1}
              </span>
              <span className="text-xs font-medium italic drop-shadow-md leading-tight" style={{ color: BRAND.cyan }}>
                {TAGLINE.line2}
              </span>
            </div>
          )}
        </div>
      );
    }
    
    if (adConfig.layout === "compact") {
      return (
        <div className="absolute flex flex-col items-center justify-center w-full h-full p-3">
          <img 
            src={logoSrc}
            alt="Constancia Logo"
            className="drop-shadow-lg"
            style={{ width: logoWidth, height: 'auto' }}
          />
        </div>
      );
    }
    
    return (
      <div className="absolute flex flex-col items-center justify-center gap-3 w-full h-full p-4">
        <img 
          src={logoSrc}
          alt="Constancia Logo"
          className="drop-shadow-lg"
          style={{ width: logoWidth, height: 'auto' }}
        />
        {adConfig.tagline.show && (
          <div className="flex flex-col items-center text-center">
            <span className="text-white text-sm font-medium drop-shadow-md">
              {TAGLINE.line1}
            </span>
            <span className="text-sm font-medium italic drop-shadow-md" style={{ color: BRAND.cyan }}>
              {TAGLINE.line2}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden group" data-testid={`card-gradient-${cover.id}`}>
      <div className="relative">
        {cover.featured && (
          <Badge className="absolute top-3 right-3 z-20 bg-amber-500 text-white border-0">
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
        <div 
          className="relative w-full overflow-hidden"
          style={{ 
            aspectRatio: `${cover.dimensions.width}/${cover.dimensions.height}`,
            background: gradientCSS,
            minHeight: adConfig?.layout === 'horizontal' ? '60px' : adConfig?.layout === 'vertical' ? '200px' : undefined,
          }}
        >
          {isAd ? renderAdContent() : isLinkedIn ? (
            <div 
              className="absolute flex items-center gap-4"
              style={{
                right: '8%',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <div className="flex flex-col items-start">
                <span 
                  className="text-white font-medium tracking-wide drop-shadow-md"
                  style={{ fontSize: '0.75rem', lineHeight: 1.5 }}
                >
                  {TAGLINE.line1}
                </span>
                <span 
                  className="font-medium tracking-wide drop-shadow-md italic"
                  style={{ 
                    fontSize: '0.75rem', 
                    lineHeight: 1.5,
                    color: BRAND.cyan,
                  }}
                >
                  {TAGLINE.line2}
                </span>
              </div>
              <div className="relative">
                <img 
                  src={whiteLogo}
                  alt="Constancia Logo"
                  className="drop-shadow-lg"
                  style={{
                    height: '55%',
                    width: 'auto',
                    maxHeight: '160px',
                    minHeight: '80px',
                  }}
                />
                <span 
                  className="absolute text-white font-medium drop-shadow-md"
                  style={{ 
                    top: '0',
                    right: '-12px',
                    fontSize: '0.5rem',
                  }}
                >
                  ®
                </span>
              </div>
            </div>
          ) : (
            <div 
              className="absolute flex flex-col items-center gap-3"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative">
                <img 
                  src={whiteLogo}
                  alt="Constancia Logo"
                  className="drop-shadow-lg"
                  style={{
                    height: isSquare ? '22%' : '28%',
                    width: 'auto',
                    maxHeight: isSquare ? '180px' : '120px',
                  }}
                />
                <span 
                  className="absolute text-white font-medium drop-shadow-md"
                  style={{ 
                    top: '0',
                    right: '-10px',
                    fontSize: '0.45rem',
                  }}
                >
                  ®
                </span>
              </div>
              <div className="flex flex-col items-center" style={{ marginTop: '8px' }}>
                <span 
                  className="font-medium tracking-wide drop-shadow-md text-center"
                  style={{ fontSize: isSquare ? '0.6rem' : '0.5rem', lineHeight: 1.4, color: '#F6F3EE' }}
                >
                  {TAGLINE.line1}
                </span>
                <span 
                  className="font-medium tracking-wide drop-shadow-md text-center"
                  style={{ fontSize: isSquare ? '0.6rem' : '0.5rem', lineHeight: 1.4, color: '#F6F3EE' }}
                >
                  {TAGLINE.line2}
                </span>
                <span 
                  className="font-medium tracking-wide drop-shadow-md italic text-center"
                  style={{ 
                    fontSize: isSquare ? '0.6rem' : '0.5rem', 
                    lineHeight: 1.4,
                    color: BRAND.cyan,
                  }}
                >
                  {TAGLINE.line3}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{cover.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{cover.description}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {cover.dimensions.width}×{cover.dimensions.height}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs gap-1">
            <Palette className="h-3 w-3" />
            Gradient
          </Badge>
          <Badge variant="outline" className="text-xs">
            {getTypeLabel(cover.type)}
          </Badge>
          {cover.adFormat && (
            <Badge className="text-xs bg-[#8E4F67] text-white border-0">
              {cover.adFormat}
            </Badge>
          )}
        </div>
        <Button 
          onClick={onDownload} 
          disabled={isDownloading}
          className="w-full mt-4"
          data-testid={`button-download-gradient-${cover.id}`}
        >
          {isDownloading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download HD
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function getOverlayStyle(overlay: AssetConfig["overlay"], logoPosition: AssetConfig["logoPosition"]): React.CSSProperties {
  if (overlay === "none") return {};
  if (overlay === "light") return { backgroundColor: "rgba(255, 255, 255, 0.2)" };
  
  const darkColor = overlay === "dark" ? "0, 0, 0" : "2, 32, 91";
  const opacity1 = overlay === "dark" ? 0.6 : 0.7;
  const opacity2 = overlay === "dark" ? 0.4 : 0.4;
  
  if (logoPosition === "left") {
    return {
      background: `linear-gradient(to right, rgba(${darkColor}, ${opacity1}), rgba(${darkColor}, ${opacity2}) 50%, transparent)`
    };
  } else if (logoPosition === "right") {
    return {
      background: `linear-gradient(to left, rgba(${darkColor}, ${opacity1}), rgba(${darkColor}, ${opacity2}) 50%, transparent)`
    };
  } else if (logoPosition === "center") {
    return { backgroundColor: `rgba(${darkColor}, ${opacity2})` };
  } else if (logoPosition === "bottom-center" || logoPosition === "bottom-left") {
    return {
      background: `linear-gradient(to top, rgba(${darkColor}, ${opacity1}), rgba(${darkColor}, ${opacity2}) 50%, transparent)`
    };
  }
  return {
    background: `linear-gradient(to right, rgba(${darkColor}, ${opacity1}), rgba(${darkColor}, ${opacity2}) 50%, transparent)`
  };
}

function getTaglineLayoutForStock(logoPosition: AssetConfig["logoPosition"], type: string) {
  if (type === "linkedin-cover") {
    if (logoPosition === "right") {
      return { x: 80, y: 72, align: "center" as const };
    }
    return { x: 80, y: 72, align: "center" as const };
  }
  if (type === "social-square") {
    return { x: 50, y: 65, align: "center" as const };
  }
  if (type === "hero") {
    return { x: 50, y: 68, align: "center" as const };
  }
  if (type === "email-header") {
    return { x: 50, y: 72, align: "center" as const };
  }
  return { x: 50, y: 68, align: "center" as const };
}

function AssetPreview({ 
  asset, 
  onDownload,
  isDownloading 
}: { 
  asset: AssetConfig;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  const layout = getStockAssetLayout(asset.logoPosition, asset.type);
  const catInfo = categoryInfo[asset.category];
  const overlayStyle = getOverlayStyle(asset.overlay, asset.logoPosition);
  
  const isLinkedIn = asset.type === "linkedin-cover";
  const isSquare = asset.type === "social-square";
  const isHero = asset.type === "hero";
  const taglineScale = isLinkedIn ? 0.85 : isSquare ? 0.9 : isHero ? 0.8 : 0.75;

  return (
    <Card className="overflow-hidden group" data-testid={`card-asset-${asset.id}`}>
      <div className="relative">
        {asset.featured && (
          <Badge className="absolute top-3 right-3 z-20 bg-amber-500 text-white border-0">
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
        <div 
          className="relative w-full overflow-hidden"
          style={{ 
            aspectRatio: `${asset.dimensions.width}/${asset.dimensions.height}`,
          }}
        >
          <img 
            src={asset.background} 
            alt={asset.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0" style={overlayStyle} />
          <img 
            src={whiteLogo}
            alt="Constancia Logo"
            className="absolute drop-shadow-lg"
            style={{
              left: `${layout.logoX}%`,
              top: `${layout.logoY}%`,
              transform: 'translate(-50%, -50%)',
              height: `${asset.logoScale * 100}%`,
              width: 'auto',
              maxWidth: '40%',
            }}
          />
          <div 
            className="absolute flex flex-col items-center text-center"
            style={{
              left: `${layout.logoX}%`,
              top: `${layout.taglineY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span 
              className="text-white font-semibold tracking-wide drop-shadow-lg whitespace-nowrap"
              style={{ 
                fontSize: `${taglineScale * 0.7}rem`, 
                lineHeight: 1.3,
                textShadow: '0 2px 4px rgba(0,0,0,0.6)'
              }}
            >
              {TAGLINE.line1}
            </span>
            <span 
              className="font-semibold tracking-wide drop-shadow-lg italic whitespace-nowrap"
              style={{ 
                fontSize: `${taglineScale * 0.7}rem`, 
                lineHeight: 1.3,
                color: BRAND.cyan,
                textShadow: '0 2px 4px rgba(0,0,0,0.6)'
              }}
            >
              {TAGLINE.line2}
            </span>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{asset.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{asset.description}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {asset.dimensions.width}×{asset.dimensions.height}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs gap-1">
            <catInfo.icon className="h-3 w-3" />
            {catInfo.label}
          </Badge>
        </div>
        <Button 
          onClick={onDownload} 
          disabled={isDownloading}
          className="w-full mt-4"
          data-testid={`button-download-${asset.id}`}
        >
          {isDownloading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download HD
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function VideoAssetPreview({ 
  video,
  onGenerate,
  isGenerating
}: { 
  video: VideoAssetConfig;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const platform = platformInfo[video.platform];
  const style = styleInfo[video.style];
  const PlatformIcon = platform.icon;
  const isPeopleStyle = video.style === "people" && video.peopleImage;
  
  const getAspectClass = () => {
    switch (video.aspectRatio) {
      case "16:9": return "aspect-video";
      case "9:16": return "aspect-[9/16]";
      case "1:1": return "aspect-square";
      default: return "aspect-video";
    }
  };

  const getPreviewGradient = () => {
    switch (video.style) {
      case "abstract":
        return "bg-gradient-to-br from-[#12161D] via-[#8E4F67] to-[#7FB8A3]";
      case "corporate":
        return "bg-gradient-to-br from-[#12161D] via-[#0a3d7a] to-[#8E4F67]";
      case "data":
        return "bg-gradient-to-br from-[#8E4F67] via-[#7FB8A3] to-[#12161D]";
      case "technology":
        return "bg-gradient-to-br from-[#7FB8A3] via-[#8E4F67] to-[#12161D]";
      case "people":
        return "";
      default:
        return "bg-gradient-to-br from-[#12161D] to-[#8E4F67]";
    }
  };

  return (
    <Card className="overflow-hidden group" data-testid={`card-video-${video.id}`}>
      <div className="relative">
        <div 
          className={`${getAspectClass()} ${getPreviewGradient()} relative overflow-hidden`}
          style={{ maxHeight: video.aspectRatio === "9:16" ? "280px" : undefined }}
        >
          {isPeopleStyle && (
            <>
              <img 
                src={video.peopleImage}
                alt={video.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#12161D]/80 via-[#12161D]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12161D]/60 via-transparent to-transparent" />
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            {!isPeopleStyle && (
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 animate-pulse">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl" />
                  <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-[#5E8D7A]/20 blur-lg" />
                  <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-white/15 blur-md" />
                </div>
              </div>
            )}
            {isPeopleStyle && (
              <div className="absolute inset-0 opacity-40">
                <div className="absolute inset-0 animate-pulse">
                  <div className="absolute top-1/4 right-1/4 w-24 h-24 rounded-full bg-[#7FB8A3]/30 blur-xl" />
                  <div className="absolute bottom-1/3 right-1/3 w-20 h-20 rounded-full bg-[#8E4F67]/40 blur-lg" />
                  <div className="absolute top-1/2 right-1/5 w-16 h-16 rounded-full bg-[#7FB8A3]/20 blur-md" />
                </div>
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <img 
                src={whiteLogo}
                alt="Constancia Logo"
                className="h-8 w-auto drop-shadow-lg"
              />
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
              <div className="text-center">
                <span className="text-white/90 text-xs font-medium tracking-wide">
                  {TAGLINE.line1}
                </span>
              </div>
            </div>
          </div>
          {video.featured && (
            <div className="absolute top-2 right-2 z-20">
              <Badge className="bg-amber-500 text-white border-0 gap-1">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            </div>
          )}
          <div className="absolute bottom-2 left-2 z-20">
            <Badge variant="secondary" className="bg-black/50 text-white border-0 gap-1">
              <Clock className="h-3 w-3" />
              {video.duration}s
            </Badge>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{video.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{video.description}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {video.aspectRatio}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`${platform.color} text-white border-0 text-xs gap-1`}>
            <PlatformIcon className="h-3 w-3" />
            {platform.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {style.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {video.dimensions.width}×{video.dimensions.height}
          </Badge>
        </div>
        <Button 
          onClick={onGenerate} 
          disabled={isGenerating}
          className="w-full gap-2"
          variant="default"
          data-testid={`button-generate-${video.id}`}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download Video
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

const marketingAssetFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["image", "video", "template"]),
  category: z.enum(["linkedin", "google", "social", "website", "email"]),
  platform: z.string().optional(),
  fileUrl: z.string().url("Must be a valid URL"),
  thumbnailUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
  tags: z.string().optional(),
  featured: z.boolean().default(false),
});

type MarketingAssetFormValues = z.infer<typeof marketingAssetFormSchema>;

function LibraryTabContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MarketingAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<MarketingAsset | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const form = useForm<MarketingAssetFormValues>({
    resolver: zodResolver(marketingAssetFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "image",
      category: "linkedin",
      platform: "",
      fileUrl: "",
      thumbnailUrl: "",
      tags: "",
      featured: false,
    },
  });

  const { data: assets = [], isLoading } = useQuery<MarketingAsset[]>({
    queryKey: ["/api/admin/marketing-assets"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MarketingAssetFormValues) => {
      return await apiRequest("POST", "/api/admin/marketing-assets", {
        name: data.name,
        description: data.description || null,
        type: data.type,
        category: data.category,
        platform: data.platform || null,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        featured: data.featured,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-assets"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Asset created", description: "Marketing asset has been added to your library." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create asset.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MarketingAssetFormValues }) => {
      return await apiRequest("PATCH", `/api/admin/marketing-assets/${id}`, {
        name: data.name,
        description: data.description || null,
        type: data.type,
        category: data.category,
        platform: data.platform || null,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        featured: data.featured,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-assets"] });
      setEditingAsset(null);
      form.reset();
      toast({ title: "Asset updated", description: "Marketing asset has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update asset.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/marketing-assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-assets"] });
      setDeletingAsset(null);
      toast({ title: "Asset deleted", description: "Marketing asset has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete asset.", variant: "destructive" });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/marketing-assets/${id}/toggle-featured`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-assets"] });
    },
  });

  const openEditDialog = (asset: MarketingAsset) => {
    form.reset({
      name: asset.name,
      description: asset.description || "",
      type: asset.type,
      category: asset.category,
      platform: asset.platform || "",
      fileUrl: asset.fileUrl,
      thumbnailUrl: asset.thumbnailUrl || "",
      tags: asset.tags.join(", "),
      featured: asset.featured,
    });
    setEditingAsset(asset);
  };

  const onSubmit = (data: MarketingAssetFormValues) => {
    if (editingAsset) {
      updateMutation.mutate({ id: editingAsset.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    if (filterCategory !== "all" && asset.category !== filterCategory) return false;
    if (filterType !== "all" && asset.type !== filterType) return false;
    return true;
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    linkedin: <Linkedin className="h-4 w-4" />,
    google: <Chrome className="h-4 w-4" />,
    social: <Instagram className="h-4 w-4" />,
    website: <Globe className="h-4 w-4" />,
    email: <ImageIcon className="h-4 w-4" />,
  };

  const typeIcons: Record<string, React.ReactNode> = {
    image: <ImageIcon className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    template: <LayoutGrid className="h-4 w-4" />,
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-[#12161D] via-[#8E4F67] to-[#7FB8A3] text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/10">
                <FolderOpen className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">Asset Library</h2>
                <p className="text-white/80 text-sm">
                  Manage your uploaded marketing assets. Add, edit, or remove images, videos, and templates.
                </p>
              </div>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2" data-testid="button-add-asset">
                  <Plus className="h-4 w-4" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Asset</DialogTitle>
                  <DialogDescription>
                    Add a marketing asset to your library. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Asset name" data-testid="input-asset-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Brief description" data-testid="input-asset-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-asset-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="template">Template</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-asset-category">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="google">Google Ads</SelectItem>
                                <SelectItem value="social">Social Media</SelectItem>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="fileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>File URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-asset-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="brand, hero, gradient" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-featured" />
                          </FormControl>
                          <FormLabel className="!mt-0">Featured asset</FormLabel>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); form.reset(); }}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-asset">
                        {createMutation.isPending ? "Saving..." : "Save Asset"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Category:</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Type:</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="template">Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {filteredAssets.length} assets
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2 w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No assets found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {assets.length === 0 
                ? "Your library is empty. Add your first marketing asset to get started."
                : "No assets match your current filters."}
            </p>
            {assets.length === 0 && (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group" data-testid={`card-asset-${asset.id}`}>
              <div className="aspect-video bg-muted relative">
                {asset.thumbnailUrl || asset.fileUrl ? (
                  <img
                    src={asset.thumbnailUrl || asset.fileUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12161D] to-[#8E4F67]">
                    {typeIcons[asset.type] || <ImageIcon className="h-8 w-8 text-white/50" />}
                  </div>
                )}
                {asset.featured && (
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0 gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" onClick={() => openEditDialog(asset)} data-testid={`button-edit-${asset.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => setDeletingAsset(asset)} data-testid={`button-delete-${asset.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" asChild>
                    <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium truncate">{asset.name}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => toggleFeaturedMutation.mutate(asset.id)}
                  >
                    <Star className={`h-4 w-4 ${asset.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                  </Button>
                </div>
                {asset.description && (
                  <p className="text-sm text-muted-foreground truncate mb-2">{asset.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs gap-1">
                    {categoryIcons[asset.category]}
                    {asset.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    {typeIcons[asset.type]}
                    {asset.type}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the details of this marketing asset.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="template">Template</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="google">Google Ads</SelectItem>
                          <SelectItem value="social">Social Media</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Featured asset</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setEditingAsset(null); form.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAsset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAsset && deleteMutation.mutate(deletingAsset.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MarketingAssetsContent() {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingVideoId, setGeneratingVideoId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");

  const downloadVideo = useCallback(async (video: VideoAssetConfig) => {
    setGeneratingVideoId(video.id);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.dimensions.width;
      canvas.height = video.dimensions.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = reject;
        logoImg.src = whiteLogo;
      });

      const isPeopleStyle = video.style === "people" && video.peopleImage;
      let peopleImg: HTMLImageElement | null = null;
      
      if (isPeopleStyle && video.peopleImage) {
        peopleImg = new Image();
        peopleImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          peopleImg!.onload = () => resolve();
          peopleImg!.onerror = reject;
          peopleImg!.src = video.peopleImage!;
        });
      }

      const getGradientColors = () => {
        switch (video.style) {
          case "abstract":
            return [BRAND.navy, BRAND.teal, BRAND.cyan];
          case "corporate":
            return [BRAND.navy, "#0a3d7a", BRAND.teal];
          case "data":
            return [BRAND.teal, BRAND.cyan, BRAND.navy];
          case "technology":
            return [BRAND.cyan, BRAND.teal, BRAND.navy];
          case "people":
            return [BRAND.navy, BRAND.teal, BRAND.cyan];
          default:
            return [BRAND.navy, BRAND.teal, BRAND.cyan];
        }
      };

      interface Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        opacity: number;
      }

      interface Orb {
        x: number;
        y: number;
        radius: number;
        baseColor: string;
        glowColor: string;
        floatOffset: number;
        floatSpeed: number;
        pulseOffset: number;
      }

      interface Hexagon {
        x: number;
        y: number;
        size: number;
        rotation: number;
        rotationSpeed: number;
        opacity: number;
        pulseOffset: number;
      }

      interface DataStream {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        thickness: number;
        progress: number;
        speed: number;
      }

      const particles: Particle[] = [];
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2 + Math.random() * 6,
          speedX: (Math.random() - 0.5) * 1.5,
          speedY: (Math.random() - 0.5) * 1.5,
          opacity: 0.3 + Math.random() * 0.7
        });
      }

      const orbs: Orb[] = [
        { x: canvas.width * 0.15, y: canvas.height * 0.25, radius: canvas.width * 0.08, baseColor: BRAND.cyan, glowColor: '#ffffff', floatOffset: 0, floatSpeed: 0.02, pulseOffset: 0 },
        { x: canvas.width * 0.85, y: canvas.height * 0.35, radius: canvas.width * 0.06, baseColor: BRAND.teal, glowColor: BRAND.cyan, floatOffset: Math.PI / 2, floatSpeed: 0.025, pulseOffset: Math.PI / 3 },
        { x: canvas.width * 0.1, y: canvas.height * 0.75, radius: canvas.width * 0.05, baseColor: BRAND.teal, glowColor: '#ffffff', floatOffset: Math.PI, floatSpeed: 0.018, pulseOffset: Math.PI / 2 },
        { x: canvas.width * 0.9, y: canvas.height * 0.7, radius: canvas.width * 0.07, baseColor: BRAND.navy, glowColor: BRAND.cyan, floatOffset: Math.PI * 1.5, floatSpeed: 0.022, pulseOffset: Math.PI }
      ];

      const hexagons: Hexagon[] = [];
      for (let i = 0; i < 8; i++) {
        hexagons.push({
          x: canvas.width * 0.15 + Math.random() * canvas.width * 0.7,
          y: canvas.height * 0.1 + Math.random() * canvas.height * 0.35,
          size: 25 + Math.random() * 50,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          opacity: 0.2 + Math.random() * 0.3,
          pulseOffset: Math.random() * Math.PI * 2
        });
      }

      const dataStreams: DataStream[] = [];
      for (let i = 0; i < 10; i++) {
        dataStreams.push({
          startX: Math.random() * canvas.width * 0.3,
          startY: Math.random() * canvas.height,
          endX: canvas.width * 0.7 + Math.random() * canvas.width * 0.3,
          endY: Math.random() * canvas.height,
          thickness: 2 + Math.random() * 3,
          progress: Math.random(),
          speed: 0.005 + Math.random() * 0.01
        });
      }

      const draw3DOrb = (orb: Orb, time: number) => {
        const floatY = Math.sin(time * orb.floatSpeed + orb.floatOffset) * 10;
        const pulse = 1 + Math.sin(time * 0.03 + orb.pulseOffset) * 0.1;
        const currentRadius = orb.radius * pulse;
        const y = orb.y + floatY;
        
        const orbGradient = ctx.createRadialGradient(
          orb.x - currentRadius * 0.3, y - currentRadius * 0.3, 0,
          orb.x, y, currentRadius
        );
        orbGradient.addColorStop(0, orb.glowColor);
        orbGradient.addColorStop(0.4, orb.baseColor);
        orbGradient.addColorStop(0.8, `${orb.baseColor}88`);
        orbGradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(orb.x, y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = orbGradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(orb.x - currentRadius * 0.25, y - currentRadius * 0.25, currentRadius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      };

      const drawDataStream = (stream: DataStream, time: number) => {
        const progress = (stream.progress + time * stream.speed) % 1;
        const streamLength = 0.3;
        
        const streamGradient = ctx.createLinearGradient(stream.startX, stream.startY, stream.endX, stream.endY);
        
        const startFade = Math.max(0, progress - streamLength);
        const endFade = Math.min(1, progress + streamLength);
        
        streamGradient.addColorStop(0, 'transparent');
        if (startFade > 0) streamGradient.addColorStop(startFade, 'transparent');
        streamGradient.addColorStop(Math.max(0.01, progress - streamLength * 0.5), `${BRAND.cyan}20`);
        streamGradient.addColorStop(progress, `${BRAND.cyan}90`);
        streamGradient.addColorStop(Math.min(0.99, progress + streamLength * 0.5), `${BRAND.cyan}20`);
        if (endFade < 1) streamGradient.addColorStop(endFade, 'transparent');
        streamGradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.moveTo(stream.startX, stream.startY);
        
        const midX = (stream.startX + stream.endX) / 2;
        const midY = (stream.startY + stream.endY) / 2;
        const curveOffset = Math.sin(time * 0.01 + stream.startX) * 30;
        
        ctx.quadraticCurveTo(midX, midY + curveOffset, stream.endX, stream.endY);
        ctx.strokeStyle = streamGradient;
        ctx.lineWidth = stream.thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
      };

      const drawHexagon = (hex: Hexagon, time: number) => {
        const currentRotation = hex.rotation + time * hex.rotationSpeed;
        const pulse = 1 + Math.sin(time * 0.02 + hex.pulseOffset) * 0.15;
        const currentOpacity = hex.opacity * (0.8 + Math.sin(time * 0.015 + hex.pulseOffset) * 0.2);
        
        ctx.save();
        ctx.translate(hex.x, hex.y);
        ctx.rotate(currentRotation);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const x = Math.cos(angle) * hex.size * pulse;
          const y = Math.sin(angle) * hex.size * pulse;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        ctx.strokeStyle = `rgba(18, 235, 252, ${currentOpacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = `rgba(18, 235, 252, ${currentOpacity * 0.1})`;
        ctx.fill();
        
        ctx.restore();
      };

      const drawParticle = (particle: Particle, time: number) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        const twinkle = 0.5 + Math.sin(time * 0.05 + particle.x) * 0.5;
        const size = particle.size * (0.8 + twinkle * 0.4);
        
        const particleGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size);
        particleGrad.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity * twinkle})`);
        particleGrad.addColorStop(0.5, `rgba(18, 235, 252, ${particle.opacity * twinkle * 0.6})`);
        particleGrad.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = particleGrad;
        ctx.fill();
      };

      const drawFrame = (time: number) => {
        if (isPeopleStyle && peopleImg) {
          const imgRatio = peopleImg.width / peopleImg.height;
          const canvasRatio = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (imgRatio > canvasRatio) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * imgRatio;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          }
          
          ctx.drawImage(peopleImg, drawX, drawY, drawWidth, drawHeight);
          
          const overlayLeft = ctx.createLinearGradient(0, 0, canvas.width * 0.6, 0);
          overlayLeft.addColorStop(0, `${BRAND.navy}E6`);
          overlayLeft.addColorStop(0.5, `${BRAND.navy}99`);
          overlayLeft.addColorStop(1, 'transparent');
          ctx.fillStyle = overlayLeft;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const overlayBottom = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
          overlayBottom.addColorStop(0, 'transparent');
          overlayBottom.addColorStop(1, `${BRAND.navy}CC`);
          ctx.fillStyle = overlayBottom;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const pulseIntensity = 0.1 + Math.sin(time * 0.02) * 0.05;
          const cyanOverlay = ctx.createRadialGradient(
            canvas.width * 0.8, canvas.height * 0.3, 0,
            canvas.width * 0.8, canvas.height * 0.3, canvas.width * 0.4
          );
          cyanOverlay.addColorStop(0, `${BRAND.cyan}${Math.round(pulseIntensity * 255).toString(16).padStart(2, '0')}`);
          cyanOverlay.addColorStop(1, 'transparent');
          ctx.fillStyle = cyanOverlay;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          const colors = getGradientColors();
          const gradientShift = Math.sin(time * 0.005) * 0.1;
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0 + gradientShift, colors[0]);
          gradient.addColorStop(0.5, colors[1]);
          gradient.addColorStop(1 - gradientShift, colors[2]);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (!isPeopleStyle) {
          dataStreams.forEach(stream => drawDataStream(stream, time));
          orbs.forEach(orb => draw3DOrb(orb, time));
        }
        
        hexagons.forEach(hex => drawHexagon(hex, time));
        particles.forEach(particle => drawParticle(particle, time));

        const waveOffset = time * 0.02;
        const waveGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
        waveGradient.addColorStop(0, 'transparent');
        waveGradient.addColorStop(1, `${BRAND.navy}50`);
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 5) {
          const y = canvas.height * 0.85 + Math.sin(x * 0.01 + waveOffset) * 25 + Math.sin(x * 0.02 - waveOffset * 0.5) * 12;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fillStyle = waveGradient;
        ctx.fill();

        const logoScale = 1 + Math.sin(time * 0.01) * 0.02;
        const logoHeight = canvas.height * 0.12 * logoScale;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = canvas.height * 0.35;

        ctx.shadowColor = `rgba(18, 235, 252, ${0.4 + Math.sin(time * 0.02) * 0.2})`;
        ctx.shadowBlur = 30 + Math.sin(time * 0.015) * 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        ctx.shadowColor = 'transparent';

        const fontSize = Math.min(canvas.width * 0.025, 32);
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line1, canvas.width / 2, canvas.height * 0.6);
        
        ctx.shadowColor = `rgba(18, 235, 252, ${0.4 + Math.sin(time * 0.02) * 0.3})`;
        ctx.shadowBlur = 10 + Math.sin(time * 0.02) * 5;
        ctx.fillStyle = BRAND.cyan;
        ctx.font = `italic 600 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line2, canvas.width / 2, canvas.height * 0.6 + fontSize * 1.4);

        ctx.shadowColor = 'transparent';
      };

      toast({
        title: "Generating Video",
        description: `Creating ${video.duration}s animated video... This may take a moment.`,
      });

      const fps = 30;
      const totalFrames = video.duration * fps;
      const chunks: Blob[] = [];
      
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };
      });
      
      mediaRecorder.start();
      
      let frame = 0;
      const renderFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }
        
        drawFrame(frame);
        frame++;
        requestAnimationFrame(renderFrame);
      };
      
      renderFrame();
      
      const videoBlob = await recordingPromise;
      
      const link = document.createElement('a');
      link.download = `Constancia-${video.platform}-${video.style}-${video.duration}s-${Date.now()}.webm`;
      link.href = URL.createObjectURL(videoBlob);
      link.click();
      
      URL.revokeObjectURL(link.href);

      toast({
        title: "Video Downloaded",
        description: `${video.name} (${video.duration}s) has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingVideoId(null);
    }
  }, [toast]);

  const downloadGradientCover = useCallback(async (cover: GradientCoverConfig) => {
    setDownloadingId(cover.id);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = cover.dimensions.width;
      canvas.height = cover.dimensions.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const angleRad = (cover.gradientAngle - 90) * Math.PI / 180;
      const x1 = canvas.width / 2 - Math.cos(angleRad) * canvas.width;
      const y1 = canvas.height / 2 - Math.sin(angleRad) * canvas.height;
      const x2 = canvas.width / 2 + Math.cos(angleRad) * canvas.width;
      const y2 = canvas.height / 2 + Math.sin(angleRad) * canvas.height;
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      cover.colorStops.forEach(stop => {
        gradient.addColorStop(stop.position / 100, stop.color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = reject;
        logoImg.src = cover.iconOnly ? iconWhite : whiteLogo;
      });

      const isLinkedIn = cover.type === "linkedin-cover";
      const isSquare = cover.type === "social-square" || cover.type === "linkedin-carousel";
      const isAd = isAdFormat(cover.type);
      const adConfig = isAd ? getAdFormatConfig(cover.type, cover.dimensions) : null;
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      if (cover.iconOnly && isAd) {
        const iconSize = Math.min(canvas.width, canvas.height) * 0.5;
        const iconX = (canvas.width - iconSize) / 2;
        const iconY = (canvas.height - iconSize) / 2;
        
        ctx.drawImage(logoImg, iconX, iconY, iconSize, iconSize);
      } else if (isAd && adConfig) {
        const logoWidth = canvas.width * adConfig.logo.widthPercent;
        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
        
        if (adConfig.layout === "horizontal") {
          const scale = getHorizontalAdScale(cover.dimensions);
          const scaledLogoHeight = scale.logoHeight;
          const scaledLogoWidth = (logoImg.width / logoImg.height) * scaledLogoHeight;
          const fontSize = scale.fontSize;
          const lineHeight = fontSize * 1.2;
          const gap = scale.gap;
          const dividerPadding = scale.dividerPadding;
          
          ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
          const line1Width = ctx.measureText(TAGLINE.line1).width;
          const line2Width = ctx.measureText(TAGLINE.line2).width;
          const maxTextWidth = Math.max(line1Width, line2Width);
          
          const dividerWidth = 1;
          const totalWidth = scale.showTagline 
            ? scaledLogoWidth + gap + dividerWidth + dividerPadding + maxTextWidth
            : scaledLogoWidth;
          
          const startX = (canvas.width - totalWidth) / 2;
          const logoY = (canvas.height - scaledLogoHeight) / 2;
          
          ctx.drawImage(logoImg, startX, logoY, scaledLogoWidth, scaledLogoHeight);
          
          if (scale.showTagline) {
            const dividerX = startX + scaledLogoWidth + gap;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dividerX, canvas.height * 0.25);
            ctx.lineTo(dividerX, canvas.height * 0.75);
            ctx.stroke();
            
            const textX = dividerX + dividerPadding;
            ctx.textAlign = 'left';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 2;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line1, textX, canvas.height / 2 - lineHeight * 0.1);
            
            ctx.fillStyle = BRAND.cyan;
            ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line2, textX, canvas.height / 2 + lineHeight * 0.9);
          }
        } else if (adConfig.layout === "vertical") {
          const logoX = (canvas.width - logoWidth) / 2;
          const logoY = canvas.height * 0.25 - logoHeight / 2;
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          
          if (adConfig.tagline.show) {
            const fontSize = getAdFontSize(adConfig, cover.dimensions);
            const lineHeight = fontSize * 1.6;
            const taglineY = canvas.height * 0.55;
            
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 6;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line1, canvas.width / 2, taglineY);
            
            ctx.fillStyle = BRAND.cyan;
            ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line2, canvas.width / 2, taglineY + lineHeight);
          }
        } else if (adConfig.layout === "compact") {
          const logoX = (canvas.width - logoWidth) / 2;
          const logoY = (canvas.height - logoHeight) / 2;
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        } else {
          const logoX = (canvas.width - logoWidth) / 2;
          const logoY = canvas.height * 0.35 - logoHeight / 2;
          
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
          
          if (adConfig.tagline.show) {
            const fontSize = getAdFontSize(adConfig, cover.dimensions);
            const lineHeight = fontSize * 1.5;
            const taglineY = canvas.height * 0.62;
            
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 6;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line1, canvas.width / 2, taglineY);
            
            ctx.fillStyle = BRAND.cyan;
            ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.fillText(TAGLINE.line2, canvas.width / 2, taglineY + lineHeight);
          }
        }
      } else if (isLinkedIn) {
        // LinkedIn layout: Tagline on left, Logo on right (matching email signature style)
        const marginRight = canvas.width * 0.08;
        const logoHeight = canvas.height * 0.45;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        const logoX = canvas.width - marginRight - logoWidth;
        const logoY = (canvas.height - logoHeight) / 2;
        
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        
        // Add ® symbol
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `500 ${logoHeight * 0.12}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('®', logoX + logoWidth + 4, logoY + logoHeight * 0.15);
        
        // Tagline to the left of logo
        const fontSize = 26;
        const lineHeight = fontSize * 1.5;
        const taglineX = logoX - 40;
        const taglineY = canvas.height / 2;
        
        ctx.textAlign = 'right';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line1, taglineX, taglineY - lineHeight * 0.3);
        
        ctx.fillStyle = BRAND.cyan;
        ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line2, taglineX, taglineY + lineHeight * 0.7);
      } else {
        // Centered layout for squares, hero, email
        const logoHeight = canvas.height * (isSquare ? 0.22 : 0.25);
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = canvas.height * 0.3 - logoHeight / 2;
        
        ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        
        // Add ® symbol
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `500 ${logoHeight * 0.1}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText('®', logoX + logoWidth + 4, logoY + logoHeight * 0.12);
        
        // Tagline below logo
        const fontSize = isSquare ? 32 : 24;
        const lineHeight = fontSize * 1.5;
        const taglineY = canvas.height * 0.65;
        
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 6;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line1, canvas.width / 2, taglineY);
        
        ctx.fillStyle = BRAND.cyan;
        ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(TAGLINE.line2, canvas.width / 2, taglineY + lineHeight);
      }
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      const link = document.createElement('a');
      link.download = `Constancia-gradient-${cover.type}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: "Download Complete",
        description: `${cover.name} has been downloaded in HD quality.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

  const downloadTeamsBackground = useCallback(async (bg: TeamsBackgroundConfig) => {
    setDownloadingId(bg.id);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = reject;
        bgImg.src = bg.imagePath;
      });

      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = reject;
        logoImg.src = whiteLogo;
      });

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      const marginRight = 60;
      const marginBottom = 40;
      const fontSize = 20;
      const lineHeight = fontSize * 1.3;
      const logoHeight = 90;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      
      // Calculate total height of branding block (logo + gap + 3 lines of tagline)
      const gap = 16;
      const taglineBlockHeight = lineHeight * 3;
      const totalBrandingHeight = logoHeight + gap + taglineBlockHeight;
      
      // Position branding block in bottom-right corner
      const brandingBottom = canvas.height - marginBottom;
      const brandingRight = canvas.width - marginRight;
      
      // Centre the logo above the tagline - calculate centre point of tagline width
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      const taglineWidth = Math.max(
        ctx.measureText(TAGLINE.line1).width,
        ctx.measureText(TAGLINE.line2).width,
        ctx.measureText(TAGLINE.line3).width
      );
      const taglineCentreX = brandingRight - taglineWidth / 2;
      
      // Draw logo centred above tagline
      const logoX = taglineCentreX - logoWidth / 2;
      const logoY = brandingBottom - totalBrandingHeight;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

      // Draw ® at top-right of logo
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `500 ${logoHeight * 0.14}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('®', logoX + logoWidth + 5, logoY + logoHeight * 0.2);

      // Draw tagline centred below logo
      const taglineStartY = logoY + logoHeight + gap + fontSize;
      
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      
      ctx.fillStyle = '#F6F3EE';
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(TAGLINE.line1, taglineCentreX, taglineStartY);
      ctx.fillText(TAGLINE.line2, taglineCentreX, taglineStartY + lineHeight);
      
      ctx.fillStyle = BRAND.cyan;
      ctx.font = `italic 500 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(TAGLINE.line3, taglineCentreX, taglineStartY + lineHeight * 2);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Constancia-Teams-${bg.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Download Complete",
        description: `${bg.name} background downloaded with branding.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

  const downloadAsset = useCallback(async (asset: AssetConfig) => {
    setDownloadingId(asset.id);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = asset.dimensions.width;
      canvas.height = asset.dimensions.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas not supported');
      }

      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = reject;
        bgImg.src = asset.background;
      });

      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      if (asset.overlay !== "none") {
        const darkColor = asset.overlay === "dark" ? [0, 0, 0] : [2, 32, 91];
        const opacity1 = asset.overlay === "dark" ? 0.6 : 0.7;
        const opacity2 = asset.overlay === "dark" ? 0.4 : 0.4;
        
        if (asset.logoPosition === "left") {
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
          gradient.addColorStop(0, `rgba(${darkColor.join(',')}, ${opacity1})`);
          gradient.addColorStop(0.5, `rgba(${darkColor.join(',')}, ${opacity2})`);
          gradient.addColorStop(1, `rgba(${darkColor.join(',')}, 0)`);
          ctx.fillStyle = gradient;
        } else if (asset.logoPosition === "right") {
          const gradient = ctx.createLinearGradient(canvas.width, 0, 0, 0);
          gradient.addColorStop(0, `rgba(${darkColor.join(',')}, ${opacity1})`);
          gradient.addColorStop(0.5, `rgba(${darkColor.join(',')}, ${opacity2})`);
          gradient.addColorStop(1, `rgba(${darkColor.join(',')}, 0)`);
          ctx.fillStyle = gradient;
        } else if (asset.logoPosition === "center") {
          ctx.fillStyle = `rgba(${darkColor.join(',')}, ${opacity2})`;
        } else if (asset.logoPosition === "bottom-center" || asset.logoPosition === "bottom-left") {
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, `rgba(${darkColor.join(',')}, ${opacity1})`);
          gradient.addColorStop(0.5, `rgba(${darkColor.join(',')}, ${opacity2})`);
          gradient.addColorStop(1, `rgba(${darkColor.join(',')}, 0)`);
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = `rgba(${darkColor.join(',')}, ${opacity2})`;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = reject;
        logoImg.src = whiteLogo;
      });

      const position = getLogoPosition(asset.logoPosition, asset.dimensions, asset.type);
      const logoHeight = canvas.height * asset.logoScale;
      const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
      const logoX = (position.x / 100) * canvas.width - logoWidth / 2;
      const logoY = (position.y / 100) * canvas.height - logoHeight / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      const isLinkedIn = asset.type === "linkedin-cover";
      const isSquare = asset.type === "social-square";
      const isHero = asset.type === "hero";
      const fontScale = isLinkedIn ? 28 : isSquare ? 32 : isHero ? 26 : 24;
      const lineHeight = fontScale * 1.4;
      
      const taglineY = logoY + logoHeight + (canvas.height * 0.04);
      const taglineX = (position.x / 100) * canvas.width;
      
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 ${fontScale}px Inter, system-ui, sans-serif`;
      ctx.fillText(TAGLINE.line1, taglineX, taglineY);
      
      ctx.fillStyle = BRAND.cyan;
      ctx.font = `italic 600 ${fontScale}px Inter, system-ui, sans-serif`;
      ctx.fillText(TAGLINE.line2, taglineX, taglineY + lineHeight);

      const link = document.createElement('a');
      link.download = `Constancia-${asset.type}-${asset.category}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: "Download Complete",
        description: `${asset.name} has been downloaded in HD quality.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

  const linkedInAssets = assets.filter(a => a.type === "linkedin-cover");
  const socialAssets = assets.filter(a => a.type === "social-square");
  const heroAssets = assets.filter(a => a.type === "hero");
  const emailAssets = assets.filter(a => a.type === "email-header");

  const filterByCategory = (items: AssetConfig[]) => 
    selectedCategory === "all" ? items : items.filter(a => a.category === selectedCategory);

  const featuredAssets = assets.filter(a => a.featured);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Marketing Assets</h1>
        <p className="text-muted-foreground mt-1">
          Professional branded images for LinkedIn, social media, website, and email campaigns
        </p>
      </div>

      <Card className="bg-gradient-to-r from-[#12161D] to-[#8E4F67] text-white">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Premium Quality Assets</h2>
              <p className="text-white/80 text-sm">
                All images are generated at full resolution with professional stock photography and Constancia branding
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
          data-testid="filter-all"
        >
          All Categories
        </Button>
        {Object.entries(categoryInfo).map(([key, info]) => (
          <Button
            key={key}
            variant={selectedCategory === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(key as AssetCategory)}
            className="gap-1"
            data-testid={`filter-${key}`}
          >
            <info.icon className="h-3 w-3" />
            {info.label}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="gradient" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="gradient" className="gap-2" data-testid="tab-gradient">
            <Palette className="h-4 w-4" />
            Gradient Covers
          </TabsTrigger>
          <TabsTrigger value="google-ads" className="gap-2" data-testid="tab-google-ads">
            <Chrome className="h-4 w-4" />
            Google Ads
          </TabsTrigger>
          <TabsTrigger value="linkedin-ads" className="gap-2" data-testid="tab-linkedin-ads">
            <Megaphone className="h-4 w-4" />
            LinkedIn Ads
          </TabsTrigger>
          <TabsTrigger value="featured" className="gap-2">
            <Star className="h-4 w-4" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn (Stock)
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Instagram className="h-4 w-4" />
            Social Media
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-2">
            <Globe className="h-4 w-4" />
            Website
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-2" data-testid="tab-videos">
            <Video className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="virtual-backgrounds" className="gap-2" data-testid="tab-virtual-backgrounds">
            <Video className="h-4 w-4" />
            Teams/Zoom
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2" data-testid="tab-library">
            <FolderOpen className="h-4 w-4" />
            Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gradient" className="space-y-6">
          <Card className="bg-gradient-to-r from-[#12161D] via-[#8E4F67] to-[#7FB8A3] text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Palette className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Minimalist Gradient Covers</h2>
                  <p className="text-white/80 text-sm">
                    Clean, professional gradient designs with your tagline. Perfect for a modern, sophisticated brand presence.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
              LinkedIn Covers
            </h3>
            <div className="grid gap-6">
              {gradientCovers.filter(c => c.type === "linkedin-cover").map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Social Media Squares
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {gradientCovers.filter(c => c.type === "social-square").map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-foreground" />
              Website & Email
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {gradientCovers.filter(c => c.type === "hero" || c.type === "email-header").map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-brand-navy/10">
                  <Palette className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Your Brand Tagline</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    All covers include your professional tagline (matching footer format):
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">{TAGLINE.line1}</p>
                    <p className="font-medium text-foreground">{TAGLINE.line2}</p>
                    <p className="font-medium italic" style={{ color: BRAND.cyan }}>{TAGLINE.line3}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google-ads" className="space-y-6">
          <Card className="bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Chrome className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Google Display Ads</h2>
                  <p className="text-white/90 text-sm">
                    Professional ad creatives optimized for Google Display Network campaigns. All standard IAB sizes included.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[#4285F4]" />
              Standard Display Sizes
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {gradientCovers.filter(c => c.type.startsWith("google-display")).map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-[#4285F4]/10">
                  <Chrome className="h-6 w-6 text-[#4285F4]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Google Display Network Guidelines</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    These templates follow Google's recommended ad sizes for maximum reach:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>300×250</strong> - Medium Rectangle (Most common)</li>
                    <li>• <strong>728×90</strong> - Leaderboard (Top of page)</li>
                    <li>• <strong>160×600</strong> - Wide Skyscraper (Sidebar)</li>
                    <li>• <strong>320×50</strong> - Mobile Banner</li>
                    <li>• <strong>336×280</strong> - Large Rectangle</li>
                    <li>• <strong>300×600</strong> - Half Page (High impact)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linkedin-ads" className="space-y-6">
          <Card className="bg-gradient-to-r from-[#0077B5] to-[#7FB8A3] text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Megaphone className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">LinkedIn Advertising</h2>
                  <p className="text-white/90 text-sm">
                    High-performance ad creatives for LinkedIn campaigns. Optimized for sponsored content, carousel ads, and InMail.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
              LinkedIn Ad Formats
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {gradientCovers.filter(c => c.type.startsWith("linkedin-sponsored") || c.type === "linkedin-carousel" || c.type === "linkedin-message").map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-[#0077B5]/10">
                  <Linkedin className="h-6 w-6 text-[#0077B5]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">LinkedIn Ad Specifications</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Optimized sizes for LinkedIn's advertising platform:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>1200×627</strong> - Sponsored Content (Single image feed ad)</li>
                    <li>• <strong>1080×1080</strong> - Carousel Ads (Square format for carousel cards)</li>
                    <li>• <strong>300×250</strong> - Message Ads (Sponsored InMail banner)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    Recommended file size: Under 5MB. File types: JPG or PNG.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filterByCategory(featuredAssets).map((asset) => (
              <AssetPreview
                key={asset.id}
                asset={asset}
                onDownload={() => downloadAsset(asset)}
                isDownloading={downloadingId === asset.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-6">
          <div className="grid gap-6">
            {filterByCategory(linkedInAssets).map((asset) => (
              <AssetPreview
                key={asset.id}
                asset={asset}
                onDownload={() => downloadAsset(asset)}
                isDownloading={downloadingId === asset.id}
              />
            ))}
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-[#0077B5]/10">
                  <Linkedin className="h-6 w-6 text-[#0077B5]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">LinkedIn Cover Image Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Recommended size: 1584 × 396 pixels. The left side of your cover may be partially 
                    obscured by your profile photo on desktop. These templates position the logo to avoid overlap.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filterByCategory(socialAssets).map((asset) => (
              <AssetPreview
                key={asset.id}
                asset={asset}
                onDownload={() => downloadAsset(asset)}
                isDownloading={downloadingId === asset.id}
              />
            ))}
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                  <Instagram className="h-6 w-6 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Social Media Post Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Square format (1080 × 1080) works perfectly for Instagram feeds, Facebook posts, 
                    and LinkedIn image posts. High resolution ensures crisp display on all devices.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="website" className="space-y-6">
          <div className="grid gap-6">
            {filterByCategory(heroAssets).map((asset) => (
              <AssetPreview
                key={asset.id}
                asset={asset}
                onDownload={() => downloadAsset(asset)}
                isDownloading={downloadingId === asset.id}
              />
            ))}
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-brand-navy/10">
                  <Globe className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Website Hero Banner Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Hero banners are sized at 1920 × 600 pixels for optimal display on desktop screens.
                    They work well for landing pages, about sections, and service pages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {filterByCategory(emailAssets).map((asset) => (
              <AssetPreview
                key={asset.id}
                asset={asset}
                onDownload={() => downloadAsset(asset)}
                isDownloading={downloadingId === asset.id}
              />
            ))}
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <ImageIcon className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Email Header Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Email headers are sized at 600 × 200 pixels to ensure compatibility with most email 
                    clients. Keep file sizes reasonable for faster email loading.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <Card className="bg-gradient-to-r from-[#12161D] via-[#8E4F67] to-[#7FB8A3] text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Video className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Video & Animation Assets</h2>
                  <p className="text-white/80 text-sm">
                    Professional branded videos for advertising, social media, and website use. 
                    Generate high-quality animations with abstract data visuals and your brand identity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-[#0077B5]" />
              LinkedIn Videos
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videoAssets.filter(v => v.platform === "linkedin").map((video) => (
                <VideoAssetPreview
                  key={video.id}
                  video={video}
                  onGenerate={() => downloadVideo(video)}
                  isGenerating={generatingVideoId === video.id}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Chrome className="h-5 w-5 text-red-500" />
              Google Ads Videos
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videoAssets.filter(v => v.platform === "google").map((video) => (
                <VideoAssetPreview
                  key={video.id}
                  video={video}
                  onGenerate={() => downloadVideo(video)}
                  isGenerating={generatingVideoId === video.id}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Social Media Videos
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videoAssets.filter(v => v.platform === "instagram").map((video) => (
                <VideoAssetPreview
                  key={video.id}
                  video={video}
                  onGenerate={() => downloadVideo(video)}
                  isGenerating={generatingVideoId === video.id}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-foreground" />
              Website Videos
            </h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videoAssets.filter(v => v.platform === "website").map((video) => (
                <VideoAssetPreview
                  key={video.id}
                  video={video}
                  onGenerate={() => downloadVideo(video)}
                  isGenerating={generatingVideoId === video.id}
                />
              ))}
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-brand-navy/10">
                  <Video className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Video Generation Guidelines</h3>
                  <p className="text-sm text-muted-foreground">
                    Videos are generated using AI with abstract data flows, gradient animations, and professional 
                    branding. Each video includes smooth transitions, your logo, and tagline overlays. 
                    Generation takes approximately 1-2 minutes per video.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="virtual-backgrounds" className="space-y-6">
          <Card className="bg-gradient-to-r from-[#12161D] via-[#8E4F67] to-[#7FB8A3] text-white">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">
                  <Video className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">Virtual Meeting Backgrounds</h2>
                  <p className="text-white/80 text-sm">
                    Professional branded backgrounds for Microsoft Teams and Zoom meetings. 1920×1080 UHD resolution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-cyan" />
              AI-Generated Branded Backgrounds
              <Badge variant="secondary" className="ml-2">1920×1080 UHD</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Professional backgrounds with Constancia branding and tagline positioned to avoid video feed overlap.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamsBackgrounds.map((bg) => (
                <Card key={bg.id} className="overflow-hidden hover-elevate">
                  <div className="aspect-video relative">
                    <img 
                      src={bg.imagePath} 
                      alt={bg.name}
                      className="w-full h-full object-cover"
                    />
                    {bg.featured && (
                      <Badge className="absolute top-2 left-2 bg-[#7FB8A3] text-[#12161D]">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {/* Branding preview overlay - logo and tagline */}
                    <div className="absolute bottom-4 right-4 flex flex-col items-center gap-2">
                      <div className="relative">
                        <img 
                          src={whiteLogo} 
                          alt="Constancia Logo" 
                          className="h-10 drop-shadow-lg"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                        />
                        <span className="absolute -top-1 -right-3 text-white text-[8px] font-medium drop-shadow-lg">®</span>
                      </div>
                      <div className="text-center leading-snug drop-shadow-lg">
                        <p className="text-sm font-medium" style={{ color: '#F6F3EE' }}>{TAGLINE.line1}</p>
                        <p className="text-sm font-medium" style={{ color: '#F6F3EE' }}>{TAGLINE.line2}</p>
                        <p className="text-sm font-medium italic" style={{ color: BRAND.cyan }}>{TAGLINE.line3}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{bg.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{bg.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => downloadTeamsBackground(bg)}
                        disabled={downloadingId === bg.id}
                        data-testid={`button-download-${bg.id}`}
                      >
                        {downloadingId === bg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-brand-teal" />
              Stock Photo Backgrounds
              <Badge variant="outline" className="ml-2">Base Images</Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Professional stock imagery - can be used as base for custom branded backgrounds.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {stockBackgrounds.map((bg) => (
                <Card key={bg.id} className="overflow-hidden hover-elevate">
                  <div className="aspect-video relative">
                    <img 
                      src={bg.imagePath} 
                      alt={bg.name}
                      className="w-full h-full object-cover"
                    />
                    {bg.featured && (
                      <Badge className="absolute top-2 left-2 bg-[#7FB8A3] text-[#12161D]">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {/* Branding preview overlay - logo and tagline */}
                    <div className="absolute bottom-3 right-3 flex flex-col items-center gap-1">
                      <div className="relative">
                        <img 
                          src={whiteLogo} 
                          alt="Constancia Logo" 
                          className="h-8 drop-shadow-lg"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                        />
                        <span className="absolute -top-1 -right-2 text-white text-[6px] font-medium drop-shadow-lg">®</span>
                      </div>
                      <div className="text-center leading-snug drop-shadow-lg">
                        <p className="text-xs font-medium" style={{ color: '#F6F3EE' }}>{TAGLINE.line1}</p>
                        <p className="text-xs font-medium" style={{ color: '#F6F3EE' }}>{TAGLINE.line2}</p>
                        <p className="text-xs font-medium italic" style={{ color: BRAND.cyan }}>{TAGLINE.line3}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{bg.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{bg.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadTeamsBackground(bg)}
                        disabled={downloadingId === bg.id}
                        data-testid={`button-download-${bg.id}`}
                      >
                        {downloadingId === bg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-[#6264A7]" />
              Gradient Backgrounds (Legacy)
            </h3>
            <div className="grid gap-6">
              {gradientCovers.filter(c => c.type === "teams-background").map((cover) => (
                <GradientCoverPreview
                  key={cover.id}
                  cover={cover}
                  onDownload={() => downloadGradientCover(cover)}
                  isDownloading={downloadingId === cover.id}
                />
              ))}
            </div>
          </div>
          
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-[#6264A7]/10">
                  <Video className="h-6 w-6 text-[#6264A7]" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Virtual Background Guidelines</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Optimized for professional video calls:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>1920×1080</strong> - Full HD resolution for Teams & Zoom</li>
                    <li>• <strong>Logo positioned bottom-right</strong> - Avoids overlap with your video feed (typically centred/left)</li>
                    <li>• <strong>Professional environments</strong> - Corporate offices, tech workspaces, abstract gradients</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3">
                    <strong>To use:</strong> Download the image, then upload it in Teams Settings → Devices → Background Effects or Zoom Settings → Backgrounds & Effects.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <LibraryTabContent />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Brand Assets
          </CardTitle>
          <CardDescription>
            Download individual brand elements for custom designs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = whiteLogo;
                link.download = 'Constancia-Logo-White.png';
                link.click();
              }}
              data-testid="button-download-logo-white"
            >
              <div className="w-20 h-10 bg-brand-navy rounded flex items-center justify-center p-2">
                <img src={whiteLogo} alt="White Logo" className="h-full w-auto" />
              </div>
              <span className="text-xs">White Logo (PNG)</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = gradientLogo;
                link.download = 'Constancia-Logo-Gradient.png';
                link.click();
              }}
              data-testid="button-download-logo-gradient"
            >
              <div className="w-20 h-10 bg-white border rounded flex items-center justify-center p-2">
                <img src={gradientLogo} alt="Gradient Logo" className="h-full w-auto" />
              </div>
              <span className="text-xs">Gradient Logo (PNG)</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const link = document.createElement('a');
                link.href = iconWhite;
                link.download = 'Constancia-Icon-White.png';
                link.click();
              }}
              data-testid="button-download-icon-white"
            >
              <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center p-1">
                <img src={iconWhite} alt="White Icon" className="h-full w-auto" />
              </div>
              <span className="text-xs">White Icon (PNG)</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminMarketingAssets() {
  return (
    <AdminLayout>
      <MarketingAssetsContent />
    </AdminLayout>
  );
}
