import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Eye,
  QrCode,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Star,
  Info,
  Calendar,
} from 'lucide-react';
import { Business } from '../../types';
import { api } from '../../services/api';

interface CustomerAnalyticsProps {
  business: Business;
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ business }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    totalVisits: number;
    qrVisits: number;
    googleReviewClicks: number;
    aiGenerations: number;
    privateFeedbacks: number;
    ratingDist: Record<number, number>;
    recentEvents: any[];
  } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [business.id]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.getBusinessAnalytics(business.id);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-xs text-slate-400">Loading performance metrics...</p>
      </div>
    );
  }

  const maxRatingCount = Math.max(...Object.values(stats.ratingDist), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <span>Performance & Review Analytics</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time activity and customer engagement for <strong className="text-slate-700">{business.name}</strong>.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Review Page Visits</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalVisits}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total customer impressions</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Google Clicks</span>
            <ExternalLink className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.googleReviewClicks}</div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Intent to post on Google
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">AI Drafts Generated</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.aiGenerations}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Assisted reviews created</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Private Feedback</span>
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.privateFeedbacks}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Direct messages received</span>
        </div>
      </div>

      {/* Critical Policy / Google Review Disclaimer */}
      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-950 flex items-start gap-3">
        <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Transparency Notice:</span> "Google Clicks" measures the number of visitors who tapped your Google Review button after drafting their review. To comply with Google's Terms of Service, we never fake or scrape private Google accounts; final published reviews are securely hosted on your Google Business Profile.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rating Breakdown */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span>Interactive Rating Distribution</span>
          </h3>

          <div className="space-y-3 pt-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.ratingDist[stars] || 0;
              const percent = Math.round((count / maxRatingCount) * 100);
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="w-14 flex items-center gap-1 font-semibold text-slate-700">
                    <span>{stars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <span className="w-10 text-right font-bold text-slate-800">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Recent Engagement Stream</span>
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {stats.recentEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              stats.recentEvents.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="font-semibold text-slate-800 capitalize">
                      {ev.eventType.replace(/_/g, ' ')}
                    </span>
                    {ev.meta?.rating && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                        {ev.meta.rating} ★
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
