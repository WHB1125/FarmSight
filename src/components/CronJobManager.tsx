import { useState, useEffect } from 'react';
import { Clock, Play, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CronJobStatus {
  jobid: number;
  schedule: string;
  command: string;
  active: boolean;
  jobname: string;
}

export function CronJobManager() {
  const [cronStatus, setCronStatus] = useState<CronJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCronStatus();
  }, []);

  async function loadCronStatus() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cron_job_status')
        .select('*')
        .single();

      if (error) throw error;
      setCronStatus(data);
    } catch (error) {
      console.error('Error loading cron status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerManualUpdate() {
    try {
      setTriggering(true);
      setMessage(null);

      const { data, error } = await supabase.rpc('manual_price_update');

      if (error) throw error;

      setLastTrigger(new Date());
      setMessage({
        type: 'success',
        text: 'Price update triggered successfully! Data will be refreshed in a few moments.',
      });

      setTimeout(() => setMessage(null), 5000);
    } catch (error: unknown) {
      console.error('Error triggering manual update:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to trigger price update',
      });
    } finally {
      setTriggering(false);
    }
  }

  function parseCronSchedule(schedule: string): string {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule;

    const [minute, hour] = parts;
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} UTC (${parseInt(hour) + 8}:${minute.padStart(2, '0')} Beijing Time)`;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Automatic Price Updates</h2>
            <p className="text-gray-600 text-sm mt-1">Monitor and manage scheduled data updates</p>
          </div>
        </div>
        <button
          onClick={loadCronStatus}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {cronStatus ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Job Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    cronStatus.active ? 'bg-green-500' : 'bg-red-500'
                  }`}
                ></div>
                <p className="text-lg font-semibold text-gray-900">
                  {cronStatus.active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Schedule</p>
              <p className="text-lg font-semibold text-gray-900">
                {parseCronSchedule(cronStatus.schedule)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Job Name</p>
              <p className="text-lg font-semibold text-gray-900">{cronStatus.jobname}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Job ID</p>
              <p className="text-lg font-semibold text-gray-900">#{cronStatus.jobid}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Trigger</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manually trigger a price update without waiting for the scheduled time. This will fetch
              the latest market prices and update the database.
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={triggerManualUpdate}
                disabled={triggering}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium"
              >
                <Play className={`w-5 h-5 ${triggering ? 'animate-spin' : ''}`} />
                {triggering ? 'Triggering Update...' : 'Trigger Price Update Now'}
              </button>

              {lastTrigger && (
                <p className="text-sm text-gray-600">
                  Last triggered: {lastTrigger.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatic updates run daily at 2:00 AM UTC (10:00 AM Beijing Time)</li>
              <li>• Fresh market prices are fetched from external sources and generated data</li>
              <li>• Old data older than 30 days is automatically cleaned up</li>
              <li>• Manual triggers are useful for testing or immediate updates</li>
              <li>• Updates are asynchronous and won't block the system</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No cron job found. Please check your database configuration.</p>
        </div>
      )}
    </div>
  );
}
