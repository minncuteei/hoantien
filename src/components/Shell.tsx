import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="aurora pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SiteHeader />
        {children}
        <footer className="mt-6 border-t border-border py-6 text-xs text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 HoànTiền — hoàn tiền minh bạch, không phí ẩn.</span>
            <div className="flex gap-4">
              <span>Điều khoản</span>
              <span>Bảo mật</span>
              <span>Liên hệ</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
