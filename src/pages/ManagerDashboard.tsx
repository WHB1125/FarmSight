import { useState } from 'react';
import { BarChart3, LogOut, UserCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PriceMonitor } from '../components/PriceMonitor';
import { PriceAnalytics } from '../components/PriceAnalytics';
import { UserCenter } from '../components/UserCenter';
import { AIChatbot } from '../components/AIChatbot';
import { CronJobManager } from '../components/CronJobManager';

export function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'prices' | 'analytics' | 'profile' | 'cron'>('prices');


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/image copy.png" alt="JSAgriSmart Logo" className="w-12 h-12 mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JSAgriSmart</h1>
              <p className="text-sm text-gray-600">Manager Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{profile?.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="bg-blue-50 border-b border-blue-200 py-2">
        <p className="text-center text-sm text-blue-800">
          This is a test version, created by students of XJTLU, and it is for non-commercial use only.
        </p>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'prices'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Market Prices
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('cron')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cron'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Auto Updates
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            User Center
          </button>
        </div>

        {activeTab === 'prices' && <PriceMonitor userRole="manager" />}

        {activeTab === 'analytics' && <PriceAnalytics userRole="manager" />}

        {activeTab === 'cron' && <CronJobManager />}

        {activeTab === 'profile' && <UserCenter onViewProduct={() => setActiveTab('prices')} />}
      </main>
      <AIChatbot />
    </div>
  );
}
