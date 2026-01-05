import { ScanSearch } from 'lucide-react';

export default function SitemarkIcon() {
  return (
    <div className="flex items-center gap-2">
      <ScanSearch className="h-6 w-6 text-primary" />
      <span className="font-bold text-lg">DocuLens</span>
    </div>
  );
}
