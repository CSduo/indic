import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { withContentVersion } from "@/lib/contentVersion";
import { SacredHeader } from "@/components/sacred/SacredHeader";
import { SacredFooter } from "@/components/sacred/SacredFooter";
import { LoadingScreen } from "@/components/sacred/LoadingScreen";
import { PageSkeleton } from "@/components/sacred/PageSkeleton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthContext";
import { PageTransition } from "@/components/providers/PageTransition";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

/* â”€â”€ Public pages â€” lazy loaded (code splitting) â”€â”€ */
// The landing route is the exception: splitting it out meant the browser had to
// fetch index.html, then the entry bundle, and only then discover it needed a
// further chunk before it could render anything. Almost every visitor lands
// here, so that extra round trip was pure latency on the most-used page.
import HomePage from "@/app/page";
const BrowsePage            = lazy(() => import("@/app/browse/page"));
const DomainsPage           = lazy(() => import("@/app/domains/page"));
const DomainPage            = lazy(() => import("@/app/domains/[slug]/page"));
const ArticlePage           = lazy(() => import("@/app/articles/[slug]/page"));
const PapersPage            = lazy(() => import("@/app/papers/page"));
const PaperDetailPage       = lazy(() => import("@/app/papers/[slug]/page"));
const SearchPage            = lazy(() => import("@/app/search/page"));
const ArchivePage           = lazy(() => import("@/app/archive/page"));
const AboutPage             = lazy(() => import("@/app/about/page"));
const ContactPage           = lazy(() => import("@/app/contact/page"));
const CommunityPage         = lazy(() => import("@/app/community/page"));
const CommunityFeedPage     = lazy(() => import("@/app/community/feed/page"));
const CommunityDiscussPage  = lazy(() => import("@/app/community/discussions/page"));
const CommunityEventsPage   = lazy(() => import("@/app/community/events/page"));
const LoginPage             = lazy(() => import("@/app/login/page"));
const AccountPage           = lazy(() => import("@/app/account/page"));
const ProfilePage           = lazy(() => import("@/app/account/profile/page"));
const CollectionsPage       = lazy(() => import("@/app/account/collections/page"));
const NotificationsPage     = lazy(() => import("@/app/account/notifications/page"));
const SettingsPage          = lazy(() => import("@/app/account/settings/page"));
const EditArticlePage       = lazy(() => import("@/app/account/edit/[slug]/page"));
const SubmitLandingPage     = lazy(() => import("@/app/submit/page"));
const PublicUserProfilePage = lazy(() => import("@/app/profile/[userId]/page"));
const SubmitDetailsPage     = lazy(() => import("@/app/submit/details/page"));
const SubmitUploadPage      = lazy(() => import("@/app/submit/upload/page"));
const SubmitWritePage       = lazy(() => import("@/app/submit/write/page"));
const SubmitPreviewPage     = lazy(() => import("@/app/submit/preview/page"));
const SubmitSuccessPage     = lazy(() => import("@/app/submit/success/page"));
const SavedPage             = lazy(() => import("@/app/saved/page"));
const PrivacyPage           = lazy(() => import("@/app/privacy/page"));
const TermsPage             = lazy(() => import("@/app/terms/page"));

/* â”€â”€ Admin pages â€” lazy loaded â”€â”€ */
const AdminLoginPage        = lazy(() => import("@/app/admin/login/page"));
const AdminDashboardPage    = lazy(() => import("@/app/admin/page"));
const AdminArticlesPage     = lazy(() => import("@/app/admin/articles/page"));
const AdminNewArticlePage   = lazy(() => import("@/app/admin/articles/new/page"));
const AdminPapersPage       = lazy(() => import("@/app/admin/papers/page"));
const AdminNewPaperPage     = lazy(() => import("@/app/admin/papers/new/page"));
const AdminSubmissionsPage  = lazy(() => import("@/app/admin/submissions/page"));
const AdminNewsletterPage   = lazy(() => import("@/app/admin/newsletter/page"));
const AdminSettingsPage     = lazy(() => import("@/app/admin/settings/page"));
const AdminUsersPage        = lazy(() => import("@/app/admin/users/page"));

const MessagesInboxPage    = lazy(() => import("@/app/messages/page"));
const ConversationPage     = lazy(() => import("@/app/messages/[id]/page"));

const NotFound = lazy(() => import("@/pages/not-found"));

// â”€â”€ 10-minute staleTime: content articles don't change every 2 minutes.
// Using a long staleTime means navigating back to any page that used useQuery
// returns data INSTANTLY from the in-memory cache rather than re-fetching.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 10,   // 10 minutes
      gcTime: 1000 * 60 * 30,       // keep unused data in memory 30 minutes
    },
  },
});

const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");

// Eagerly prefetch homepage data on script load so articles are ready before render
// Must match HOME_STALE_TIME in app/page.tsx. If the prefetch seeds the cache
// with a longer lifetime, the home page reuses that entry and a work published
// moments ago stays missing from the front page.
const HOME_PREFETCH_STALE_TIME = 1000 * 60;

