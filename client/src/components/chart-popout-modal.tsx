import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Download } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";

interface ChartPopoutModalProps {
  title: string;
  children: React.ReactNode;
  chartId: string;
  onCapture?: (dataUrl: string) => void;
}

export function ChartPopoutModal({ title, children, chartId, onCapture }: ChartPopoutModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const handleCaptureChart = useCallback(async () => {
    if (!chartRef.current) return null;
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      onCapture?.(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture chart:', error);
      return null;
    }
  }, [onCapture]);

  const handleDownloadChart = useCallback(async () => {
    const dataUrl = await handleCaptureChart();
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${chartId}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [handleCaptureChart, chartId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 opacity-60 hover:opacity-100"
          data-testid={`button-expand-${chartId}`}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-lg font-semibold text-[#12161D] dark:text-[#C77A93]">
              {title}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadChart}
              className="flex items-center gap-2"
              data-testid={`button-download-${chartId}`}
            >
              <Download className="w-4 h-4" />
              Download Chart
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div 
            ref={chartRef} 
            className="w-full min-h-[500px] bg-card rounded-lg p-4"
            data-testid={`chart-expanded-${chartId}`}
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export async function captureChartToImage(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Chart element ${elementId} not found`);
    return null;
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    
    // Use JPEG with quality 0.85 for crisp charts without pixelation
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Failed to capture chart:', error);
    return null;
  }
}
