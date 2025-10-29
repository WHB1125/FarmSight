import { useState } from 'react';
import { Leaf, Users, TrendingUp, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PriceMonitor } from '../components/PriceMonitor';
import { PriceAnalytics } from '../components/PriceAnalytics';

export function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'analytics'>('overview');

  const stats = [
    { icon: Users, label: 'Active Farmers', value: '24', color: 'bg-blue-100 text-blue-600' },
    { icon: TrendingUp, label: 'Total Yield', value: '45.2T', color: 'bg-green-100 text-green-600' },
    { icon: BarChart3, label: 'Distribution Rate', value: '92%', color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-xl mr-4">
              <Leaf className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FarmSight</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
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
        </div>
        {activeTab === 'overview' && (
        <>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Supply Chain Overview
          </h2>
          <p className="text-gray-600">Monitor and manage farm operations across your network.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-4 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Top Performing Farms</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Green Valley Farm</p>
                  <p className="text-sm text-gray-600">1,250kg this month</p>
                </div>
                <div className="text-green-600 font-bold">+15%</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Sunshine Acres</p>
                  <p className="text-sm text-gray-600">980kg this month</p>
                </div>
                <div className="text-green-600 font-bold">+12%</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">River Bend Farm</p>
                  <p className="text-sm text-gray-600">875kg this month</p>
                </div>
                <div className="text-green-600 font-bold">+8%</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pending Actions</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <div>
                  <p className="font-medium text-gray-900">Quality Check Required</p>
                  <p className="text-sm text-gray-600">5 batches awaiting inspection</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Review Now
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div>
                  <p className="font-medium text-gray-900">Distribution Schedule</p>
                  <p className="text-sm text-gray-600">Plan routes for 12 deliveries</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Schedule
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <div>
                  <p className="font-medium text-gray-900">Urgent: Stock Alert</p>
                  <p className="text-sm text-gray-600">3 items below minimum threshold</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Take Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === 'prices' && <PriceMonitor userRole="manager" />}

        {activeTab === 'analytics' && <PriceAnalytics userRole="manager" />}
      </main>
    </div>
  );
}