try {
  // These are public listings â€” no session cookie, so the CDN can serve them
  // and the request is not held up behind anything auth-related.
  queryClient.prefetchQuery({
    queryKey: ["home-articles"],
    queryFn: () => fetch(withContentVersion(`${appBase}/api/articles?limit=24`)).then(r => r.json()),
    staleTime: HOME_PREFETCH_STALE_TIME,
  });
  queryClient.prefetchQuery({
    queryKey: ["home-featured"],
    queryFn: () => fetch(withContentVersion(`${appBase}/api/articles?featured=true&limit=4`)).then(r => r.json()),
    staleTime: HOME_PREFETCH_STALE_TIME,
  });
  queryClient.prefetchQuery({
    queryKey: ["home-papers"],
    queryFn: () => fetch(withContentVersion(`${appBase}/api/papers?limit=24`)).then(r => r.json()),
    staleTime: HOME_PREFETCH_STALE_TIME,
  });
} catch {
  // Ignore prefetch failures
}

// â”€â”€ Stable shell wrappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CRITICAL: these must be defined OUTSIDE the Router function as named
// components. If they're inline arrow functions inside Route's `component`
// prop, React sees a new reference on every render and unmounts/remounts the
// entire page â€” causing the "hanging" between navigations.

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-[100dvh] cosmic-bg">
      <SacredHeader />
      <main id="main-content" className="flex-1">
        <PageTransition>
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </PageTransition>
      </main>
      <SacredFooter />
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-deep)", minHeight: "100vh" }}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </div>
  );
}

// â”€â”€ Pre-defined stable route components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each must be a named component (not an inline arrow) so React can keep the
// DOM stable across renders. This eliminates the unmount-remount cycle.

const RouteHome              = () => <AppShell><HomePage /></AppShell>;
const RouteBrowse            = () => <AppShell><BrowsePage /></AppShell>;
const RouteMessages          = () => <AppShell><MessagesInboxPage /></AppShell>;
const RouteConversation      = () => <AppShell><ConversationPage /></AppShell>;
const RouteDomains           = () => <AppShell><DomainsPage /></AppShell>;
const RouteDomain            = () => <AppShell><DomainPage /></AppShell>;
const RouteArticle           = () => <AppShell><ArticlePage /></AppShell>;
const RoutePapers            = () => <AppShell><PapersPage /></AppShell>;
const RoutePaperDetail       = () => <AppShell><PaperDetailPage /></AppShell>;
const RouteSearch            = () => <AppShell><SearchPage /></AppShell>;
const RouteArchive           = () => <AppShell><ArchivePage /></AppShell>;
const RouteAbout             = () => <AppShell><AboutPage /></AppShell>;
const RouteContact           = () => <AppShell><ContactPage /></AppShell>;
const RouteCommunity         = () => <AppShell><CommunityPage /></AppShell>;
const RouteCommunityFeed     = () => <AppShell><CommunityFeedPage /></AppShell>;
const RouteCommunityDiscuss  = () => <AppShell><CommunityDiscussPage /></AppShell>;
const RouteCommunityEvents   = () => <AppShell><CommunityEventsPage /></AppShell>;
const RouteLogin             = () => <AppShell><LoginPage /></AppShell>;
const RouteAccount           = () => <AppShell><AccountPage /></AppShell>;
const RouteProfile           = () => <AppShell><ProfilePage /></AppShell>;
const RouteCollections       = () => <AppShell><CollectionsPage /></AppShell>;
const RouteNotifications     = () => <AppShell><NotificationsPage /></AppShell>;
const RouteSettings          = () => <AppShell><SettingsPage /></AppShell>;
const RouteEditArticle       = () => <AppShell><EditArticlePage /></AppShell>;
const RouteSubmit            = () => <AppShell><SubmitLandingPage /></AppShell>;
const RoutePublicProfile     = () => <AppShell><PublicUserProfilePage /></AppShell>;
const RouteSubmitDetails     = () => <AppShell><SubmitDetailsPage /></AppShell>;
const RouteSubmitUpload      = () => <AppShell><SubmitUploadPage /></AppShell>;
const RouteSubmitWrite       = () => <AppShell><SubmitWritePage /></AppShell>;
const RouteSubmitPreview     = () => <AppShell><SubmitPreviewPage /></AppShell>;
const RouteSubmitSuccess     = () => <AppShell><SubmitSuccessPage /></AppShell>;
const RouteSaved             = () => <AppShell><SavedPage /></AppShell>;
const RoutePrivacy           = () => <AppShell><PrivacyPage /></AppShell>;
const RouteTerms             = () => <AppShell><TermsPage /></AppShell>;
const RouteCategories        = () => <AppShell><DomainPage /></AppShell>;
const RouteEssay             = () => <AppShell><ArticlePage /></AppShell>;

