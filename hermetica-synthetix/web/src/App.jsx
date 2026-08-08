import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// --- Auth pages (public, unprotected) ---
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// --- Synthetix AI section (original app root) ---
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ContentStudio from '@/pages/ContentStudio';
import MediaLibrary from '@/pages/MediaLibrary';
import Projects from '@/pages/Projects';
import SEOAnalytics from '@/pages/SEOAnalytics';
import Accessibility from '@/pages/Accessibility';
import Localization from '@/pages/Localization';
import AIAgents from '@/pages/AIAgents';
import Settings from '@/pages/Settings';
import Riley from '@/pages/Riley';
import ForgeAppLayout from '@/components/forge/ForgeAppLayout';
import RileyDashboard from '@/pages/forge/RileyDashboard';
import BuilderConsole from '@/pages/forge/BuilderConsole';
import AppBlueprints from '@/pages/forge/AppBlueprints';
import ForgeProjects from '@/pages/forge/ForgeProjects';
import PromptPipeline from '@/pages/forge/PromptPipeline';
import QADebugCentre from '@/pages/forge/QADebugCentre';
import OpenSourceLibrary from '@/pages/forge/OpenSourceLibrary';
import MemoryVault from '@/pages/forge/MemoryVault';
import SoulCore from '@/pages/forge/SoulCore';
import ForgeSettings from '@/pages/forge/ForgeSettings';
import CreationDashboard from '@/pages/forge/CreationDashboard';
import ImageGenerator from '@/pages/forge/ImageGenerator';
import VideoGenerator from '@/pages/forge/VideoGenerator';
import LandingPageBuilder from '@/pages/forge/LandingPageBuilder';
import PDFGenerator from '@/pages/forge/PDFGenerator';
import AgentBuilder from '@/pages/forge/AgentBuilder';
import CampaignKit from '@/pages/forge/CampaignKit';
import AuditCentre from '@/pages/forge/AuditCentre';
import BuildReports from '@/pages/forge/BuildReports';
import IntegrationsSettings from '@/pages/forge/IntegrationsSettings';
import FormSubmissions from '@/pages/forge/FormSubmissions';
import MeshCommandCenter from '@/pages/forge/MeshCommandCenter';
import MeshQueryComposer from '@/pages/forge/MeshQueryComposer';
import MeshNodeRegistry from '@/pages/forge/MeshNodeRegistry';
import MeshInboxPage from '@/pages/MeshInbox';
import ContinuityDashboard from '@/pages/ContinuityDashboard.jsx';
import SecurityDashboard from '@/pages/SecurityDashboard';
import IntegrationHub from '@/pages/IntegrationHub';
import WorkflowMonitor from '@/pages/WorkflowMonitor';
import CampaignPlanner from '@/pages/CampaignPlanner';
import AgentDirectory from '@/pages/AgentDirectory';
import FreelanceLedger from '@/pages/FreelanceLedger';
import AgentBlueprint from '@/pages/AgentBlueprint';
import PromptLibrary from '@/pages/PromptLibrary';

// --- Hermetica Forge section: /hermetica/* (core), /crystal/*, /venture/*, /ops/* ---
import HermeticaAppLayout from '@/components/layout/HermeticaAppLayout';
import HermeticaDashboard from '@/pages/HermeticaDashboard';
import HermeticaProjects from '@/pages/HermeticaProjects';
import ProjectDetail from '@/pages/ProjectDetail';
import Validate from '@/pages/Validate';
import Agents from '@/pages/Agents';
import Knowledge from '@/pages/Knowledge';
import Tasks from '@/pages/Tasks';

import CrystalLayout from '@/components/crystal/CrystalLayout';
import CrystalDashboard from '@/pages/crystal/CrystalDashboard';
import CrystalProducts from '@/pages/crystal/CrystalProducts';
import CrystalCustomers from '@/pages/crystal/CrystalCustomers';
import CrystalLiveSale from '@/pages/crystal/CrystalLiveSale';
import CrystalBaskets from '@/pages/crystal/CrystalBaskets';
import CrystalOrders from '@/pages/crystal/CrystalOrders';
import CrystalFulfilment from '@/pages/crystal/CrystalFulfilment';
import CrystalMessages from '@/pages/crystal/CrystalMessages';
import CrystalAnalytics from '@/pages/crystal/CrystalAnalytics';
import CrystalSettings from '@/pages/crystal/CrystalSettings';

import VentureLayout from '@/components/venture/VentureLayout';
import VentureDashboard from '@/pages/venture/VentureDashboard';
import MicroApps from '@/pages/venture/MicroApps';
import NicheOpportunities from '@/pages/venture/NicheOpportunities';
import GrowthCampaigns from '@/pages/venture/GrowthCampaigns';
import VentureFinancials from '@/pages/venture/VentureFinancials';
import AgentControl from '@/pages/venture/AgentControl';

