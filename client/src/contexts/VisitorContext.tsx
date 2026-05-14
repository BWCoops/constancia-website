import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const VISITOR_DATA_KEY = "visitor_data";

type StoredVisitorData = Omit<VisitorData, 'fullName' | 'email' | 'company' | 'phone' | 'jobTitle'>;

function sanitiseForStorage(data: VisitorData): StoredVisitorData {
  const { fullName: _fn, email: _e, company: _co, phone: _ph, jobTitle: _jt, ...safe } = data;
  return safe;
}

export interface VisitorData {
  fullName: string;
  email: string;
  company?: string;
  phone?: string;
  jobTitle?: string;
  lastVisit: string;
  visitCount: number;
  rememberedAt: string;
  rememberMe: boolean;
  preferences?: {
    interestedIn?: string[];
    downloadedResources?: string[];
  };
}

interface VisitorContextValue {
  visitor: VisitorData | null;
  isReturningVisitor: boolean;
  isLoaded: boolean;
  updateVisitor: (data: Partial<Omit<VisitorData, "lastVisit" | "visitCount" | "rememberedAt">>) => void;
  clearVisitor: () => void;
  setRememberMe: (value: boolean) => void;
  addDownloadedResource: (resourceId: string) => void;
  addInterest: (interest: string) => void;
  getFirstName: () => string;
  getLastName: () => string;
}

const VisitorContext = createContext<VisitorContextValue | undefined>(undefined);

interface VisitorProviderProps {
  children: ReactNode;
}

export function VisitorProvider({ children }: VisitorProviderProps) {
  const [visitor, setVisitor] = useState<VisitorData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VISITOR_DATA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredVisitorData;
        if (parsed.rememberMe !== false) {
          const updated: VisitorData = {
            fullName: '',
            email: '',
            ...parsed,
            lastVisit: new Date().toISOString(),
            visitCount: (parsed.visitCount || 0) + 1,
          };
          setVisitor(updated);
          localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(sanitiseForStorage(updated)));
        }
      }
    } catch (error) {
      console.error("Failed to load visitor data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const updateVisitor = useCallback((data: Partial<Omit<VisitorData, "lastVisit" | "visitCount" | "rememberedAt">>) => {
    setVisitor((prev) => {
      const now = new Date().toISOString();
      const updated: VisitorData = prev
        ? {
            ...prev,
            ...data,
            lastVisit: now,
            preferences: {
              ...prev.preferences,
              ...data.preferences,
            },
          }
        : {
            fullName: data.fullName || "",
            email: data.email || "",
            company: data.company,
            phone: data.phone,
            jobTitle: data.jobTitle,
            lastVisit: now,
            visitCount: 1,
            rememberedAt: now,
            rememberMe: data.rememberMe !== false,
            preferences: data.preferences || {},
          };

      if (updated.rememberMe !== false) {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(sanitiseForStorage(updated)));
      }

      return updated;
    });
  }, []);

  const clearVisitor = useCallback(() => {
    localStorage.removeItem(VISITOR_DATA_KEY);
    setVisitor(null);
  }, []);

  const setRememberMe = useCallback((value: boolean) => {
    setVisitor((prev) => {
      if (!prev) return null;
      const updated = { ...prev, rememberMe: value };
      if (value) {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(sanitiseForStorage(updated)));
      } else {
        localStorage.removeItem(VISITOR_DATA_KEY);
      }
      return updated;
    });
  }, []);

  const addDownloadedResource = useCallback((resourceId: string) => {
    setVisitor((prev) => {
      if (!prev) return null;
      const currentResources = prev.preferences?.downloadedResources || [];
      if (currentResources.includes(resourceId)) return prev;

      const updated: VisitorData = {
        ...prev,
        preferences: {
          ...prev.preferences,
          downloadedResources: [...currentResources, resourceId],
        },
      };

      if (prev.rememberMe !== false) {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(sanitiseForStorage(updated)));
      }

      return updated;
    });
  }, []);

  const addInterest = useCallback((interest: string) => {
    setVisitor((prev) => {
      if (!prev) return null;
      const currentInterests = prev.preferences?.interestedIn || [];
      if (currentInterests.includes(interest)) return prev;

      const updated: VisitorData = {
        ...prev,
        preferences: {
          ...prev.preferences,
          interestedIn: [...currentInterests, interest],
        },
      };

      if (prev.rememberMe !== false) {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(sanitiseForStorage(updated)));
      }

      return updated;
    });
  }, []);

  const getFirstName = useCallback(() => {
    if (!visitor?.fullName) return "";
    const parts = visitor.fullName.trim().split(/\s+/);
    return parts[0] || "";
  }, [visitor?.fullName]);

  const getLastName = useCallback(() => {
    if (!visitor?.fullName) return "";
    const parts = visitor.fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }, [visitor?.fullName]);

  const isReturningVisitor = isLoaded && visitor !== null && visitor.visitCount > 1;

  const value: VisitorContextValue = {
    visitor,
    isReturningVisitor,
    isLoaded,
    updateVisitor,
    clearVisitor,
    setRememberMe,
    addDownloadedResource,
    addInterest,
    getFirstName,
    getLastName,
  };

  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
}

export function useVisitor() {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error("useVisitor must be used within a VisitorProvider");
  }
  return context;
}
