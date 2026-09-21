import React, { useState, useEffect, useCallback } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MyFiles } from './components/MyFiles';
import { UserSettings } from './components/UserSettings';
import { AdminPanel } from './components/AdminPanel';
import { PremiumModal } from './components/PremiumModal';
import { PaymentModal } from './components/PaymentModal';

// Tools
import { ImageToPdfTool } from './components/tools/ImageToPdfTool';
import { PdfEditorTool } from './components/tools/PdfEditorTool';
import { RenamePdfTool } from './components/tools/RenamePdfTool';
import { LockPdfTool } from './components/tools/LockPdfTool';
import { EditPdfTextTool } from './components/tools/EditPdfTextTool';
import { DrawOnPdfTool } from './components/tools/DrawOnPdfTool';
import { DeletePdfPagesTool } from './components/tools/DeletePdfPagesTool';

import {
  UserProfile,
  FeatureConfig,
  PaymentMethodConfig,
  UserFile,
  UserNotification,
  PaymentRequest,
} from './types';
import { api, getStoredToken, removeStoredToken } from './lib/api';

export default function App() {
  // Application Lifecycle states
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializingUser, setIsInitializingUser] = useState(true);

  // App Navigation
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEditorFile, setActiveEditorFile] = useState<{
    name: string;
    dataUrl: string;
  } | undefined>(undefined);

  // Core App Data
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [myPayments, setMyPayments] = useState<PaymentRequest[]>([]);

  // Modals state
  const [selectedFeatureForUpgrade, setSelectedFeatureForUpgrade] = useState<FeatureConfig | null>(
    null
  );
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const [paymentModalData, setPaymentModalData] = useState<{
    feature: FeatureConfig;
    planType: 'weekly' | 'monthly';
  } | null>(null);

  // Fetch Public App Settings & Features
  const fetchFeaturesAndConfig = useCallback(async () => {
    try {
      const [fRes, pRes] = await Promise.all([api.getFeatures(), api.getPaymentMethods()]);
      setFeatures(fRes.features);
      setPaymentMethods(pRes.payment_methods);
    } catch (err) {
      console.error('Failed to load initial features:', err);
    }
  }, []);

  // Fetch User-specific Data
  const fetchUserData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsInitializingUser(false);
      return;
    }

    try {
      const [uRes, fRes, nRes, pRes] = await Promise.all([
        api.getMe(),
        api.getFiles(),
        api.getNotifications(),
        api.getMyPayments(),
      ]);

      setUser(uRes.user);
      setFiles(fRes.files);
      setNotifications(nRes.notifications);
      setMyPayments(pRes.payments);
    } catch (err) {
      console.warn('User session invalid or expired:', err);
      removeStoredToken();
      setUser(null);
    } finally {
      setIsInitializingUser(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturesAndConfig();
    fetchUserData();
  }, [fetchFeaturesAndConfig, fetchUserData]);

  // Handle Logout
  const handleLogout = () => {
    removeStoredToken();
    setUser(null);
    setCurrentView('dashboard');
  };

  // Launch tool or verify subscription
  const handleSelectFeature = (featureId: string) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    // Check if paid and not unlocked
    const isUnlocked =
      !feat.is_paid ||
      user?.subscriptions?.some((s) => s.feature_id === featureId && s.status === 'active');

    if (!isUnlocked) {
      setSelectedFeatureForUpgrade(feat);
      setShowPremiumModal(true);
      return;
    }

    // Launch tool
    setCurrentView(featureId);
  };

  const handleOpenUpgradeForFeature = (featureId: string) => {
    const feat = features.find((f) => f.id === featureId);
    if (feat) {
      setSelectedFeatureForUpgrade(feat);
      setShowPremiumModal(true);
    }
  };

  const handleSelectPlan = (planType: 'weekly' | 'monthly') => {
    if (!selectedFeatureForUpgrade) return;
    setShowPremiumModal(false);
    setPaymentModalData({
      feature: selectedFeatureForUpgrade,
      planType,
    });
  };

  const handleOpenFileInEditor = (fileData: { name: string; dataUrl: string }) => {
    setActiveEditorFile(fileData);
    setCurrentView('edit-pdf');
  };

  // 1. Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Authentication Screen if user is not authenticated
  if (!user && !isInitializingUser) {
    return (
      <AuthScreen
        onSuccess={(loggedInUser: UserProfile) => {
          setUser(loggedInUser);
          fetchUserData();
          fetchFeaturesAndConfig();
        }}
        onOpenPrivacy={() => {}}
        onOpenTerms={() => {}}
      />
    );
  }

  // Fallback while restoring token session
  if (isInitializingUser && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Navigation Header */}
      {user && (
        <Header
          user={user}
          activeTab={currentView}
          setActiveTab={(tab: string) => {
            if (tab !== 'edit-pdf') setActiveEditorFile(undefined);
            setCurrentView(tab);
          }}
          onLogout={handleLogout}
          notifications={notifications}
          refreshNotifications={fetchUserData}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenAdmin={() => setCurrentView('admin')}
        />
      )}

      {/* Main Container Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* VIEW: Dashboard */}
        {currentView === 'dashboard' && user && (
          <Dashboard
            features={features}
            user={user}
            files={files}
            onSelectFeature={handleSelectFeature}
            onOpenMyFiles={() => setCurrentView('my-files')}
            onOpenUpgradeModal={handleOpenUpgradeForFeature}
          />
        )}

        {/* VIEW: My Files Personal Storage */}
        {currentView === 'my-files' && (
          <MyFiles
            files={files}
            onRefresh={fetchUserData}
            onOpenFileInEditor={handleOpenFileInEditor}
          />
        )}

        {/* VIEW: User Settings & Subscriptions */}
        {currentView === 'settings' && user && (
          <UserSettings
            user={user}
            onUserUpdated={(updated) => setUser(updated)}
            onLogout={handleLogout}
            myPayments={myPayments}
          />
        )}

        {/* VIEW: Master Admin Panel */}
        {currentView === 'admin' && (
          <AdminPanel
            onBack={() => setCurrentView('dashboard')}
            onRefreshAll={() => {
              fetchFeaturesAndConfig();
              fetchUserData();
            }}
          />
        )}

        {/* VIEW: Tool 1 - Image to PDF */}
        {currentView === 'image-to-pdf' && (
          <ImageToPdfTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 2 - Edit PDF */}
        {currentView === 'edit-pdf' && (
          <PdfEditorTool
            initialFile={activeEditorFile}
            onBack={() => {
              setActiveEditorFile(undefined);
              setCurrentView('dashboard');
            }}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 3 - Rename PDF */}
        {currentView === 'rename-pdf' && (
          <RenamePdfTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 4 - Lock PDF */}
        {currentView === 'lock-pdf' && (
          <LockPdfTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 5 - Edit PDF Text */}
        {currentView === 'edit-pdf-text' && (
          <EditPdfTextTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 6 - Draw on PDF */}
        {currentView === 'draw-on-pdf' && (
          <DrawOnPdfTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}

        {/* VIEW: Tool 7 - Delete PDF Pages */}
        {currentView === 'delete-pdf-pages' && (
          <DeletePdfPagesTool
            onBack={() => setCurrentView('dashboard')}
            onFileSaved={fetchUserData}
          />
        )}
      </main>

      {/* Subscription Tier Modal */}
      {selectedFeatureForUpgrade && (
        <PremiumModal
          feature={selectedFeatureForUpgrade}
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onSelectPlan={handleSelectPlan}
        />
      )}

      {/* Manual Payment Submission Modal */}
      {paymentModalData && user && (
        <PaymentModal
          user={user}
          feature={paymentModalData.feature}
          planType={paymentModalData.planType}
          paymentMethods={paymentMethods}
          isOpen={true}
          onClose={() => setPaymentModalData(null)}
          onPaymentSubmitted={() => {
            setPaymentModalData(null);
            fetchUserData();
          }}
        />
      )}
    </div>
  );
}
