import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { Spinner } from "./components/Ui";

const LoginPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.ForgotPasswordPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })));
const DocumentDetailPage = lazy(() => import("./pages/DocumentDetailPage").then((module) => ({ default: module.DocumentDetailPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then((module) => ({ default: module.HistoryPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const GeneralChatPage = lazy(() => import("./pages/GeneralChatPage").then((module) => ({ default: module.GeneralChatPage })));

function ProtectedWorkspace() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-canvas pt-24"><Spinner label="Loading workspace…" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export default function App() {
  return <Suspense fallback={<div className="min-h-screen bg-canvas pt-24"><Spinner label="Opening workspace…" /></div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedWorkspace />}>
        <Route index element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:documentId" element={<DocumentDetailPage />} />
        <Route path="/chat" element={<GeneralChatPage />} />
        <Route path="/chat/:conversationId" element={<GeneralChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>;
}