import OpsLayout from '@/components/forge/OpsLayout';
import ControlCentre from '@/pages/forge/ControlCentre';
import OpsVentures from '@/pages/forge/Ventures';
import OpsVentureDetail from '@/pages/forge/VentureDetail';
import OpsApprovals from '@/pages/forge/Approvals';
import OpsEvidence from '@/pages/forge/Evidence';
import RemediationReportPage from '@/pages/forge/RemediationReportPage';

const AuthenticatedApp = () => (
  <ErrorBoundary>
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Synthetix AI — main app shell */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/content" element={<ErrorBoundary><ContentStudio /></ErrorBoundary>} />
          <Route path="/media" element={<ErrorBoundary><MediaLibrary /></ErrorBoundary>} />
          <Route path="/projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
          <Route path="/seo" element={<ErrorBoundary><SEOAnalytics /></ErrorBoundary>} />
          <Route path="/accessibility" element={<ErrorBoundary><Accessibility /></ErrorBoundary>} />
          <Route path="/localization" element={<ErrorBoundary><Localization /></ErrorBoundary>} />
          <Route path="/agents" element={<ErrorBoundary><AIAgents /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="/riley" element={<ErrorBoundary><Riley /></ErrorBoundary>} />
          <Route path="/mesh" element={<ErrorBoundary><MeshInboxPage /></ErrorBoundary>} />
          <Route path="/continuity" element={<ErrorBoundary><ContinuityDashboard /></ErrorBoundary>} />
          <Route path="/security" element={<ErrorBoundary><SecurityDashboard /></ErrorBoundary>} />
          <Route path="/integration-hub" element={<ErrorBoundary><IntegrationHub /></ErrorBoundary>} />
          <Route path="/workflow-monitor" element={<ErrorBoundary><WorkflowMonitor /></ErrorBoundary>} />
          <Route path="/campaign-planner" element={<ErrorBoundary><CampaignPlanner /></ErrorBoundary>} />
          <Route path="/agent-directory" element={<ErrorBoundary><AgentDirectory /></ErrorBoundary>} />
          <Route path="/freelance-ledger" element={<ErrorBoundary><FreelanceLedger /></ErrorBoundary>} />
          <Route path="/agent-blueprint" element={<ErrorBoundary><AgentBlueprint /></ErrorBoundary>} />
          <Route path="/prompt-library" element={<ErrorBoundary><PromptLibrary /></ErrorBoundary>} />
        </Route>

        {/* Synthetix AI — Riley Forge builder tools */}
        <Route path="/forge" element={<ForgeAppLayout />}>
          <Route index element={<ErrorBoundary><RileyDashboard /></ErrorBoundary>} />
          <Route path="builder" element={<ErrorBoundary><BuilderConsole /></ErrorBoundary>} />
          <Route path="blueprints" element={<ErrorBoundary><AppBlueprints /></ErrorBoundary>} />
          <Route path="projects" element={<ErrorBoundary><ForgeProjects /></ErrorBoundary>} />
          <Route path="prompts" element={<ErrorBoundary><PromptPipeline /></ErrorBoundary>} />
          <Route path="qa" element={<ErrorBoundary><QADebugCentre /></ErrorBoundary>} />
          <Route path="oss" element={<ErrorBoundary><OpenSourceLibrary /></ErrorBoundary>} />
          <Route path="memory" element={<ErrorBoundary><MemoryVault /></ErrorBoundary>} />
          <Route path="soul" element={<ErrorBoundary><SoulCore /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><ForgeSettings /></ErrorBoundary>} />
          <Route path="creation" element={<ErrorBoundary><CreationDashboard /></ErrorBoundary>} />
          <Route path="image-gen" element={<ErrorBoundary><ImageGenerator /></ErrorBoundary>} />
          <Route path="video-gen" element={<ErrorBoundary><VideoGenerator /></ErrorBoundary>} />
          <Route path="landing-builder" element={<ErrorBoundary><LandingPageBuilder /></ErrorBoundary>} />
          <Route path="pdf-gen" element={<ErrorBoundary><PDFGenerator /></ErrorBoundary>} />
          <Route path="agent-builder" element={<ErrorBoundary><AgentBuilder /></ErrorBoundary>} />
          <Route path="campaign-kit" element={<ErrorBoundary><CampaignKit /></ErrorBoundary>} />
          <Route path="audit-centre" element={<ErrorBoundary><AuditCentre /></ErrorBoundary>} />
          <Route path="build-reports" element={<ErrorBoundary><BuildReports /></ErrorBoundary>} />
          <Route path="integrations" element={<ErrorBoundary><IntegrationsSettings /></ErrorBoundary>} />
          <Route path="form-submissions" element={<ErrorBoundary><FormSubmissions /></ErrorBoundary>} />
          <Route path="mesh" element={<ErrorBoundary><MeshCommandCenter /></ErrorBoundary>} />
          <Route path="mesh/query" element={<ErrorBoundary><MeshQueryComposer /></ErrorBoundary>} />
          <Route path="mesh/nodes" element={<ErrorBoundary><MeshNodeRegistry /></ErrorBoundary>} />
        </Route>

        {/* Hermetica Forge — core project/venture-validation workspace */}
        <Route element={<HermeticaAppLayout />}>
          <Route path="/hermetica" element={<ErrorBoundary><HermeticaDashboard /></ErrorBoundary>} />
          <Route path="/hermetica/projects" element={<ErrorBoundary><HermeticaProjects /></ErrorBoundary>} />
          <Route path="/hermetica/projects/:id" element={<ErrorBoundary><ProjectDetail /></ErrorBoundary>} />
          <Route path="/hermetica/validate" element={<ErrorBoundary><Validate /></ErrorBoundary>} />
          <Route path="/hermetica/agents" element={<ErrorBoundary><Agents /></ErrorBoundary>} />
          <Route path="/hermetica/knowledge" element={<ErrorBoundary><Knowledge /></ErrorBoundary>} />
          <Route path="/hermetica/tasks" element={<ErrorBoundary><Tasks /></ErrorBoundary>} />
        </Route>

        {/* Hermetica Forge — Crystal commerce platform */}
        <Route element={<CrystalLayout />}>
          <Route path="/crystal" element={<ErrorBoundary><CrystalDashboard /></ErrorBoundary>} />
          <Route path="/crystal/products" element={<ErrorBoundary><CrystalProducts /></ErrorBoundary>} />
          <Route path="/crystal/customers" element={<ErrorBoundary><CrystalCustomers /></ErrorBoundary>} />
          <Route path="/crystal/live-sale" element={<ErrorBoundary><CrystalLiveSale /></ErrorBoundary>} />
          <Route path="/crystal/baskets" element={<ErrorBoundary><CrystalBaskets /></ErrorBoundary>} />
          <Route path="/crystal/orders" element={<ErrorBoundary><CrystalOrders /></ErrorBoundary>} />
          <Route path="/crystal/fulfilment" element={<ErrorBoundary><CrystalFulfilment /></ErrorBoundary>} />
          <Route path="/crystal/messages" element={<ErrorBoundary><CrystalMessages /></ErrorBoundary>} />
          <Route path="/crystal/analytics" element={<ErrorBoundary><CrystalAnalytics /></ErrorBoundary>} />
          <Route path="/crystal/settings" element={<ErrorBoundary><CrystalSettings /></ErrorBoundary>} />
        </Route>

        {/* Hermetica Forge — Venture Studio */}
        <Route element={<VentureLayout />}>
          <Route path="/venture" element={<ErrorBoundary><VentureDashboard /></ErrorBoundary>} />
          <Route path="/venture/apps" element={<ErrorBoundary><MicroApps /></ErrorBoundary>} />
          <Route path="/venture/opportunities" element={<ErrorBoundary><NicheOpportunities /></ErrorBoundary>} />
          <Route path="/venture/campaigns" element={<ErrorBoundary><GrowthCampaigns /></ErrorBoundary>} />
          <Route path="/venture/financials" element={<ErrorBoundary><VentureFinancials /></ErrorBoundary>} />
          <Route path="/venture/agents" element={<ErrorBoundary><AgentControl /></ErrorBoundary>} />
        </Route>

        {/* Hermetica Forge — Sovereign Forge ops control centre (was /forge in the source app) */}
        <Route path="/ops" element={<OpsLayout />}>
          <Route index element={<ErrorBoundary><ControlCentre /></ErrorBoundary>} />
          <Route path="ventures" element={<ErrorBoundary><OpsVentures /></ErrorBoundary>} />
          <Route path="ventures/:id" element={<ErrorBoundary><OpsVentureDetail /></ErrorBoundary>} />
          <Route path="approvals" element={<ErrorBoundary><OpsApprovals /></ErrorBoundary>} />
          <Route path="evidence" element={<ErrorBoundary><OpsEvidence /></ErrorBoundary>} />
          <Route path="remediation" element={<ErrorBoundary><RemediationReportPage /></ErrorBoundary>} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  </ErrorBoundary>
);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
