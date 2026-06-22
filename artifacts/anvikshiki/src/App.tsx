import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

import HomePage from "@/app/page";
import ArticlePage from "@/app/articles/[slug]/page";
import PapersPage from "@/app/papers/page";
import PaperDetailPage from "@/app/papers/[slug]/page";
import SearchPage from "@/app/search/page";
import ArchivePage from "@/app/archive/page";
import AboutPage from "@/app/about/page";
import CategoryPage from "@/app/categories/[slug]/page";
import LoginPage from "@/app/login/page";
import AccountPage from "@/app/account/page";
import SubmitPage from "@/app/submit/page";
import SavedPage from "@/app/saved/page";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";

import AdminLoginPage from "@/app/admin/login/page";
import AdminDashboardPage from "@/app/admin/page";
import AdminArticlesPage from "@/app/admin/articles/page";
import AdminNewArticlePage from "@/app/admin/articles/new/page";
import AdminPapersPage from "@/app/admin/papers/page";
import AdminNewPaperPage from "@/app/admin/papers/new/page";
import AdminSubmissionsPage from "@/app/admin/submissions/page";
import AdminNewsletterPage from "@/app/admin/newsletter/page";
import AdminSettingsPage from "@/app/admin/settings/page";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 2 },
  },
});

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-24 md:pb-0">
      <BrandHeader />
      <main>{children}</main>
      <MobileBottomNav />
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={() => <AppShell><HomePage /></AppShell>} />
      <Route path="/articles/:slug" component={() => <AppShell><ArticlePage /></AppShell>} />
      <Route path="/papers" component={() => <AppShell><PapersPage /></AppShell>} />
      <Route path="/papers/:slug" component={() => <AppShell><PaperDetailPage /></AppShell>} />
      <Route path="/search" component={() => <AppShell><SearchPage /></AppShell>} />
      <Route path="/archive" component={() => <AppShell><ArchivePage /></AppShell>} />
      <Route path="/about" component={() => <AppShell><AboutPage /></AppShell>} />
      <Route path="/categories/:slug" component={() => <AppShell><CategoryPage /></AppShell>} />
      <Route path="/login" component={() => <AppShell><LoginPage /></AppShell>} />
      <Route path="/account" component={() => <AppShell><AccountPage /></AppShell>} />
      <Route path="/submit" component={() => <AppShell><SubmitPage /></AppShell>} />
      <Route path="/saved" component={() => <AppShell><SavedPage /></AppShell>} />
      <Route path="/privacy" component={() => <AppShell><PrivacyPage /></AppShell>} />
      <Route path="/terms" component={() => <AppShell><TermsPage /></AppShell>} />

      {/* Admin routes (no top nav) */}
      <Route path="/admin/login" component={() => <AdminShell><AdminLoginPage /></AdminShell>} />
      <Route path="/admin" component={() => <AdminShell><AdminDashboardPage /></AdminShell>} />
      <Route path="/admin/articles" component={() => <AdminShell><AdminArticlesPage /></AdminShell>} />
      <Route path="/admin/articles/new" component={() => <AdminShell><AdminNewArticlePage /></AdminShell>} />
      <Route path="/admin/papers" component={() => <AdminShell><AdminPapersPage /></AdminShell>} />
      <Route path="/admin/papers/new" component={() => <AdminShell><AdminNewPaperPage /></AdminShell>} />
      <Route path="/admin/submissions" component={() => <AdminShell><AdminSubmissionsPage /></AdminShell>} />
      <Route path="/admin/newsletter" component={() => <AdminShell><AdminNewsletterPage /></AdminShell>} />
      <Route path="/admin/settings" component={() => <AdminShell><AdminSettingsPage /></AdminShell>} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