const RouteAdminLogin        = () => <AdminShell><AdminLoginPage /></AdminShell>;
const RouteAdminDashboard    = () => <AdminShell><AdminDashboardPage /></AdminShell>;
const RouteAdminArticles     = () => <AdminShell><AdminArticlesPage /></AdminShell>;
const RouteAdminNewArticle   = () => <AdminShell><AdminNewArticlePage /></AdminShell>;
const RouteAdminPapers       = () => <AdminShell><AdminPapersPage /></AdminShell>;
const RouteAdminNewPaper     = () => <AdminShell><AdminNewPaperPage /></AdminShell>;
const RouteAdminSubmissions  = () => <AdminShell><AdminSubmissionsPage /></AdminShell>;
const RouteAdminNewsletter   = () => <AdminShell><AdminNewsletterPage /></AdminShell>;
const RouteAdminSettings     = () => <AdminShell><AdminSettingsPage /></AdminShell>;
const RouteAdminUsers        = () => <AdminShell><AdminUsersPage /></AdminShell>;

function Router() {
  useKeyboardShortcuts();
  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Public */}
        <Route path="/"                        component={RouteHome} />
        <Route path="/browse"                  component={RouteBrowse} />
        <Route path="/domains"                 component={RouteDomains} />
        <Route path="/domains/:slug"           component={RouteDomain} />
        <Route path="/articles/:slug"          component={RouteArticle} />
        <Route path="/essays/:slug"            component={RouteEssay} />
        <Route path="/papers"                  component={RoutePapers} />
        <Route path="/papers/:slug"            component={RoutePaperDetail} />
        <Route path="/search"                  component={RouteSearch} />
        <Route path="/archive"                 component={RouteArchive} />
        <Route path="/about"                   component={RouteAbout} />
        <Route path="/contact"                 component={RouteContact} />
        <Route path="/community"               component={RouteCommunity} />
        <Route path="/community/feed"          component={RouteCommunityFeed} />
        <Route path="/community/discussions"   component={RouteCommunityDiscuss} />
        <Route path="/community/events"        component={RouteCommunityEvents} />
        <Route path="/login"                   component={RouteLogin} />
        <Route path="/account"                 component={RouteAccount} />
        <Route path="/account/profile"         component={RouteProfile} />
        <Route path="/account/collections"     component={RouteCollections} />
        <Route path="/account/notifications"   component={RouteNotifications} />
        <Route path="/account/settings"        component={RouteSettings} />
        <Route path="/account/edit/:slug"      component={RouteEditArticle} />
        <Route path="/submit"                  component={RouteSubmit} />
        <Route path="/profile/:userId"         component={RoutePublicProfile} />
        <Route path="/submit/details"          component={RouteSubmitDetails} />
        <Route path="/submit/upload"           component={RouteSubmitUpload} />
        <Route path="/submit/write"            component={RouteSubmitWrite} />
        <Route path="/submit/preview"          component={RouteSubmitPreview} />
        <Route path="/submit/success"          component={RouteSubmitSuccess} />
        <Route path="/saved"                   component={RouteSaved} />
        <Route path="/privacy"                 component={RoutePrivacy} />
        <Route path="/terms"                   component={RouteTerms} />
        {/* Legacy category routes */}
        <Route path="/categories/:slug"        component={RouteCategories} />

        {/* Admin */}
        <Route path="/admin/login"             component={RouteAdminLogin} />
        <Route path="/admin"                   component={RouteAdminDashboard} />
        <Route path="/admin/articles"          component={RouteAdminArticles} />
        <Route path="/admin/articles/new"      component={RouteAdminNewArticle} />
        <Route path="/admin/papers"            component={RouteAdminPapers} />
        <Route path="/admin/papers/new"        component={RouteAdminNewPaper} />
        <Route path="/admin/submissions"       component={RouteAdminSubmissions} />
        <Route path="/admin/newsletter"        component={RouteAdminNewsletter} />
        <Route path="/admin/settings"          component={RouteAdminSettings} />
        <Route path="/admin/users"             component={RouteAdminUsers} />

        <Route path="/messages"                component={RouteMessages} />
        <Route path="/messages/:id"            component={RouteConversation} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}

/**
 * Publishing, editing, and deleting all announce themselves with an
 * "anv:content-changed" event. Listening for it here â€” on the query client
 * rather than inside one page â€” means the cached listings are dropped no
 * matter which screen the editor is on.
 *
 * Previously only the home page listened, and only while it was mounted. An
 * editor publishing from the admin desk was by definition not on the home
 * page, so nothing invalidated the cache; navigating to the front page then
 * reused the listing fetched before the publish, and the new work appeared to
 * be missing from the site.
 */
if (typeof window !== "undefined") {
  window.addEventListener("anv:content-changed", () => {
    void queryClient.invalidateQueries();
  });
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
