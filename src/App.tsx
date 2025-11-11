import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { FarmerDashboard } from "./pages/FarmerDashboard";
import { ManagerDashboard } from "./pages/ManagerDashboard";
import { RetailerDashboard } from "./pages/RetailerDashboard";
import PricePredict from "./pages/PricePredict";

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  // 加载中状态
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

  // 登录或注册
  if (!user || !profile) {
    return showSignup ? (
      <SignupPage onNavigateToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginPage onNavigateToSignup={() => setShowSignup(true)} />
    );
  }

  // 登录后页面内容（不同角色）
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-md p-4 flex justify-between items-center">
        <div className="text-xl font-bold text-green-700">🌾 FarmSight</div>
        <div className="flex gap-4">
          {profile.role === "farmer" && (
            <Link
              to="/farmer"
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              Farmer Dashboard
            </Link>
          )}
          {profile.role === "manager" && (
            <Link
              to="/manager"
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              Manager Dashboard
            </Link>
          )}
          {profile.role === "retailer" && (
            <Link
              to="/retailer"
              className="text-gray-700 hover:text-green-600 font-medium"
            >
              Retailer Dashboard
            </Link>
          )}
          <Link
            to="/predict"
            className="text-gray-700 hover:text-green-600 font-medium"
          >
            AI Prediction
          </Link>
        </div>
      </nav>

      {/* 页面主体内容 */}
      <div className="p-6">
        <Routes>
          <Route path="/farmer" element={<FarmerDashboard />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/retailer" element={<RetailerDashboard />} />
          <Route path="/predict" element={<PricePredict />} />
          {/* 默认首页按角色跳转 */}
          <Route
            path="/"
            element={
              profile.role === "farmer" ? (
                <FarmerDashboard />
              ) : profile.role === "manager" ? (
                <ManagerDashboard />
              ) : (
                <RetailerDashboard />
              )
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
