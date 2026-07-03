import React, { lazy, Suspense } from "react";
import { Router, Route, Switch } from "wouter";
import { GridSkeleton } from "@/components/ui/Skeleton";

// ─── Public pages ───────────────────────────────────────────────────────────
const HomePage          = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const ExplorePage       = lazy(() => import("@/pages/ExplorePage").then((m) => ({ default: m.ExplorePage })));
const DomainsPage       = lazy(() => import("@/pages/DomainsPage").then((m) => ({ default: m.DomainsPage })));
const DomainDetailPage  = lazy(() => import("@/pages/DomainDetailPage").then((m) => ({ default: m.DomainDetailPage })));
const EssaysPage        = lazy(() => import("@/pages/EssaysPage").then((m) => ({ default: m.EssaysPage })));
const EssayDetailPage   = lazy(() => import("@/pages/EssayDetailPage").then((m) => ({ default: m.EssayDetailPage })));
const PapersPage        = lazy(() => import("@/pages/PapersPage").then((m) => ({ default: m.PapersPage })));
const PaperDetailPage   = lazy(() => import("@/pages/PaperDetailPage").then((m) => ({ default: m.PaperDetailPage })));
const ArchivePage       = lazy(() => import("@/pages/ArchivePage").then((m) => ({ default: m.ArchivePage })));
const SearchPage        = lazy(() => import("@/pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const AboutPage         = lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const CommunityPage     = lazy(() => import("@/pages/CommunityPage").then((m) => ({ default: m.CommunityPage })));
const ContactPage       = lazy(() => import("@/pages/ContactPage").then((m) => ({ default: m.ContactPage })));

// ─── Community (auth-aware) ──────────────────────────────────────────────────
const CommunityFeedPage     = lazy(() => import("@/pages/community/CommunityFeedPage").then((m) => ({ default: m.CommunityFeedPage })));
const DiscussionsPage       = lazy(() => import("@/pages/community/DiscussionsPage").then((m) => ({ default: m.DiscussionsPage })));
const DiscussionDetailPage  = lazy(() => import("@/pages/community/DiscussionDetailPage").then((m) => ({ default: m.DiscussionDetailPage })));
const EventsPage            = lazy(() => import("@/pages/community/EventsPage").then((m) => ({ default: m.EventsPage })));

// ─── Auth ─────────────────────────────────────────────────────────────────────
const LoginPage  = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })));

// ─── Account ──────────────────────────────────────────────────────────────────
const AccountPage       = lazy(() => import("@/pages/account/AccountPage").then((m) => ({ default: m.AccountPage })));
const ProfilePage       = lazy(() => import("@/pages/account/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SavedPage         = lazy(() => import("@/pages/account/SavedPage").then((m) => ({ default: m.SavedPage })));
const DraftsPage        = lazy(() => import("@/pages/account/DraftsPage").then((m) => ({ default: m.DraftsPage })));
const SubmissionsPage   = lazy(() => import("@/pages/account/SubmissionsPage").then((m) => ({ default: m.SubmissionsPage })));
const CollectionsPage   = lazy(() => import("@/pages/account/CollectionsPage").then((m) => ({ default: m.CollectionsPage })));
const NotificationsPage = lazy(() => import("@/pages/account/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const SettingsPage      = lazy(() => import("@/pages/account/SettingsPage").then((m) => ({ default: m.SettingsPage })));

// ─── Writer ───────────────────────────────────────────────────────────────────
const WriterStartPage = lazy(() => import("@/pages/writer/WriterStartPage").then((m) => ({ default: m.WriterStartPage })));
const EditorPage      = lazy(() => import("@/pages/writer/EditorPage").then((m) => ({ default: m.EditorPage })));
const MetadataPage    = lazy(() => import("@/pages/writer/MetadataPage").then((m) => ({ default: m.MetadataPage })));
const PreviewPage     = lazy(() => import("@/pages/writer/PreviewPage").then((m) => ({ default: m.PreviewPage })));
const SubmitPage      = lazy(() => import("@/pages/writer/SubmitPage").then((m) => ({ default: m.SubmitPage })));

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminPage                  = lazy(() => import("@/pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminReviewPage            = lazy(() => import("@/pages/admin/AdminReviewPage").then((m) => ({ default: m.AdminReviewPage })));
const AdminSubmissionDetailPage  = lazy(() => import("@/pages/admin/AdminSubmissionDetailPage").then((m) => ({ default: m.AdminSubmissionDetailPage })));

// ─── 404 ──────────────────────────────────────────────────────────────────────
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

const FallbackLoading = () => (
  <div className="container py-20">
    <GridSkeleton count={3} />
  </div>
);

export function App() {
  return (
    <Router>
      <Suspense fallback={<FallbackLoading />}>
        <Switch>
          {/* Public */}
          <Route path="/" component={HomePage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/domains" component={DomainsPage} />
          <Route path="/domains/:slug" component={DomainDetailPage} />
          <Route path="/essays" component={EssaysPage} />
          <Route path="/essays/:slug" component={EssayDetailPage} />
          <Route path="/papers" component={PapersPage} />
          <Route path="/papers/:slug" component={PaperDetailPage} />
          <Route path="/archive" component={ArchivePage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/community" component={CommunityPage} />
          <Route path="/community/feed" component={CommunityFeedPage} />
          <Route path="/community/discussions" component={DiscussionsPage} />
          <Route path="/community/discussions/:id" component={DiscussionDetailPage} />
          <Route path="/community/events" component={EventsPage} />
          <Route path="/contact" component={ContactPage} />

          {/* Auth */}
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />

          {/* Account (protected) */}
          <Route path="/account" component={AccountPage} />
          <Route path="/account/profile" component={ProfilePage} />
          <Route path="/account/saved" component={SavedPage} />
          <Route path="/account/drafts" component={DraftsPage} />
          <Route path="/account/submissions" component={SubmissionsPage} />
          <Route path="/account/collections" component={CollectionsPage} />
          <Route path="/account/notifications" component={NotificationsPage} />
          <Route path="/account/settings" component={SettingsPage} />

          {/* Writer (protected) */}
          <Route path="/write" component={WriterStartPage} />
          <Route path="/write/new" component={EditorPage} />
          <Route path="/write/import" component={WriterStartPage} />
          <Route path="/write/drafts/:id" component={EditorPage} />
          <Route path="/write/drafts/:id/metadata" component={MetadataPage} />
          <Route path="/write/drafts/:id/preview" component={PreviewPage} />
          <Route path="/write/drafts/:id/submit" component={SubmitPage} />

          {/* Admin (protected, admin-only) */}
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/submissions" component={AdminReviewPage} />
          <Route path="/admin/submissions/:id" component={AdminSubmissionDetailPage} />

          {/* 404 */}
          <Route component={NotFoundPage} />
        </Switch>
      </Suspense>
    </Router>
  );
}
