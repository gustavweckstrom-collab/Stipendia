import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Scholarships from "./pages/Scholarships";
import ScholarshipDetail from "./pages/ScholarshipDetail";
import DraftPage from "./pages/DraftPage";
import Drafts from "./pages/Drafts";
import Matches from "./pages/Matches";
import Saved from "./pages/Saved";
import FAQ from "./pages/FAQ";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Layout>
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
        </Layout>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
