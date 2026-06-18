import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "./hooks/useTheme";
import { Layout } from "./components/Layout";

import { Home } from "./pages/Home";
import { ArticleDetail } from "./pages/ArticleDetail";
import { Papers } from "./pages/Papers";
import { PaperDetail } from "./pages/PaperDetail";
import { Category } from "./pages/Category";
import { Search } from "./pages/Search";
import { Submit } from "./pages/Submit";
import { About } from "./pages/About";

import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminArticles } from "./pages/admin/AdminArticles";
import { AdminArticleForm } from "./pages/admin/AdminArticleForm";
import { AdminPapers } from "./pages/admin/AdminPapers";
import { AdminSubmissions } from "./pages/admin/AdminSubmissions";
import { AdminNewsletter } from "./pages/admin/AdminNewsletter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1
        className="text-6xl font-bold mb-3"
        style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}
      >
        404
      </h1>
      <p className="text-base mb-6" style={{ color: "var(--muted-text)", fontFamily: "var(--font-body)" }}>
        The page you were looking for does not exist.
      </p>
      <a href="/" style={{ color: "var(--gold)", fontFamily: "var(--font-ui)", fontSize: "0.875rem" }}>
        Return home
      </a>
    </div>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/articles/new">
        <AdminLayout><AdminArticleForm /></AdminLayout>
      </Route>
      <Route path="/admin/articles/:slug/edit">
        {(params) => <AdminLayout><AdminArticleForm /></AdminLayout>}
      </Route>
      <Route path="/admin/articles">
        <AdminLayout><AdminArticles /></AdminLayout>
      </Route>
      <Route path="/admin/papers">
        <AdminLayout><AdminPapers /></AdminLayout>
      </Route>
      <Route path="/admin/submissions">
        <AdminLayout><AdminSubmissions /></AdminLayout>
      </Route>
      <Route path="/admin/newsletter">
        <AdminLayout><AdminNewsletter /></AdminLayout>
      </Route>
      <Route path="/admin">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
    </Switch>
  );
}

function PublicRoutes() {
  const { theme, toggle } = useTheme();
  return (
    <Layout theme={theme} onThemeToggle={toggle}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/articles/:slug" component={ArticleDetail} />
        <Route path="/papers/:slug" component={PaperDetail} />
        <Route path="/papers" component={Papers} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/search" component={Search} />
        <Route path="/submit" component={Submit} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/*?" component={AdminRoutes} />
      <Route component={PublicRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
