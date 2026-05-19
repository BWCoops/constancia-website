import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { initializeWebVitals } from "./lib/web-vitals";

const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_KEY ||
  "";

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    "VITE_CLERK_PUBLISHABLE_KEY is not set. Admin routes will not be able to sign users in until this is provided."
  );
}

// Suppress Clerk JS load failures from surfacing as a Vite error overlay.
// The public marketing site works without Clerk; only admin routes require
// it. When Clerk's CDN is unreachable (CSP, transient network, instance
// rotated) we'd otherwise block the entire dev preview for every visitor.
window.addEventListener("unhandledrejection", (e) => {
  const msg = typeof e.reason?.message === "string" ? e.reason.message : "";
  if (
    msg.includes("failed_to_load_clerk_js") ||
    msg.includes("Failed to load Clerk")
  ) {
    e.preventDefault();
  }
});

// Initialize Web Vitals performance monitoring
const isDevelopment = !import.meta.env.PROD;
initializeWebVitals(isDevelopment);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        // Service worker registered successfully - no console logging in production
      })
      .catch(() => {
        // Service worker registration failed silently in production
      });
  });
}

// Page view tracking
const trackPageView = async (path: string, duration: number = 0) => {
  try {
    const referrer = document.referrer || "";
    const userAgent = navigator.userAgent;
    
    // Get or create persistent visitor ID (for returning visitor tracking)
    let visitorId = localStorage.getItem("visitorId");
    if (!visitorId) {
      visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("visitorId", visitorId);
    }
    
    // Get or create session ID (resets on each new browser session)
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = `session-${Date.now()}`;
      sessionStorage.setItem("sessionId", sessionId);
    }

    const payload = JSON.stringify({ sessionId, visitorId, path, referrer, userAgent, duration });
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon?.("/api/track/page-view", blob);
    if (!sent) {
      await fetch("/api/track/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    }
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
};

// Defer page-view tracking until after first paint to keep it off the critical path
const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
scheduleIdle(() => trackPageView(window.location.pathname));

// Track page visibility changes for duration calculation
let pageStartTime = Date.now();
let isVisible = true;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    isVisible = false;
    // Save page duration
    const duration = Date.now() - pageStartTime;
    sessionStorage.setItem("lastPageDuration", duration.toString());
  } else {
    isVisible = true;
    pageStartTime = Date.now();
  }
});

// Track page duration before unload
window.addEventListener("beforeunload", () => {
  if (isVisible) {
    const duration = Date.now() - pageStartTime;
    trackPageView(window.location.pathname, duration);
  }
});

// Efficient route change detection using History API and popstate
let lastTrackedPath = window.location.pathname;
sessionStorage.setItem("lastTrackedPath", lastTrackedPath);

const handleRouteChange = () => {
  const currentPath = window.location.pathname;
  
  if (lastTrackedPath !== currentPath) {
    const duration = Date.now() - pageStartTime;
    trackPageView(currentPath, duration);
    lastTrackedPath = currentPath;
    sessionStorage.setItem("lastTrackedPath", currentPath);
    pageStartTime = Date.now();
  }
};

// Handle browser back/forward navigation
window.addEventListener("popstate", handleRouteChange);

// Override pushState and replaceState to detect programmatic navigation (wouter uses these)
const originalPushState = history.pushState.bind(history);
const originalReplaceState = history.replaceState.bind(history);

history.pushState = function(...args: Parameters<typeof originalPushState>) {
  originalPushState(...args);
  handleRouteChange();
};

history.replaceState = function(...args: Parameters<typeof originalReplaceState>) {
  originalReplaceState(...args);
  handleRouteChange();
};

createRoot(document.getElementById("root")!).render(
  CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/admin/login">
      <App />
    </ClerkProvider>
  ) : (
    <App />
  )
);
