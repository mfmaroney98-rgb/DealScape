import { useState, useEffect } from 'react';
import { signingService } from '../services/signingService';
import { ndaService } from '../services/ndaService';
import { ndaTemplateService } from '../services/ndaTemplateService';
import {
  X,
  FileSignature,
  Loader2,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageSquarePlus,
  Upload,
  History,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';

const EVENT_LABELS = {
  requested: 'NDA Requested',
  approved: 'Seller Approved & Sent NDA',
  declined: 'Seller Declined Request',
  withdrawn: 'Buyer Withdrew Request',
  viewed: 'NDA Viewed',
  redline_uploaded: 'Redline Uploaded',
  revised_nda_sent: 'Revised Clean NDA Sent for E-Sign',
  buyer_signed: 'Buyer Signed NDA',
  seller_countersigned: 'Seller Countersigned NDA',
  offline_executed: 'Offline Executed NDA Uploaded',
  cim_granted: 'CIM Access Granted',
  cim_revoked: 'CIM Access Revoked',
};

export default function NdaSigningModal({
  isOpen,
  onClose,
  ndaRequest,
  role, // 'buyer' | 'seller'
  currentUser,
  orgId,
  onUpdated,
}) {
  const [activeTab, setActiveTab] = useState('sign'); // 'sign' | 'redline' | 'audit'
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Signing form state
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [esignConsent, setEsignConsent] = useState(false);
  const [submittingSign, setSubmittingSign] = useState(false);

  // Redline / Offline state
  const [redlines, setRedlines] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [redlineFile, setRedlineFile] = useState(null);
  const [redlineComment, setRedlineComment] = useState('');
  const [uploadingRedline, setUploadingRedline] = useState(false);

  // Seller-only redline resolution actions
  const [revisedPdfFile, setRevisedPdfFile] = useState(null);
  const [offlineExecFile, setOfflineExecFile] = useState(null);
  const [offlineGrantCim, setOfflineGrantCim] = useState(true);
  const [resolvingRedline, setResolvingRedline] = useState(false);

  const [error, setError] = useState(null);

  const canSign =
    (role === 'buyer' && ndaRequest?.status === 'awaiting_buyer_signature') ||
    (role === 'seller' && ndaRequest?.status === 'awaiting_seller_countersign');

  useEffect(() => {
    if (!isOpen || !ndaRequest) return;

    setError(null);
    setEsignConsent(false);
    const fullName =
      currentUser?.name ||
      [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') ||
      '';
    setSignerName(fullName);
    setSignerTitle(currentUser?.title || '');
    setSignatureText(fullName);

    if (ndaRequest.status === 'in_redline') {
      setActiveTab('redline');
    } else if (canSign || ndaRequest.status === 'executed') {
      setActiveTab('sign');
    } else {
      setActiveTab('redline');
    }

    setLoadingPdf(true);
    signingService
      .getEmbeddedSignUrl({ ndaRequestId: ndaRequest.id })
      .then((res) => setPdfUrl(res.url))
      .catch((err) => setError(err.message || 'Failed to load NDA PDF'))
      .finally(() => setLoadingPdf(false));

    setLoadingMeta(true);
    Promise.all([
      ndaService.getRedlines(ndaRequest.id).catch(() => []),
      ndaService.getAuditEvents(ndaRequest.id).catch(() => []),
    ])
      .then(([r, a]) => {
        setRedlines(r);
        setAuditEvents(a);
      })
      .finally(() => setLoadingMeta(false));
  }, [isOpen, ndaRequest?.id, ndaRequest?.status]);

  if (!isOpen || !ndaRequest) return null;

  const handleSignSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSign(true);
    setError(null);
    try {
      const updated = await signingService.submitInternalSignature({
        ndaRequestId: ndaRequest.id,
        role,
        signerName,
        signerTitle,
        signatureText,
        esignConsent,
      });
      if (onUpdated) await onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit signature.');
    } finally {
      setSubmittingSign(false);
    }
  };

  const handleUploadRedline = async (e) => {
    e.preventDefault();
    if (!redlineFile) return;
    setUploadingRedline(true);
    setError(null);
    try {
      const { ndaRequest: updated } = await ndaService.uploadRedline({
        ndaRequestId: ndaRequest.id,
        file: redlineFile,
        role,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
        comment: redlineComment,
      });
      setRedlineFile(null);
      setRedlineComment('');
      const [r, a] = await Promise.all([
        ndaService.getRedlines(ndaRequest.id),
        ndaService.getAuditEvents(ndaRequest.id),
      ]);
      setRedlines(r);
      setAuditEvents(a);
      if (onUpdated) await onUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to upload redline.');
    } finally {
      setUploadingRedline(false);
    }
  };

  const handleSendRevisedPdf = async () => {
    if (!revisedPdfFile) return;
    setResolvingRedline(true);
    setError(null);
    try {
      const updated = await ndaService.sendRevisedNdaForEsign({
        ndaRequestId: ndaRequest.id,
        file: revisedPdfFile,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
        comment: 'Sent revised clean NDA for electronic signature',
      });
      setRevisedPdfFile(null);
      if (onUpdated) await onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send revised NDA.');
    } finally {
      setResolvingRedline(false);
    }
  };

  const handleUploadOfflineExecuted = async () => {
    if (!offlineExecFile) return;
    setResolvingRedline(true);
    setError(null);
    try {
      const updated = await ndaService.uploadOfflineExecutedNda({
        ndaRequestId: ndaRequest.id,
        file: offlineExecFile,
        userId: currentUser?.id,
        userOrgId: orgId,
        userEmail: currentUser?.email,
        grantCim: offlineGrantCim,
      });
      setOfflineExecFile(null);
      if (onUpdated) await onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload executed NDA.');
    } finally {
      setResolvingRedline(false);
    }
  };

  const handleDownloadRedline = async (filePath) => {
    try {
      const url = await ndaTemplateService.getSignedUrl(filePath, 120);
      window.open(url, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to open file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <FileSignature size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {role === 'seller' && ndaRequest.status === 'awaiting_seller_countersign'
                  ? 'Countersign Non-Disclosure Agreement'
                  : 'Non-Disclosure Agreement'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ndaRequest.source_nda_file_name} · Provider: {ndaRequest.signing_provider}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          {[
            { id: 'sign', label: canSign ? 'Review & Sign' : 'Document', icon: FileSignature },
            { id: 'redline', label: `Redline / Offline (${redlines.length})`, icon: MessageSquarePlus },
            { id: 'audit', label: `Audit Trail (${auditEvents.length})`, icon: History },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'sign' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* PDF Preview */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    NDA Document Preview
                  </span>
                  {pdfUrl && (
                    <div className="flex items-center gap-2">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline"
                      >
                        <ExternalLink size={12} /> Open in New Tab
                      </a>
                      <a
                        href={pdfUrl}
                        download={ndaRequest.source_nda_file_name || 'NDA.pdf'}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        <Download size={12} /> Download
                      </a>
                    </div>
                  )}
                </div>

                {loadingPdf ? (
                  <div className="h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="NDA PDF Preview"
                    className="w-full h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100"
                  />
                ) : (
                  <div className="h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-sm text-slate-500">
                    Unable to preview PDF.
                  </div>
                )}
              </div>

              {/* Signature Panel */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                {canSign ? (
                  <form onSubmit={handleSignSubmit} className="space-y-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                      <ShieldCheck size={17} />
                      {role === 'seller' ? 'Seller Countersignature' : 'Electronic Signature'}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        className="form-input w-full"
                        value={signerName}
                        onChange={(e) => {
                          setSignerName(e.target.value);
                          if (!signatureText || signatureText === signerName) {
                            setSignatureText(e.target.value);
                          }
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Title / Role
                      </label>
                      <input
                        type="text"
                        className="form-input w-full"
                        placeholder="e.g. Managing Director"
                        value={signerTitle}
                        onChange={(e) => setSignerTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Typed Signature
                      </label>
                      <input
                        type="text"
                        className="form-input w-full font-serif italic text-lg"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        required
                      />
                      {signatureText && (
                        <div className="mt-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-serif italic text-xl">
                          /s/ {signatureText}
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                        checked={esignConsent}
                        onChange={(e) => setEsignConsent(e.target.checked)}
                        required
                      />
                      <span>
                        I agree to be legally bound by this Non-Disclosure Agreement and consent to execute it electronically under the ESIGN Act.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={submittingSign || !esignConsent || !signerName.trim() || !signatureText.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submittingSign ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {role === 'seller' ? 'Countersign & Execute NDA' : 'Sign NDA'}
                    </button>

                    {role === 'buyer' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('redline')}
                        className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-indigo-500 transition-colors cursor-pointer"
                      >
                        Need legal changes? Upload a redline instead →
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Status: <span className="capitalize">{ndaRequest.status.replace(/_/g, ' ')}</span>
                    </div>
                    {ndaRequest.buyer_signed_at && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Buyer signed by <strong>{ndaRequest.buyer_signer_name}</strong> on{' '}
                        {new Date(ndaRequest.buyer_signed_at).toLocaleString()}
                      </div>
                    )}
                    {ndaRequest.seller_signed_at && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Seller countersigned by <strong>{ndaRequest.seller_signer_name}</strong> on{' '}
                        {new Date(ndaRequest.seller_signed_at).toLocaleString()}
                      </div>
                    )}
                    {ndaRequest.executed_pdf_path && (
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await signingService.getExecutedPdf({ ndaRequestId: ndaRequest.id });
                          window.open(url, '_blank');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Download size={14} /> Download Executed PDF + Certificate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'redline' && (
            <div className="space-y-6">
              {/* Redline history */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Redline &amp; Offline Exchange</h4>
                {loadingMeta ? (
                  <Loader2 className="animate-spin text-indigo-500" size={20} />
                ) : redlines.length === 0 ? (
                  <p className="text-xs text-slate-500">No redlines uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {redlines.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                              v{r.version_number} · {r.uploaded_by_role}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {r.file_name}
                            </span>
                            {r.is_final_executed && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                Final Executed
                              </span>
                            )}
                          </div>
                          {r.comment && <p className="text-xs text-slate-500 mt-1">{r.comment}</p>}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(r.created_at).toLocaleString()} · SHA-256: {r.file_sha256.slice(0, 12)}…
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadRedline(r.file_path)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Download size={13} /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload new redline */}
              {ndaRequest.status !== 'executed' && ndaRequest.status !== 'declined' && ndaRequest.status !== 'withdrawn' && (
                <form onSubmit={handleUploadRedline} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Upload Redline Markup (.docx or .pdf)
                  </h5>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="form-input py-2 w-full"
                    onChange={(e) => setRedlineFile(e.target.files?.[0] || null)}
                    required
                  />
                  <textarea
                    className="form-input w-full min-h-[70px]"
                    placeholder="Summary of requested changes or notes..."
                    value={redlineComment}
                    onChange={(e) => setRedlineComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={uploadingRedline || !redlineFile}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {uploadingRedline ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                    Upload Redline
                  </button>
                </form>
              )}

              {/* Seller-only redline resolution options */}
              {role === 'seller' && ndaRequest.status !== 'executed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                      Option A: Send Clean Revised PDF for E-Sign
                    </h5>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="form-input py-2 w-full"
                      onChange={(e) => setRevisedPdfFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      disabled={resolvingRedline || !revisedPdfFile}
                      onClick={handleSendRevisedPdf}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <FileSignature size={14} /> Send Revised PDF to Buyer
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                      Option B: Upload Fully Executed Offline PDF
                    </h5>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="form-input py-2 w-full"
                      onChange={(e) => setOfflineExecFile(e.target.files?.[0] || null)}
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={offlineGrantCim}
                        onChange={(e) => setOfflineGrantCim(e.target.checked)}
                      />
                      Grant CIM access immediately
                    </label>
                    <button
                      type="button"
                      disabled={resolvingRedline || !offlineExecFile}
                      onClick={handleUploadOfflineExecuted}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <FileCheck2 size={14} /> Mark Executed Offline
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Audit Log</h4>
              {loadingMeta ? (
                <Loader2 className="animate-spin text-indigo-500" size={20} />
              ) : auditEvents.length === 0 ? (
                <p className="text-xs text-slate-500">No audit events recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {auditEvents.map((ev) => (
                    <div key={ev.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {EVENT_LABELS[ev.event_type] || ev.event_type}
                        </span>
                        <span className="text-slate-500 ml-2">by {ev.actor_email || 'system'}</span>
                        {ev.document_sha256 && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            SHA-256: {ev.document_sha256.slice(0, 16)}…
                          </div>
                        )}
                      </div>
                      <span className="text-slate-400 shrink-0">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
