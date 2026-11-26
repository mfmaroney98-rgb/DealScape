import { useState, useEffect, useCallback } from 'react';
import { ndaService } from '../services/ndaService';
import { signingService } from '../services/signingService';
import { supabase } from '../lib/supabase';
import NdaSigningModal from './NdaSigningModal';
import {
  FileSignature,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Download,
  MessageSquare,
  Building2,
  AlertCircle,
} from 'lucide-react';

const STATUS_BADGE = {
  requested: { label: 'Pending Approval', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  awaiting_buyer_signature: { label: 'Awaiting Buyer Signature', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  in_redline: { label: 'In Redline', cls: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  awaiting_seller_countersign: { label: 'Needs Countersign', cls: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  executed: { label: 'Executed', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  declined: { label: 'Declined', cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

export default function SellerNdaPipeline({ listingId, orgId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeModalReq, setActiveModalReq] = useState(null);

  const loadRequests = useCallback(async () => {
    if (!listingId) return;
    try {
      setLoading(true);
      const data = await ndaService.getSellerListingNdaRequests(listingId);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load NDA requests:', err);
      setError(err.message || 'Failed to load NDA requests.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    loadRequests();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, name, first_name, last_name, title, email')
        .eq('id', user.id)
        .maybeSingle();
      setCurrentUser(profile || { id: user.id, email: user.email });
    });
  }, [loadRequests]);

  const handleApprove = async (req) => {
    setActionId(req.id);
    setError(null);
    try {
      await ndaService.approveNdaRequest({
        ndaRequestId: req.id,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
      });
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Failed to approve NDA request.');
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (req) => {
    const reason = window.prompt('Optional reason for declining this NDA request:') ?? null;
    if (reason === null) return;
    setActionId(req.id);
    setError(null);
    try {
      await ndaService.declineNdaRequest({
        ndaRequestId: req.id,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
        reason,
      });
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Failed to decline NDA request.');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleCim = async (req, granted) => {
    setActionId(req.id);
    setError(null);
    try {
      await ndaService.setCimAccess({
        ndaRequestId: req.id,
        granted,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
      });
      await loadRequests();
    } catch (err) {
      setError(err.message || 'Failed to update CIM access.');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-indigo-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-12 rounded-2xl border border-slate-200/60 dark:border-slate-700/40 text-center flex flex-col items-center justify-center min-h-[320px]">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl mb-4 flex items-center justify-center text-indigo-500">
            <FileSignature size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No NDA Requests Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            When buyers request an NDA for this listing, their firm profile, signature status, redlines, and CIM access controls will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const badge = STATUS_BADGE[req.status] || STATUS_BADGE.requested;
            const buyerOrgName = req.buyer_org?.organization_name || 'Buyer Organization';
            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Building2 size={16} className="text-indigo-500 shrink-0" />
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {buyerOrgName}
                    </span>
                    {req.buyer_org?.buyer_type && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {req.buyer_org.buyer_type}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {req.status === 'executed' && (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          req.cim_access_granted
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}
                      >
                        {req.cim_access_granted ? <Unlock size={11} /> : <Lock size={11} />}
                        {req.cim_access_granted ? 'CIM Unlocked' : 'CIM Locked'}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Requested by {req.requested_by?.name || req.requested_by?.email || 'Buyer user'} on{' '}
                    {new Date(req.created_at).toLocaleDateString()}
                    {req.buyer_org?.headquarters && ` · HQ: ${req.buyer_org.headquarters}`}
                  </div>

                  {req.request_note && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/50 px-3 py-2 rounded-lg mt-1">
                      “{req.request_note}”
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {req.status === 'requested' && (
                    <>
                      <button
                        type="button"
                        disabled={actionId === req.id}
                        onClick={() => handleApprove(req)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {actionId === req.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                        Approve &amp; Send NDA
                      </button>
                      <button
                        type="button"
                        disabled={actionId === req.id}
                        onClick={() => handleDecline(req)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <XCircle size={14} /> Decline
                      </button>
                    </>
                  )}

                  {req.status === 'awaiting_seller_countersign' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalReq(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <FileSignature size={14} /> Countersign NDA
                    </button>
                  )}

                  {req.status === 'in_redline' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalReq(req)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                    >
                      <MessageSquare size={14} /> Review Redline
                    </button>
                  )}

                  {req.status === 'executed' && (
                    <>
                      <button
                        type="button"
                        disabled={actionId === req.id}
                        onClick={() => handleToggleCim(req, !req.cim_access_granted)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 ${
                          req.cim_access_granted
                            ? 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {req.cim_access_granted ? <Lock size={14} /> : <Unlock size={14} />}
                        {req.cim_access_granted ? 'Revoke CIM' : 'Grant CIM Access'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await signingService.getExecutedPdf({ ndaRequestId: req.id });
                          window.open(url, '_blank');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Download size={14} /> Executed PDF
                      </button>
                    </>
                  )}

                  {req.status !== 'requested' && (
                    <button
                      type="button"
                      onClick={() => setActiveModalReq(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Details / Audit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NdaSigningModal
        isOpen={Boolean(activeModalReq)}
        onClose={() => setActiveModalReq(null)}
        ndaRequest={activeModalReq}
        role="seller"
        currentUser={currentUser}
        orgId={orgId}
        onUpdated={async () => {
          await loadRequests();
        }}
      />
    </div>
  );
}
