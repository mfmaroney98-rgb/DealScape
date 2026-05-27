import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { useParams, useLocation, Link } from 'react-router-dom';
import { sellerListingService } from '../services/sellerListingService';
import {
  ArrowLeft,
  Loader2,
  Building2,
  MapPin,
  Users,
  Calendar,
  Tag,
  DollarSign,
  TrendingUp,
  Globe,
  Sparkles,
  BarChart3,
  Shield,
  Award,
  Zap,
  FileText,
  Download,
  Bookmark,
  FileSignature,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

const formatCurrency = (val) => {
  if (val == null || val === '') return '--';
  const n = Number(val);
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString('en-US');
};

const formatPercent = (val) => {
  if (val == null || val === '') return '--';
  return (Number(val) * 100).toFixed(1) + '%';
};

const PERIOD_ORDER = ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'];

const getPeriodLabel = (p, historyPeriod) => {
  if (p === 'LTM') return 'LTM';
  if (historyPeriod?.date) {
    const year = historyPeriod.date.substring(0, 4);
    if (year && !isNaN(year)) {
      return p === 'FY1E' ? `FY ${year} (Est.)` : `FY ${year}`;
    }
  }
  const fallbacks = {
    'FY-2': 'FY 2022',
    'FY-1': 'FY 2023',
    FY0: 'FY 2024',
    FY1E: 'FY 2025 (Est.)',
  };
  return fallbacks[p] || p;
};

const FINANCIAL_ROWS = [
  { key: 'revenue', label: 'Revenue', type: 'currency' },
  {
    key: 'revenue_growth',
    label: 'Revenue Growth (YoY)',
    type: 'percentage',
    compute: (p, history) => {
      const priorPeriod = p === 'FY-1' ? 'FY-2' : p === 'FY0' ? 'FY-1' : p === 'FY1E' ? 'FY0' : null;
      if (!priorPeriod) return null;
      const currentRev = history[p]?.revenue;
      const priorRev = history[priorPeriod]?.revenue;
      if (currentRev && priorRev && Number(priorRev) !== 0) {
        return (Number(currentRev) - Number(priorRev)) / Number(priorRev);
      }
      return null;
    }
  },
  { key: 'gross_profit', label: 'Gross Profit', type: 'currency' },
  {
    key: 'gross_margin',
    label: 'Gross Margin',
    type: 'percentage',
    compute: (p, history) => {
      const gp = history[p]?.gross_profit;
      const rev = history[p]?.revenue;
      if (gp && rev && Number(rev) !== 0) {
        return Number(gp) / Number(rev);
      }
      return null;
    }
  },
  { key: 'ebitda', label: 'EBITDA', type: 'currency' },
  {
    key: 'ebitda_margin',
    label: 'EBITDA Margin',
    type: 'percentage',
    compute: (p, history) => {
      const ebitda = history[p]?.ebitda;
      const rev = history[p]?.revenue;
      if (ebitda && rev && Number(rev) !== 0) {
        return Number(ebitda) / Number(rev);
      }
      return null;
    }
  },
  { key: 'ebit', label: 'EBIT', type: 'currency' },
  {
    key: 'ebit_margin',
    label: 'EBIT Margin',
    type: 'percentage',
    compute: (p, history) => {
      const ebit = history[p]?.ebit;
      const rev = history[p]?.revenue;
      if (ebit && rev && Number(rev) !== 0) {
        return Number(ebit) / Number(rev);
      }
      return null;
    }
  },
  { key: 'net_income', label: 'Net Income', type: 'currency' },
  {
    key: 'net_income_margin',
    label: 'Net Income Margin',
    type: 'percentage',
    compute: (p, history) => {
      const ni = history[p]?.net_income;
      const rev = history[p]?.revenue;
      if (ni && rev && Number(rev) !== 0) {
        return Number(ni) / Number(rev);
      }
      return null;
    }
  },
  { key: 'capex', label: 'CapEx', type: 'currency' },
  {
    key: 'capex_pct',
    label: 'CapEx % of Revenue',
    type: 'percentage',
    compute: (p, history) => {
      const capex = history[p]?.capex;
      const rev = history[p]?.revenue;
      if (capex && rev && Number(rev) !== 0) {
        return Number(capex) / Number(rev);
      }
      return null;
    }
  },
];

const TIER_CONFIG = {
  Strong: {
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500',
    label: 'Strong Match',
    icon: Award,
  },
  Moderate: {
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600',
    borderClass: 'border-amber-500/30',
    badgeBg: 'bg-amber-500',
    label: 'Moderate Match',
    icon: Zap,
  },
  Weak: {
    bgClass: 'bg-slate-200/50',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-300/50',
    badgeBg: 'bg-slate-400',
    label: 'Weak Match',
    icon: BarChart3,
  },
};

const KEYWORD_CATEGORIES = [
  { id: 'industry', label: 'Industry / Vertical' },
  { id: 'business_model', label: 'Business Model' },
  { id: 'revenue_model', label: 'Revenue Model' },
  { id: 'customer_type', label: 'Customer Type' },
  { id: 'operational_model', label: 'Operational Model' },
  { id: 'differentiation', label: 'Differentiation' },
  { id: 'end_market', label: 'End Market' }
];

/* ─── Sub-components ──────────────────────────────────────────────────── */

const ScoreBar = ({ label, score, icon: Icon, color = 'accent' }) => {
  const colorMap = {
    accent:  { bar: 'bg-accent',        text: 'text-accent' },
    emerald: { bar: 'bg-emerald-500',   text: 'text-emerald-600' },
    amber:   { bar: 'bg-amber-500',     text: 'text-amber-600' },
    blue:    { bar: 'bg-blue-500',      text: 'text-blue-600' },
    violet:  { bar: 'bg-violet-500',    text: 'text-violet-600' },
  };
  const c = colorMap[color] || colorMap.accent;
  const pct = Math.min(100, Math.max(0, score || 0));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {Icon && <Icon size={12} className={c.text} />}
          {label}
        </span>
        <span className={`text-xs font-bold ${c.text}`}>{Math.round(score || 0)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
    <span className="text-xs text-muted-foreground shrink-0 font-medium">{label}</span>
    <span className="text-xs font-semibold text-foreground text-right">{value || '--'}</span>
  </div>
);

const OwnershipFlag = ({ show, label }) =>
  show ? (
    <span className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium border border-accent/20">
      {label}
    </span>
  ) : null;

const PDFPage = ({ pdf, pageNum, scale = 1.3 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderTask = null;
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return;
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Render page error:', err);
        }
      }
    };
    renderPage();
    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNum, scale]);

  return (
    <div className="flex justify-center w-full">
      <canvas ref={canvasRef} className="shadow-lg max-w-full bg-white rounded-xl border border-slate-200" />
    </div>
  );
};

