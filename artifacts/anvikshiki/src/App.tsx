import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SacredHeader } from "@/components/sacred/SacredHeader";
import { SacredFooter } from "@/components/sacred/SacredFooter";
import { LoadingScreen } from "@/components/sacred/LoadingScreen";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";

/* ── Public pages ── */
import HomePage         from "@/app/page";
import BrowsePage       from "@/app/browse/page";
import DomainPage       from "@/app/domains/[slug]/page";
import ArticlePage      from "@/app/articles/[slug]/page";
import PapersPage       from "@/app/papers/page";
import PaperDetailPage  from "@/app/papers/[slug]/page";
import SearchPage       from "@/app/search/page";
import ArchivePage      from "@/app/archive/page";
import AboutPage        from "@/app/about/page";
import CommunityPage    from "@/app/community/page";
import LoginPage        from "@/app/login/page";
import AccountPage      from "@/app/account/page";
import SubmitLandingPage  from "@/app/submit/page";
import SubmitDetailsPage  from "@/app/submit/details/page";
import SubmitUploadPage   from "@/app/submit/upload/page";
import SubmitWritePage    from "@/app/submit/write/page";
import SubmitSuccessPage  from "@/app/submit/success/page";
import SavedPage        from "@/app/saved/page";
import PrivacyPage      from "@/app/privacy/page";
import TermsPage        from "@/app/terms/page";

/* ── Admin pages ── */
import AdminLoginPage       from "@/app/admin/login/page";
import AdminDashboardPage   from "@/app/admin/page";
import AdminArticlesPage    from "@/app/admin/articles/page";
import AdminNewArticlePage  from "@/app/admin/articles/new/page";
import AdminPapersPage      from "@/app/admin/papers/page";
import AdminNewPaperPage    from "@/app/admin/papers/new/page";
import AdminSubmissionsPage from "@/app/admin/submissions/page";
import AdminNewsletterPage  from "@/app/admin/newsletter/page";
import AdminSettingsPage    from "@/app/admin/settings/page";
import AdminUsersPage       from "@/app/admin/users/page";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 2 } },
});

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-[100dvh] cosmic-bg">
      <SacredHeader />
      <main id="main-content" className="flex-1 animate-fade-in">{children}</main>
      <SacredFooter />
    </div>
  );
}

function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="home-reference-stage">
      <main id="main-content">{children}</main>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--bg-deep)", minHeight: "100vh" }}>{children}</div>;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Public */}
        <Route path="/"                  component={() => <AppShell><HomePage /></AppShell>} />
        <Route path="/browse"            component={() => <AppShell><BrowsePage /></AppShell>} />
        <Route path="/domains/:slug"     component={() => <AppShell><DomainPage /></AppShell>} />
        <Route path="/articles/:slug"    component={() => <AppShell><ArticlePage /></AppShell>} />
        <Route path="/essays/:slug"      component={() => <AppShell><ArticlePage /></AppShell>} />
        <Route path="/papers"            component={() => <AppShell><PapersPage /></AppShell>} />
        <Route path="/papers/:slug"      component={() => <AppShell><PaperDetailPage /></AppShell>} />
        <Route path="/search"            component={() => <AppShell><SearchPage /></AppShell>} />
        <Route path="/archive"           component={() => <AppShell><ArchivePage /></AppShell>} />
        <Route path="/about"             component={() => <AppShell><AboutPage /></AppShell>} />
        <Route path="/community"         component={() => <AppShell><CommunityPage /></AppShell>} />
        <Route path="/login"             component={() => <AppShell><LoginPage /></AppShell>} />
        <Route path="/account"           component={() => <AppShell><AccountPage /></AppShell>} />
        <Route path="/submit"            component={() => <AppShell><SubmitLandingPage /></AppShell>} />
        <Route path="/submit/details"    component={() => <AppShell><SubmitDetailsPage /></AppShell>} />
        <Route path="/submit/upload"     component={() => <AppShell><SubmitUploadPage /></AppShell>} />
        <Route path="/submit/write"      component={() => <AppShell><SubmitWritePage /></AppShell>} />
        <Route path="/submit/success"    component={() => <AppShell><SubmitSuccessPage /></AppShell>} />
        <Route path="/saved"             component={() => <AppShell><SavedPage /></AppShell>} />
        <Route path="/privacy"           component={() => <AppShell><PrivacyPage /></AppShell>} />
        <Route path="/terms"             component={() => <AppShell><TermsPage /></AppShell>} />
        {/* Legacy category routes */}
        <Route path="/categories/:slug"  component={() => <AppShell><DomainPage /></AppShell>} />

        {/* Admin */}
        <Route path="/admin/login"           component={() => <AdminShell><AdminLoginPage /></AdminShell>} />
        <Route path="/admin"                 component={() => <AdminShell><AdminDashboardPage /></AdminShell>} />
        <Route path="/admin/articles"        component={() => <AdminShell><AdminArticlesPage /></AdminShell>} />
        <Route path="/admin/articles/new"    component={() => <AdminShell><AdminNewArticlePage /></AdminShell>} />
        <Route path="/admin/papers"          component={() => <AdminShell><AdminPapersPage /></AdminShell>} />
        <Route path="/admin/papers/new"      component={() => <AdminShell><AdminNewPaperPage /></AdminShell>} />
        <Route path="/admin/submissions"     component={() => <AdminShell><AdminSubmissionsPage /></AdminShell>} />
        <Route path="/admin/newsletter"      component={() => <AdminShell><AdminNewsletterPage /></AdminShell>} />
        <Route path="/admin/settings"        component={() => <AdminShell><AdminSettingsPage /></AdminShell>} />
        <Route path="/admin/users"           component={() => <AdminShell><AdminUsersPage /></AdminShell>} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  const [loading, setLoading] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).has("skip")) return false;
      return !sessionStorage.getItem("anv_loaded");
    } catch { return true; }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {loading && <LoadingScreen onDone={() => { sessionStorage.setItem("anv_loaded","1"); setLoading(false); }} />}
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface-3)",
                color: "var(--ink)",
                border: "1px solid var(--border-gold)",
                fontFamily: "var(--font-ui)",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
