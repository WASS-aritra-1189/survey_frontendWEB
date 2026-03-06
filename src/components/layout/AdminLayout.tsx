import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Footer } from "./Footer";
import { useSidebarStore } from "@/store/sidebarStore";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminSidebar />
      <div className={`transition-all duration-300 flex-1 flex flex-col ${collapsed ? 'md:pl-20' : 'md:pl-64'} pl-0`}>
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="p-3 sm:p-4 md:p-6 flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
