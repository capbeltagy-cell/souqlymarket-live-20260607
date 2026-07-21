import { Menu, Clock } from "lucide-react";

interface AdminTopbarProps {
  onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const now = new Date().toLocaleString("ar-EG");

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="h-16 px-6 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{now}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
