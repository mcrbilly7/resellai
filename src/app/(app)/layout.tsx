import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { AIChatWidget } from "@/components/AIChatWidget";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <OfflineBanner />
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <MobileNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <AIChatWidget />
    </>
  );
}
