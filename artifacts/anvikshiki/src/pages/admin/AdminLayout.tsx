import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, BookOpen, Inbox, Mail, LogOut, Home, Settings } from "lucide-react";
import { useGetAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { Wordmark } from "../../components/Wordmark";

interface AdminLayoutProps { children: ReactNode; }

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/articles", icon: FileText, label: "Articles" },
  { href: "/admin/papers", icon: BookOpen, label: "Papers" },
  { href: "/admin/submissions", icon: Inbox, label: "Submissions" },
  { href: "/admin/newsletter", icon: Mail, label: "Newsletter" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { data: me, isLoading, error } = useGetAdminMe();
  const logoutMutation = useAdminLogout();

  useEffect(() => {
    if (!isLoading && error) {
      navigate("/admin/login");
    }
  }, [isLoading, error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p className="text-sm" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>Loading...</p>
      </div>
    );
  }

  if (error || !me) return null;

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/admin/login"),
    });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col sticky top-0 h-screen"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--line)" }}
      >
        <div className="p-4 pt-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <Wordmark size="sm" />
          <p className="text-[10px] uppercase tracking-widest mt-1 ml-1" style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}>
            Admin
          </p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div
                  className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer"
                  style={{
                    background: active ? "var(--surface-2)" : "transparent",
                    color: active ? "var(--gold)" : "var(--muted-text)",
                    borderLeft: active ? `3px solid var(--gold)` : "3px solid transparent",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-1" style={{ borderTop: "1px solid var(--line)" }}>
          <Link href="/">
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs cursor-pointer transition-all"
              style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
            >
              <Home size={13} /> View site
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs w-full transition-all"
            style={{ color: "var(--muted-text)", fontFamily: "var(--font-ui)" }}
          >
            <LogOut size={13} /> Sign out
          </button>
          <div className="px-4 pt-1">
            <p className="text-[10px]" style={{ color: "var(--muted-2)", fontFamily: "var(--font-ui)" }}>
              {me.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
