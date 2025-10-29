import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { RetailerDashboard } from './pages/RetailerDashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    if (showSignup) {
      return <SignupPage onNavigateToLogin={() => setShowSignup(false)} />;
    }
    return <LoginPage onNavigateToSignup={() => setShowSignup(true)} />;
  }

  switch (profile.role) {
    case 'farmer':
      return <FarmerDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'retailer':
      return <RetailerDashboard />;
    default:
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-red-600 font-medium">Invalid user role</p>
          </div>
        </div>
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
