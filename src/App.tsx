import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import Matches from "./pages/Matches";
import Leagues from "./pages/Leagues";
import AdminPanel from "./pages/AdminPanel";
import CreateLeague from "./pages/CreateLeague";
import ManageLeague from "./pages/ManageLeague";
import CreateTeam from "./pages/CreateTeam";
import JoinLeague from "./pages/JoinLeague";
import ManageTeam from "./pages/ManageTeam";
import Standings from "./pages/Standings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/create-league" element={<CreateLeague />} />
            <Route path="/manage-league/:leagueId" element={<ManageLeague />} />
            <Route path="/create-team" element={<CreateTeam />} />
            <Route path="/join-league/:teamId" element={<JoinLeague />} />
            <Route path="/manage-team/:teamId" element={<ManageTeam />} />
            <Route path="/standings" element={<Standings />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
