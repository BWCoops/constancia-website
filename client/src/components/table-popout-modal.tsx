import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

interface TablePopoutModalProps {
  title: string;
  children: React.ReactNode;
  tableId?: string;
}

export function TablePopoutModal({ title, children, tableId }: TablePopoutModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 opacity-60 hover:opacity-100"
          data-testid={`button-expand-${tableId || 'table'}`}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#252826] dark:text-[#7FB8A3]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div 
          className="w-full overflow-auto"
          data-testid={`table-expanded-${tableId || 'table'}`}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
