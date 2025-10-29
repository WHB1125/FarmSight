import { useState } from 'react';
import { Leaf, ShoppingCart, Package, Clock, LogOut, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PriceMonitor } from '../components/PriceMonitor';
import { PriceAnalytics } from '../components/PriceAnalytics';

export function RetailerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'analytics'>('overview');

  const stats = [
    { icon: ShoppingCart, label: 'Orders This Month', value: '156', color: 'bg-orange-100 text-orange-600' },
    { icon: Package, label: 'Available Stock', value: '2,340kg', color: 'bg-green-100 text-green-600' },
    { icon: Clock, label: 'Pending Deliveries', value: '8', color: 'bg-blue-100 text-blue-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-xl mr-4">
              <Leaf className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FarmSight</h1>
              <p className="text-sm text-gray-600">Retailer Dashboard</p>
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
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'prices'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Market Prices
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-orange-600 text-white shadow-md'
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
            Inventory & Orders
          </h2>
          <p className="text-gray-600">Manage your product orders and track deliveries.</p>
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Available Products</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Organic Tomatoes</p>
                  <p className="text-sm text-gray-600">Fresh from Green Valley Farm</p>
                  <p className="text-xs text-green-600 mt-1">850kg available</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">$4.50/kg</p>
                  <button className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Order Now
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Sweet Corn</p>
                  <p className="text-sm text-gray-600">Fresh from Sunshine Acres</p>
                  <p className="text-xs text-green-600 mt-1">620kg available</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">$3.20/kg</p>
                  <button className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Order Now
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Fresh Lettuce</p>
                  <p className="text-sm text-gray-600">Fresh from River Bend Farm</p>
                  <p className="text-xs text-yellow-600 mt-1">180kg available</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">$2.80/kg</p>
                  <button className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Order Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">Order #1234</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Delivered
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">250kg Tomatoes</p>
                  <p className="text-xs text-gray-500 mt-1">Delivered 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">Order #1235</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      In Transit
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">180kg Corn</p>
                  <p className="text-xs text-gray-500 mt-1">Expected in 4 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">Order #1236</p>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                      Processing
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">120kg Lettuce</p>
                  <p className="text-xs text-gray-500 mt-1">Processing at warehouse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeTab === 'prices' && <PriceMonitor userRole="retailer" />}

        {activeTab === 'analytics' && <PriceAnalytics userRole="retailer" />}
      </main>
    </div>
  );
}
