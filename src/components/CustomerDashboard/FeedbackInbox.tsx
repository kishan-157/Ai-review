import React, { useState } from 'react';
import {
  MessageSquare,
  Star,
  Clock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { Business, PrivateFeedback } from '../../types';
import { api } from '../../services/api';

interface FeedbackInboxProps {
  feedbackList: PrivateFeedback[];
  businesses: Business[];
  onFeedbackUpdated: (updated: PrivateFeedback) => void;
}

export const FeedbackInbox: React.FC<FeedbackInboxProps> = ({
  feedbackList,
  businesses,
  onFeedbackUpdated,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<string>('');

  const filtered = feedbackList.filter((fb) => {
    if (selectedStatus !== 'all' && fb.status !== selectedStatus) return false;
    if (selectedBusiness !== 'all' && fb.businessId !== selectedBusiness) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchMsg = fb.message.toLowerCase().includes(q);
      const matchName = fb.customerName?.toLowerCase().includes(q);
      const matchPhone = fb.customerPhone?.includes(q);
      if (!matchMsg && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const handleStatusChange = async (fb: PrivateFeedback, newStatus: PrivateFeedback['status']) => {
    try {
      const updated = await api.updateFeedback(fb.id, { status: newStatus });
      onFeedbackUpdated(updated);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSaveNotes = async (fb: PrivateFeedback) => {
    try {
      const updated = await api.updateFeedback(fb.id, { adminNotes: notesInput });
      onFeedbackUpdated(updated);
      setEditingNotesId(null);
    } catch (err) {
      console.error('Failed to update notes', err);
    }
  };

  const getBusinessName = (bizId: string) => {
    return businesses.find((b) => b.id === bizId)?.name || 'Unknown Business';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span>Private Customer Feedback Inbox</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal confidential messages submitted directly by customers on your review page.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Business filter */}
          {businesses.length > 1 && (
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name, phone, or keyword..."
          className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No Feedback Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Any private direct feedback submitted by your customers will appear here.
            </p>
          </div>
        ) : (
          filtered.map((fb) => (
            <div
              key={fb.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 transition hover:border-purple-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-md">
                    {getBusinessName(fb.businessId)}
                  </span>
                  <div className="flex items-center text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-1.5">
                      {fb.rating}.0 / 5
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={fb.status}
                    onChange={(e) => handleStatusChange(fb, e.target.value as any)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                      fb.status === 'New'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : fb.status === 'In Progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <option value="New">● New</option>
                    <option value="In Progress">● In Progress</option>
                    <option value="Resolved">● Resolved</option>
                  </select>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{fb.message}"
              </p>

              {/* Customer Info & Notes */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  {fb.customerName && (
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {fb.customerName}
                    </span>
                  )}
                  {fb.customerPhone && (
                    <a
                      href={`tel:${fb.customerPhone}`}
                      className="flex items-center gap-1 text-purple-600 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {fb.customerPhone}
                    </a>
                  )}
                  {!fb.customerName && !fb.customerPhone && (
                    <span className="text-slate-400 italic">Anonymous customer</span>
                  )}
                </div>

                {/* Internal Notes Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingNotesId(editingNotesId === fb.id ? null : fb.id);
                    setNotesInput(fb.adminNotes || '');
                  }}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fb.adminNotes ? 'Edit Owner Notes' : '+ Add Owner Note'}</span>
                </button>
              </div>

              {/* Notes Drawer/Input */}
              {editingNotesId === fb.id && (
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2 mt-2">
                  <label className="block text-[11px] font-bold text-purple-900">
                    Internal Owner Notes (Confidential)
                  </label>
                  <textarea
                    rows={2}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="e.g. Called customer and offered complimentary beverage on next visit..."
                    className="w-full text-xs p-2.5 rounded-lg border border-purple-200 bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNotesId(null)}
                      className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(fb)}
                      className="px-3 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg hover:bg-purple-700"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}

              {fb.adminNotes && editingNotesId !== fb.id && (
                <div className="text-[11px] bg-slate-50 text-slate-600 p-2.5 rounded-lg border border-slate-200 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Internal Note: </span>
                    {fb.adminNotes}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
