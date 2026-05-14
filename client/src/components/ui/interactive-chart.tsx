import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Move,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InteractiveChartProps {
  children: React.ReactNode;
  title?: string;
  height?: number;
  className?: string;
  enableFullscreen?: boolean;
  enableZoomControls?: boolean;
  dataLength?: number;
  onBrushChange?: (startIndex: number, endIndex: number) => void;
}

interface ZoomState {
  startIndex: number;
  endIndex: number;
}

export function InteractiveChart({
  children,
  title,
  height = 300,
  className,
  enableFullscreen = true,
  enableZoomControls = true,
  dataLength = 0,
  onBrushChange,
}: InteractiveChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomState, setZoomState] = useState<ZoomState>({
    startIndex: 0,
    endIndex: Math.max(0, dataLength - 1),
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    if (dataLength <= 1) return;
    const range = zoomState.endIndex - zoomState.startIndex;
    const newRange = Math.max(2, Math.floor(range * 0.7));
    const center = Math.floor((zoomState.startIndex + zoomState.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(dataLength - 1, newStart + newRange);
    
    setZoomState({ startIndex: newStart, endIndex: newEnd });
    onBrushChange?.(newStart, newEnd);
  }, [zoomState, dataLength, onBrushChange]);

  const handleZoomOut = useCallback(() => {
    if (dataLength <= 1) return;
    const range = zoomState.endIndex - zoomState.startIndex;
    const newRange = Math.min(dataLength - 1, Math.floor(range * 1.5));
    const center = Math.floor((zoomState.startIndex + zoomState.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(dataLength - 1, newStart + newRange);
    
    setZoomState({ startIndex: newStart, endIndex: newEnd });
    onBrushChange?.(newStart, newEnd);
  }, [zoomState, dataLength, onBrushChange]);

  const handleReset = useCallback(() => {
    setZoomState({ startIndex: 0, endIndex: Math.max(0, dataLength - 1) });
    onBrushChange?.(0, dataLength - 1);
  }, [dataLength, onBrushChange]);

  const handlePanLeft = useCallback(() => {
    if (zoomState.startIndex <= 0) return;
    const range = zoomState.endIndex - zoomState.startIndex;
    const panAmount = Math.max(1, Math.floor(range * 0.2));
    const newStart = Math.max(0, zoomState.startIndex - panAmount);
    const newEnd = newStart + range;
    
    setZoomState({ startIndex: newStart, endIndex: newEnd });
    onBrushChange?.(newStart, newEnd);
  }, [zoomState, onBrushChange]);

  const handlePanRight = useCallback(() => {
    if (zoomState.endIndex >= dataLength - 1) return;
    const range = zoomState.endIndex - zoomState.startIndex;
    const panAmount = Math.max(1, Math.floor(range * 0.2));
    const newEnd = Math.min(dataLength - 1, zoomState.endIndex + panAmount);
    const newStart = newEnd - range;
    
    setZoomState({ startIndex: newStart, endIndex: newEnd });
    onBrushChange?.(newStart, newEnd);
  }, [zoomState, dataLength, onBrushChange]);

  const chartContent = (
    <div className="relative group" ref={containerRef}>
      {(enableZoomControls || enableFullscreen) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-1 border">
          {enableZoomControls && dataLength > 5 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                title="Zoom in"
                data-testid="button-chart-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                title="Zoom out"
                data-testid="button-chart-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePanLeft}
                title="Pan left"
                disabled={zoomState.startIndex <= 0}
                data-testid="button-chart-pan-left"
              >
                <Move className="h-4 w-4 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePanRight}
                title="Pan right"
                disabled={zoomState.endIndex >= dataLength - 1}
                data-testid="button-chart-pan-right"
              >
                <Move className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReset}
                title="Reset zoom"
                data-testid="button-chart-reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
            </>
          )}
          {enableFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen"
              data-testid="button-chart-fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      <div style={{ height: isFullscreen ? "70vh" : height }}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      <div className={cn("relative", className)}>
        {chartContent}
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{title || "Chart"}</span>
              <div className="flex items-center gap-1">
                {enableZoomControls && dataLength > 5 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomIn}
                      title="Zoom in"
                      data-testid="button-fullscreen-zoom-in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleZoomOut}
                      title="Zoom out"
                      data-testid="button-fullscreen-zoom-out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleReset}
                      title="Reset zoom"
                      data-testid="button-fullscreen-reset"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(false)}
                  data-testid="button-close-fullscreen"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh]">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useChartZoom(data: unknown[], initialRange?: { start: number; end: number }) {
  const [brushDomain, setBrushDomain] = useState<{ startIndex: number; endIndex: number }>({
    startIndex: initialRange?.start ?? 0,
    endIndex: initialRange?.end ?? (data.length > 0 ? data.length - 1 : 0),
  });

  const handleBrushChange = useCallback((domain: { startIndex?: number; endIndex?: number } | null) => {
    if (domain && domain.startIndex !== undefined && domain.endIndex !== undefined) {
      setBrushDomain({ startIndex: domain.startIndex, endIndex: domain.endIndex });
    }
  }, []);

  const resetZoom = useCallback(() => {
    setBrushDomain({ startIndex: 0, endIndex: data.length - 1 });
  }, [data.length]);

  const visibleData = data.slice(brushDomain.startIndex, brushDomain.endIndex + 1);

  return {
    brushDomain,
    handleBrushChange,
    resetZoom,
    visibleData,
    isZoomed: brushDomain.startIndex > 0 || brushDomain.endIndex < data.length - 1,
  };
}
