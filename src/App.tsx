import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/layout/Layout";

const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const ScholarshipDetail = lazy(() => import("./pages/ScholarshipDetail"));
const DraftPage = lazy(() => import("./pages/DraftPage"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Matches = lazy(() => import("./pages/Matches"));
const Saved = lazy(() => import("./pages/Saved"));
const FAQ = lazy(() => import("./pages/FAQ"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Layout>
          <Suspense fallback={<div className="px-4 py-10 text-center text-sm text-muted-foreground">Stipendia</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profil" element={<Profile />} />
              <Route path="/stipendier" element={<Scholarships />} />
              <Route path="/stipendier/:id" element={<ScholarshipDetail />} />
              <Route path="/matchningar" element={<Matches />} />
              <Route path="/sparade" element={<Saved />} />
              <Route path="/utkast" element={<Drafts />} />
              <Route path="/ansokningar" element={<Drafts />} />
              <Route path="/utkast/:id" element={<DraftPage />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/installningar" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