const InlinePDFViewer = ({ url }) => {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    let active = true;

    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url, verbosity: 0 });
        const loadedPdf = await loadingTask.promise;
        if (active) {
          setPdf(loadedPdf);
          setNumPages(loadedPdf.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (active) {
          setError('Failed to render PDF document. You can still download the file using the button above.');
          setLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <span className="text-sm font-medium">Loading document viewer...</span>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-6 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-auto bg-slate-50/50 flex flex-col gap-6 p-6" style={{ maxHeight: '820px' }}>
      {Array.from({ length: numPages }, (_, i) => (
        <PDFPage key={i + 1} pdf={pdf} pageNum={i + 1} />
      ))}
    </div>
  );
};

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function BuyerListingDetail({ orgId }) {
  const { id: criteriaId, listingId } = useParams();
  const location = useLocation();

  // Match data may be passed via router state (from MatchResults) to avoid re-RPC
  const matchData = location.state?.match || null;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teaserSignedUrl, setTeaserSignedUrl] = useState(null);
  const [downloadingTeaser, setDownloadingTeaser] = useState(false);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    if (!listingId) return;
    const load = async () => {
      try {
        const data = await sellerListingService.getPublicListingById(listingId);
        setListing(data);
        // Pre-generate a signed URL so the iframe can render immediately.
        // Use a long expiry (3600s = 1 hour) so the viewer stays valid while reading.
        if (data?.teaser_url) {
          try {
            const url = await sellerListingService.getSignedUrl(data.teaser_url, 3600);
            setTeaserSignedUrl(url);
          } catch (_) {
            // Non-fatal — viewer will show an error state instead
          }
        }
      } catch (err) {
        console.error('Failed to load listing:', err);
        setError(err.message || 'Failed to load listing.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId]);

  /* File handlers */
  const handleDownloadTeaser = async () => {
    if (!listing?.teaser_url) return;
    setDownloadingTeaser(true);
    setFileError(null);
    try {
      // Re-use the already-loaded signed URL if available, otherwise fetch a fresh one
      const url = teaserSignedUrl || await sellerListingService.getSignedUrl(listing.teaser_url, 120);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = listing.teaser_file_name || 'teaser.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setFileError('Could not download teaser.');
    } finally {
      setDownloadingTeaser(false);
    }
  };

  /* Derived data */
  const tier = TIER_CONFIG[matchData?.match_tier] || TIER_CONFIG.Weak;
  const TierIcon = tier.icon;

  const financialHistory = listing?.financial_history || {};
  const hasPeriodData = (p) => {
    const data = financialHistory[p];
    if (!data) return false;
    const keys = ['revenue', 'gross_profit', 'ebitda', 'ebit', 'net_income', 'capex'];
    return keys.some(k => data[k] != null && data[k] !== '');
  };
  const availablePeriods = PERIOD_ORDER.filter(p => hasPeriodData(p));

  const keywords = (() => {
    const raw = listing?.keywords || '';
    const clean = raw.replace(/[{}"[\]]/g, '');
    return clean ? clean.split(',').map(k => k.trim()).filter(Boolean) : [];
  })();

  const hasCategorizedKeywords = (() => {
    const cats = listing?.categorized_keywords;
    if (!cats || typeof cats !== 'object') return false;
    return Object.values(cats).some(arr => Array.isArray(arr) && arr.length > 0);
  })();

  const locations = (() => {
    const locs = matchData?.locations || listing?.locations || [];
    return locs.map(l => l.split(':').pop()).filter(Boolean);
  })();

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent" size={40} />
        <p className="text-muted-foreground font-medium">Loading listing details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen p-6 animate-fade-in">
        <div className="max-w-6xl mx-auto py-12">
          <Link
            to="/dashboard/buyer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Back to Buyer Dashboard
          </Link>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error || 'Listing not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto py-10">

        {/* ── Back nav ── */}
        <Link
          to="/dashboard/buyer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back to Buyer Dashboard
        </Link>

        {/* ── Hero Header ── */}
        <div className={`glass rounded-3xl p-7 mb-6 border ${tier.borderClass}`}>
          <div className="flex flex-col md:flex-row md:items-start gap-6">

            {/* Score circle */}
            {matchData && (
              <div className={`w-20 h-20 rounded-2xl ${tier.bgClass} flex flex-col items-center justify-center shrink-0`}>
                <span className={`text-2xl font-black ${tier.textClass}`}>
                  {Math.round(matchData.total_score || 0)}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${tier.textClass} opacity-70`}>score</span>
              </div>
            )}

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  {listing.seller_anon_name || 'Untitled Listing'}
                </h1>
                {matchData && (
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white ${tier.badgeBg}`}>
                    <TierIcon size={12} />
                    {tier.label}
                  </span>
                )}
              </div>

              {matchData?.matchedCriteriaList && matchData.matchedCriteriaList.length > 0 && (() => {
                const strongs = matchData.matchedCriteriaList.filter(item => item.matchTier === 'Strong');
                const mediums = matchData.matchedCriteriaList.filter(item => item.matchTier === 'Moderate');
                
                return (
                  <div className="space-y-1.5 mb-4 select-none">
                    {strongs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] text-emerald-600 font-black tracking-wider uppercase mr-1">★ Strong Fits:</span>
                        {strongs.map((item, i) => (
                          <span key={i} className="text-[9px] font-black px-2 py-0.5 bg-[#e6f4ea] border border-[#0f9d58]/10 text-[#0f9d58] rounded shadow-xs">
                            {Math.round(item.totalScore)} {item.criteriaName}
                          </span>
                        ))}
                      </div>
                    )}
                    {mediums.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] text-amber-600 font-black tracking-wider uppercase mr-1">⚡ Medium Fits:</span>
                        {mediums.map((item, i) => (
                          <span key={i} className="text-[9px] font-black px-2 py-0.5 bg-[#fffbeb] border border-[#fef3c7] text-[#d97706] rounded shadow-xs">
                            {Math.round(item.totalScore)} {item.criteriaName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick stats row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {locations.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-accent" />
                    {locations.slice(0, 3).join(', ')}{locations.length > 3 && ` +${locations.length - 3}`}
                  </span>
                )}
                {listing.employees_count && (
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-blue-500" />
                    {listing.employees_count.toLocaleString()} employees
                  </span>
                )}
                {listing.year_founded && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-violet-500" />
                    Est. {listing.year_founded}
                  </span>
                )}
                {matchData?.search_revenue && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-500" />
                    Rev: {formatCurrency(matchData.search_revenue)}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                title="Save listing (coming soon)"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium"
              >
                <Bookmark size={15} />
                Save
              </button>
              <button
                title="Request NDA (coming soon)"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
              >
                <FileSignature size={15} />
                Request NDA
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ════ LEFT COLUMN ════ */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Business Summary */}
            {listing.summary && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <FileText size={14} className="text-accent" />
                  Business Summary
                </h2>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {listing.summary}
                </p>
              </div>
            )}

            {/* ── Teaser Inline Viewer ── */}
            <div className="glass rounded-2xl overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      {listing.teaser_file_name || 'Teaser'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">Teaser · Available to all buyers</p>
                  </div>
                </div>
                {listing.teaser_url && (
                  <div className="flex items-center gap-2">
                    {teaserSignedUrl && (
                      <a
                        href={teaserSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shrink-0 border border-slate-200"
                      >
                        <ExternalLink size={13} />
                        Open in New Tab
                      </a>
                    )}
                    <button
                      onClick={handleDownloadTeaser}
                      disabled={downloadingTeaser}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-xs font-medium transition-all disabled:opacity-50 shrink-0"
                    >
                      {downloadingTeaser
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />}
                      Download
                    </button>
                  </div>
                )}
              </div>

              {/* PDF viewer */}
              {teaserSignedUrl ? (
                <InlinePDFViewer url={teaserSignedUrl} />
              ) : listing.teaser_url ? (
                /* URL exists but signed URL is still loading / failed */
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <Loader2 className="animate-spin" size={28} />
                  <span className="text-sm">Loading teaser...</span>
                </div>
              ) : (
                /* No teaser at all */
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <FileText size={28} className="text-muted-foreground/30" />
                  <span className="text-sm">No teaser has been uploaded for this listing</span>
                </div>
              )}

              {/* Error */}
              {fileError && (
                <div className="flex items-center gap-2 text-red-500 text-xs p-3 mx-6 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} /> {fileError}
                </div>
              )}
            </div>

            {/* Financial History Table */}
            {availablePeriods.length > 0 && (
              <div className="glass rounded-2xl p-6 overflow-x-auto">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-5 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  Financial History
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-xs font-bold text-muted-foreground pb-3 pr-6 w-40">Metric</th>
                      {availablePeriods.map(p => (
                        <th key={p} className="text-right text-xs font-bold text-muted-foreground pb-3 px-4">
                          {getPeriodLabel(p, financialHistory[p])}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FINANCIAL_ROWS.map((row, idx) => {
                      const hasData = row.compute
                        ? availablePeriods.some(p => row.compute(p, financialHistory) != null)
                        : availablePeriods.some(p => financialHistory[p]?.[row.key] != null && financialHistory[p]?.[row.key] !== '');
                      if (!hasData) return null;

                      const isPercentage = row.type === 'percentage';
                      const labelClass = isPercentage
                        ? "py-2 pr-6 pl-4 text-muted-foreground/75 font-normal text-[11px] italic"
                        : "py-3 pr-6 text-muted-foreground font-semibold text-xs";
                      const valClass = isPercentage
                        ? "py-2 px-4 text-right font-medium text-slate-600 text-xs italic"
                        : "py-3 px-4 text-right font-bold text-foreground text-xs";
                      const rowBgClass = isPercentage
                        ? "bg-slate-50/20"
                        : idx % 2 === 0 ? "" : "bg-slate-50/40";
                      const trClass = `border-b border-border/20 last:border-0 transition-colors hover:bg-slate-50/60 ${rowBgClass}`;

                      return (
                        <tr key={row.key} className={trClass}>
                          <td className={labelClass}>{row.label}</td>
                          {availablePeriods.map(p => {
                            let cellContent = <span className="text-muted-foreground/30">—</span>;
                            if (row.compute) {
                              const calcVal = row.compute(p, financialHistory);
                              if (calcVal != null) {
                                cellContent = formatPercent(calcVal);
                              }
                            } else {
                              const rawVal = financialHistory[p]?.[row.key];
                              if (rawVal != null && rawVal !== '') {
                                cellContent = isPercentage
                                  ? formatPercent(rawVal)
                                  : formatCurrency(rawVal);
                              }
                            }
                            return (
                              <td key={p} className={valClass}>
                                {cellContent}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CIM — locked card */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200/60 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Confidential Information Memorandum (CIM)</p>
                    <p className="text-xs text-muted-foreground">Available after NDA is executed</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                  NDA Required
                </span>
              </div>
            </div>

          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div className="lg:col-span-4 flex flex-col gap-5">

            {/* Match Score Breakdown */}
            {matchData && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <BarChart3 size={13} className="text-accent" />
                  Match Score Breakdown
                </h3>
                <div className="space-y-4 p-4 bg-slate-50/70 rounded-xl">
                  <ScoreBar label="Financial Fit"     score={matchData.financial_score}  icon={DollarSign}  color="emerald" />
                  <ScoreBar label="Geography"         score={matchData.geography_score}  icon={Globe}       color="blue"    />
                  {matchData.industry_score != null && (
                    <ScoreBar label="Industry Score"  score={matchData.industry_score}   icon={Building2}   color="emerald" />
                  )}
                  <ScoreBar label="Semantic Score"    score={matchData.semantic_score}   icon={Sparkles}    color="violet"  />
                  {matchData.bonus_score > 0 && (
                    <ScoreBar label="Bonus"           score={matchData.bonus_score}      icon={Shield}      color="amber"   />
                  )}
                  <div className="pt-2.5 border-t border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Total Score</span>
                      <span className={`text-base font-black ${tier.textClass}`}>
                        {Math.round(matchData.total_score || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Bonus reasons */}
                {matchData.bonus_reasons?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {matchData.bonus_reasons.map((r, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase tracking-wider">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Financials Snapshot */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={13} className="text-emerald-500" />
                Financials Snapshot
              </h3>
              <div className="space-y-1">
                <InfoRow label="Revenue"       value={formatCurrency(listing.search_revenue)} />
                <InfoRow label="Gross Profit"  value={formatCurrency(listing.search_gross_profit)} />
                <InfoRow label="EBITDA"        value={formatCurrency(listing.search_ebitda)} />
                <InfoRow label="EBITDA Margin" value={formatPercent(listing.search_ebitda_margin)} />
                <InfoRow label="Revenue Growth (YoY)" value={formatPercent(listing.search_revenue_growth_yoy)} />
              </div>
            </div>

            {/* Company Info */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Building2 size={13} className="text-blue-500" />
                Company Info
              </h3>
              <div className="space-y-1">
                {listing.year_founded && <InfoRow label="Year Founded"      value={listing.year_founded} />}
                {listing.employees_count && <InfoRow label="Employees"      value={listing.employees_count.toLocaleString()} />}
                {listing.legal_entity && <InfoRow label="Legal Entity"      value={listing.legal_entity} />}
                {listing.ownership_structure && <InfoRow label="Ownership"  value={listing.ownership_structure} />}
                {locations.length > 0 && (
                  <InfoRow label="Location(s)" value={locations.join(', ')} />
                )}
              </div>
            </div>

            {/* Deal Info */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 size={13} className="text-accent" />
                Deal Info
              </h3>
              <div className="space-y-4">
                {/* Transaction types */}
                {(listing.pref_transaction_type?.length > 0 || matchData?.pref_transaction_type?.length > 0) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Transaction Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(listing.pref_transaction_type || matchData?.pref_transaction_type || []).map((tt, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-foreground border border-slate-200 font-medium">
                          {tt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason for sale */}
                {(listing.categorized_keywords?.reason_for_sale?.length > 0 || matchData?.categorized_keywords?.reason_for_sale?.length > 0) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Reason for Sale</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(listing.categorized_keywords?.reason_for_sale || matchData?.categorized_keywords?.reason_for_sale || []).map((r, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owner transition */}
                {matchData?.owner_transition && (
                  <InfoRow label="Owner Transition" value={matchData.owner_transition} />
                )}

                {/* Ownership flags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <OwnershipFlag show={listing.is_founder_owned}  label="Founder-Owned"  />
                  <OwnershipFlag show={listing.is_family_owned}   label="Family-Owned"   />
                  <OwnershipFlag show={listing.is_female_owned}   label="Female-Owned"   />
                  <OwnershipFlag show={listing.is_minority_owned} label="Minority-Owned" />
                  <OwnershipFlag show={listing.is_operator_owned} label="Operator-Owned" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Keywords */}
        {(hasCategorizedKeywords || keywords.length > 0) && (
          <div className="glass rounded-3xl p-7 mt-6">
            {hasCategorizedKeywords ? (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Tag size={14} className="text-accent" />
                  Keywords by Category
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {KEYWORD_CATEGORIES.map(cat => {
                    const tags = listing.categorized_keywords[cat.id] || [];
                    if (tags.length === 0) return null;
                    return (
                      <div key={cat.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-start">
                        <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground mb-3">{cat.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((kw, i) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-foreground font-medium">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-4">
                  <Tag size={14} className="text-accent" />
                  Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.slice(0, 32).map((kw, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-foreground font-medium">
                      {kw}
                    </span>
                  ))}
                  {keywords.length > 32 && (
                    <span className="text-[10px] text-muted-foreground self-center">+{keywords.length - 32} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
