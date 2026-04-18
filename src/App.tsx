import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Provider } from "react-redux";
import { store } from "./store/store";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Surveys from "./pages/Surveys";
import SurveyBuilder from "./pages/SurveyBuilder";
import SurveyWizard from "./pages/SurveyWizard";
import SurveyAssignment from "./pages/SurveyAssignment";
import SurveyStats from "./pages/SurveyStats";
import SurveyReports from "./pages/SurveyReports";
import Users from "./pages/Users";
import Devices from "./pages/Devices";
import GeoFencing from "./pages/GeoFencing";
import LocationManagement from "./pages/LocationManagement";
import ZoneManagement from "./pages/ZoneManagement";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Help from "./pages/Help";
import ActivityLogs from "./pages/ActivityLogs";
import MasterData from "./pages/MasterData";
import Menus from "./pages/Menus";
import Permissions from "./pages/Permissions";
import ManagePermissions from "./pages/ManagePermissions";
import Settings from "./pages/Settings";
import Responses from "./pages/Responses";
import Crosstab from "./pages/Crosstab";
import PerformanceAnalytics from "./pages/PerformanceAnalytics";
import PublicSurvey from "./pages/PublicSurvey";
import PrivateSurvey from "./pages/PrivateSurvey";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
  <ThemeProvider defaultTheme="system" storageKey="surveyflow-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/survey/:id" element={<PublicSurvey />} />
            <Route path="/survey/private/:id" element={<PrivateSurvey />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
            <Route path="/surveys/new" element={<ProtectedRoute><SurveyWizard /></ProtectedRoute>} />
            <Route path="/surveys/builder" element={<ProtectedRoute><SurveyBuilder /></ProtectedRoute>} />
            <Route path="/surveys/builder/:surveyId" element={<ProtectedRoute><SurveyBuilder /></ProtectedRoute>} />
            <Route path="/surveys/assignment" element={<ProtectedRoute><SurveyAssignment /></ProtectedRoute>} />
            <Route path="/surveys/stats" element={<ProtectedRoute><SurveyStats /></ProtectedRoute>} />
            <Route path="/surveys/report/:surveyId" element={<ProtectedRoute><SurveyReports /></ProtectedRoute>} />
            <Route path="/responses" element={<ProtectedRoute><Responses /></ProtectedRoute>} />
            <Route path="/crosstab/:surveyId" element={<ProtectedRoute><Crosstab /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
            <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
            <Route path="/geofencing" element={<ProtectedRoute><GeoFencing /></ProtectedRoute>} />
            <Route path="/location-management" element={<ProtectedRoute><LocationManagement /></ProtectedRoute>} />
            <Route path="/zone-management" element={<ProtectedRoute><ZoneManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
            <Route path="/analytics/performance" element={<ProtectedRoute><PerformanceAnalytics /></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute><MasterData /></ProtectedRoute>} />
            <Route path="/menus" element={<ProtectedRoute><Menus /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute><Permissions /></ProtectedRoute>} />
            <Route path="/permissions/manage/:accountId" element={<ProtectedRoute><ManagePermissions /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
  </Provider>
);

export default App;
