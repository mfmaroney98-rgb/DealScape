import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sellerListingService } from '../services/sellerListingService';
import { aiService } from '../services/aiService';
import TagInput from './TagInput';
import { fetchGeographyTree } from '../services/geographyService';
import {
  Building2,
  TrendingUp,
  MapPin,
  Users,
  PieChart,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Tag,
  Briefcase,
  UploadCloud,
  FileText,
  AlertCircle,
  Globe,
  Loader2,
  Sparkles
} from 'lucide-react';



const KEYWORD_CATEGORIES = [
  { id: 'business_model', label: 'Business Model', example: 'B2B SaaS, Managed Services' },
  { id: 'industry', label: 'Industry / Vertical', example: 'Dental Practice Management, HealthTech' },
  { id: 'revenue_model', label: 'Revenue Model', example: 'Subscription, Recurring' },
  { id: 'customer_type', label: 'Customer Type', example: 'Fortune 500, SMB' },
  { id: 'operational_model', label: 'Operational Model', example: 'Asset-light, Remote-first' },
  { id: 'differentiation', label: 'Differentiation', example: 'Proprietary IP, Sole-source' },
  { id: 'end_market', label: 'End Market', example: 'Independent Clinics, Government' }
];

export default function SellerProfileForm({ userId, orgId, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [teaserFile, setTeaserFile] = useState(null);
  const [cimFile, setCimFile] = useState(null);
  const [autoFilledFields, setAutoFilledFields] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`sellerFormFields_${listingId || 'new'}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [autoFilledTags, setAutoFilledTags] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`sellerFormTags_${listingId || 'new'}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [expandedContinents, setExpandedContinents] = useState(new Set());
  const [expandedCountries, setExpandedCountries] = useState(new Set());
  const [focusedField, setFocusedField] = useState(null); // { year, field }
  const [showLtm, setShowLtm] = useState(true);
  const navigate = useNavigate();
  const { listingId } = useParams();
  const isEditing = !!listingId;

  // Geography data loaded from Supabase
  const [geoTree, setGeoTree] = useState([]);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    fetchGeographyTree()
      .then(data => setGeoTree(data))
      .catch(err => setGeoError(err.message || 'Failed to load geography data'))
      .finally(() => setGeoLoading(false));

    // Fetch listing data if editing
    if (isEditing) {
      setLoading(true);
      // isCorporate could be passed down, but for now we assume orgId filter
      sellerListingService.getListingById(listingId, orgId)
        .then(data => {
          if (data) {
            setFormData(prev => {
              // Ensure we have a valid object base for financial_history
              const sanitizedHistory = { ...prev.financial_history };

              const incomingHistory = data.financial_history || {};
              Object.keys(sanitizedHistory).forEach(year => {
                const incomingYearData = incomingHistory[year];
                if (incomingYearData && typeof incomingYearData === 'object') {
                  sanitizedHistory[year] = {
                    ...sanitizedHistory[year],
                    ...incomingYearData
                  };
                }
              });

              return {
                ...prev,
                ...data,
                // Force correct types for known fields
                seller_name: data.seller_name || '',
                seller_anon_name: data.seller_anon_name || '',
                locations: Array.isArray(data.locations) ? data.locations : [],
                year_founded: data.year_founded || '',
                employees_count: data.employees_count || '',
                keywords: Array.isArray(data.keywords) ? data.keywords : [],
                legal_entity: data.legal_entity || '',
                ownership_structure: data.ownership_structure || '',
                pref_transaction_type: Array.isArray(data.pref_transaction_type) ? data.pref_transaction_type : [],
                financial_history: sanitizedHistory
              };
            });
          }
        })
        .catch(err => {
          console.error('Error fetching listing:', err);
          setError('Failed to load listing data. Please refresh and try again.');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [listingId, userId, isEditing]);

  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`sellerFormData_${listingId || 'new'}`);
      if (saved) return JSON.parse(saved);
    } catch { }

    return {
      user_id: userId,
      organization_id: orgId,
      seller_name: '',
      seller_anon_name: '',
      locations: [],
      year_founded: '',
      employees_count: '',
      keywords: [],
      categorized_keywords: {},
      summary: '',
      legal_entity: '',
      ownership_structure: '',
      is_founder_owned: false,
      is_female_owned: false,
      is_minority_owned: false,
      is_family_owned: false,
      is_operator_owned: false,
      pref_transaction_type: [],
      financial_history: {
        'FY-2': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
        'FY-1': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
        'FY0': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' },
        'LTM': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '' }
      },
      embedding: null,
      last_embedded_text: '',
      status: 'Draft'
    }
  });

  // Save form draft to sessionStorage automatically
  useEffect(() => {
    if (!loading && !isParsing) {
      sessionStorage.setItem(`sellerFormData_${listingId || 'new'}`, JSON.stringify(formData));
      sessionStorage.setItem(`sellerFormFields_${listingId || 'new'}`, JSON.stringify(autoFilledFields));
      sessionStorage.setItem(`sellerFormTags_${listingId || 'new'}`, JSON.stringify(autoFilledTags));
    }
  }, [formData, autoFilledFields, autoFilledTags, listingId, loading, isParsing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (autoFilledFields.includes(name)) {
      setAutoFilledFields(prev => prev.filter(field => field !== name));
    }

    let finalValue = type === 'checkbox' ? checked : value;

    // Handle numeric fields
    if ((name === 'employees_count' || name === 'year_founded') && value !== '') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        finalValue = parsed;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  // Format a number with commas (e.g. 40000000 -> "40,000,000")
  const formatWithCommas = (value) => {
    if (!value && value !== 0) return '';
    if (value === '-') return '-';
    return Number(value).toLocaleString('en-US');
  };

  // Display value for currency fields: "$1,234,567" or "" if empty
  const displayCurrency = (value) => {
    if (!value && value !== 0) return '';
    return '$' + formatWithCommas(value);
  };

  // Handle currency input: strip non-digits, store raw number
  const handleFinancialChange = (year, field, rawValue) => {
    let isNegative = false;
    if (['gross_profit', 'ebitda', 'ebit', 'net_income'].includes(field) && rawValue.startsWith('-')) {
      isNegative = true;
    }

    const digits = rawValue.replace(/[^0-9]/g, '');
    let numValue = '';

    if (digits === '') {
      numValue = isNegative ? '-' : '';
    } else {
      numValue = Number(isNegative ? '-' + digits : digits);
    }

    setFormData(prev => ({
      ...prev,
      financial_history: {
        ...prev.financial_history,
        [year]: {
          ...prev.financial_history[year],
          [field]: numValue
        }
      }
    }));
  };

  const handleFinancialDateChange = (year, dateValue) => {
    setFormData(prev => ({
      ...prev,
      financial_history: {
        ...prev.financial_history,
        [year]: {
          ...prev.financial_history[year],
          date: dateValue
        }
      }
    }));
  };

  // Preferred transaction types as checklist
  const handlePrefTransactionToggle = (type) => {
    setFormData(prev => {
      const current = prev.pref_transaction_type || [];
      const exists = current.includes(type);
      const updated = exists ? current.filter(t => t !== type) : [...current, type];
      return { ...prev, pref_transaction_type: updated };
    });
  };

  const allUSAStates = geoTree.find(c => c.code === 'US')?.states ?? [];

  const makeStateKey = (countryCode, stateName) => `${countryCode}:${stateName}`;

  const handleStateToggle = (countryCode, stateName) => {
    const key = makeStateKey(countryCode, stateName);
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(key)
        ? prev.locations.filter(s => s !== key)
        : [...prev.locations, key]
    }));
  };

  const handleCountryToggle = (country) => {
    const keys = country.states.map(s => makeStateKey(country.code, s));
    setFormData(prev => {
      const allSelected = keys.every(k => prev.locations.includes(k));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(k => !keys.includes(k));
      } else {
        keys.forEach(k => { if (!newLocations.includes(k)) newLocations.push(k); });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleCountryExpand = (e, countryCode) => {
    e.stopPropagation();
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(countryCode)) next.delete(countryCode);
      else next.add(countryCode);
      return next;
    });
  };

  const handleContinentToggle = (continent) => {
    const allKeys = continent.countries.flatMap(c => c.states.map(s => makeStateKey(c.code, s)));
    setFormData(prev => {
      const allSelected = allKeys.length > 0 && allKeys.every(k => prev.locations.includes(k));
      let newLocations = [...prev.locations];
      if (allSelected) {
        newLocations = newLocations.filter(k => !allKeys.includes(k));
      } else {
        allKeys.forEach(k => { if (!newLocations.includes(k)) newLocations.push(k); });
      }
      return { ...prev, locations: newLocations };
    });
  };

  const toggleContinentExpand = (e, continentName) => {
    e.stopPropagation();
    setExpandedContinents(prev => {
      const next = new Set(prev);
      if (next.has(continentName)) next.delete(continentName);
      else next.add(continentName);
      return next;
    });
  };

  const handleExtractData = async () => {
    if (!teaserFile && !cimFile) return;

    setIsParsing(true);
    setError(null);

    try {
      let combinedText = '';

      // 1. Extract text from uploaded PDFs
      if (teaserFile) {
        combinedText += '--- START OF TEASER DOCUMENT ---\n' + await aiService.extractTextFromPDF(teaserFile) + '\n--- END OF TEASER DOCUMENT ---\n\n';
      }
      if (cimFile) {
        combinedText += '--- START OF CONFIDENTIAL INFORMATION MEMORANDUM (CIM) ---\n' + await aiService.extractTextFromPDF(cimFile) + '\n--- END OF CONFIDENTIAL INFORMATION MEMORANDUM (CIM) ---\n\n';
      }

      // 2. Extract structured data via OpenAI
      const parsedData = await aiService.parseListingDocument(combinedText);

      // 3. Update form data
      setFormData(prev => {
        // Deep merge financial history
        const mergedHistory = { ...prev.financial_history };
        if (parsedData.financial_history) {
          Object.keys(mergedHistory).forEach(year => {
            if (parsedData.financial_history[year]) {
              mergedHistory[year] = {
                ...mergedHistory[year],
                ...parsedData.financial_history[year]
              };
            }
          });
        }

        // Flatten keywords for the UI tag cloud while keeping categories for matching
        const flattenedKeywords = (parsedData.keywords && typeof parsedData.keywords === 'object')
          ? Object.values(parsedData.keywords).flat().filter(Boolean)
          : (Array.isArray(parsedData.keywords) ? parsedData.keywords : []);

        return {
          ...prev,
          seller_name: parsedData.seller_name || prev.seller_name,
          seller_anon_name: parsedData.seller_anon_name || prev.seller_anon_name,
          employees_count: parsedData.employees_count || prev.employees_count,
          year_founded: parsedData.year_founded || prev.year_founded,
          // Only keep previous value if it wasn't an auto-filled one, or if AI returned nothing
          legal_entity: parsedData.legal_entity || (autoFilledFields.includes('legal_entity') ? '' : prev.legal_entity),
          pref_transaction_type: parsedData.pref_transaction_type?.length ? [...new Set([...prev.pref_transaction_type, ...parsedData.pref_transaction_type])] : prev.pref_transaction_type,
          is_founder_owned: parsedData.is_founder_owned ?? prev.is_founder_owned,
          is_female_owned: parsedData.is_female_owned ?? prev.is_female_owned,
          is_minority_owned: parsedData.is_minority_owned ?? prev.is_minority_owned,
          is_family_owned: parsedData.is_family_owned ?? prev.is_family_owned,
          is_operator_owned: parsedData.is_operator_owned ?? prev.is_operator_owned,
          keywords: flattenedKeywords.length ? [...new Set([...prev.keywords, ...flattenedKeywords])] : prev.keywords,
          categorized_keywords: (parsedData.keywords && typeof parsedData.keywords === 'object') ? parsedData.keywords : prev.categorized_keywords,
          summary: parsedData.summary || (autoFilledFields.includes('summary') ? '' : prev.summary),
          financial_history: mergedHistory
        };
      });

      // Track highlighted fields for UX
      const updatedFields = [...new Set([...autoFilledFields])];
      const hasKeywords = (parsedData.keywords && typeof parsedData.keywords === 'object') 
        ? Object.values(parsedData.keywords).flat().length > 0
        : (parsedData.keywords?.length > 0);

      if (parsedData.seller_name) updatedFields.push('seller_name');
      if (parsedData.seller_anon_name) updatedFields.push('seller_anon_name');
      if (parsedData.employees_count) updatedFields.push('employees_count');
      if (parsedData.year_founded) updatedFields.push('year_founded');
      if (parsedData.legal_entity) updatedFields.push('legal_entity');
      if (hasKeywords) updatedFields.push('keywords');
      if (parsedData.pref_transaction_type?.length) updatedFields.push('pref_transaction_type');
      if (parsedData.is_founder_owned !== undefined) updatedFields.push('is_founder_owned');
      if (parsedData.is_female_owned !== undefined) updatedFields.push('is_female_owned');
      if (parsedData.is_minority_owned !== undefined) updatedFields.push('is_minority_owned');
      if (parsedData.is_family_owned !== undefined) updatedFields.push('is_family_owned');
      if (parsedData.is_operator_owned !== undefined) updatedFields.push('is_operator_owned');
      if (parsedData.financial_history) updatedFields.push('financial_history');
      if (parsedData.summary) updatedFields.push('summary');

      setAutoFilledFields(updatedFields);
      if (hasKeywords) {
        const tagsToHighlight = (parsedData.keywords && typeof parsedData.keywords === 'object')
          ? Object.values(parsedData.keywords).flat().filter(Boolean)
          : (Array.isArray(parsedData.keywords) ? parsedData.keywords : []);
        setAutoFilledTags(tagsToHighlight);
      }

      // 4. Generate Enriched Semantic Embedding for Matching
      let keywordContext = '';
      if (parsedData.keywords && typeof parsedData.keywords === 'object') {
        keywordContext = Object.entries(parsedData.keywords)
          .map(([cat, tags]) => `${cat.replace('_', ' ')}: ${tags.join(', ')}`)
          .filter(s => !s.endsWith(': '))
          .join('; ');
      } else if (flattenedKeywords.length) {
        keywordContext = flattenedKeywords.join(', ');
      }

      const textToEmbed = `Categorized Business Traits: ${keywordContext}. Executive Summary: ${parsedData.summary || formData.summary || parsedData.seller_anon_name || formData.seller_anon_name}`.trim();
      if (textToEmbed.length > 20) {
        try {
          const embedding = await aiService.generateEmbedding(textToEmbed);
          setFormData(prev => ({ ...prev, embedding, last_embedded_text: textToEmbed }));
        } catch (err) {
          console.warn('Failed to generate embedding during parsing', err);
        }
      }

    } catch (err) {
      console.error('AI Parsing Error:', err);
      // Display the actual technical error to the user for debugging
      setError(`Extraction failed: ${err.message || err.toString()}`);
    } finally {
      setIsParsing(false);
    }
  };

  const getInputClass = (name, baseClass = 'form-input') => {
    return `${baseClass} ${autoFilledFields.includes(name) ? 'form-input-highlight' : ''} transition-colors`;
  };

  const handleCancel = () => {
    sessionStorage.removeItem(`sellerFormData_${listingId || 'new'}`);
    sessionStorage.removeItem(`sellerFormFields_${listingId || 'new'}`);
    sessionStorage.removeItem(`sellerFormTags_${listingId || 'new'}`);
    navigate(-1);
  };

  const handleSubmit = async (e, submitStatus = 'Active') => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Strip generated columns that start with 'search_' to prevent Postgres errors
      // and ensure numeric fields are correctly typed
      const sanitizedData = Object.keys(formData).reduce((acc, key) => {
        if (!key.startsWith('search_')) {
          acc[key] = formData[key];
        }
        return acc;
      }, {});

      // Apply specific type conversions and status
      sanitizedData.employees_count = sanitizedData.employees_count === '' || sanitizedData.employees_count === null ? null : parseInt(sanitizedData.employees_count, 10);
      sanitizedData.year_founded = sanitizedData.year_founded === '' || sanitizedData.year_founded === null ? null : String(sanitizedData.year_founded);
      sanitizedData.status = submitStatus;

      // Smart Refresh: Only update embedding if the strategic text has changed
      const keywordContext = Object.entries(formData.categorized_keywords || {})
        .map(([cat, tags]) => `${cat.replace('_', ' ')}: ${tags.join(', ')}`)
        .filter(s => !s.endsWith(': '))
        .join('; ');
      const textToEmbed = `Categorized Business Traits: ${keywordContext}. Executive Summary: ${formData.summary || formData.seller_anon_name}`.trim();

      if (textToEmbed.length > 20 && textToEmbed !== formData.last_embedded_text) {
        try {
          const embedding = await aiService.generateEmbedding(textToEmbed);
          sanitizedData.embedding = embedding;
          sanitizedData.last_embedded_text = textToEmbed;
        } catch (err) {
          console.warn('Failed to refresh embedding on submit:', err);
        }
      }

      await sellerListingService.saveListing(sanitizedData);

      // Clear draft after successful save
      sessionStorage.removeItem(`sellerFormData_${listingId || 'new'}`);
      sessionStorage.removeItem(`sellerFormFields_${listingId || 'new'}`);
      sessionStorage.removeItem(`sellerFormTags_${listingId || 'new'}`);

      if (onComplete) {
        await onComplete();
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 font-medium">Loading your listing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-fade-in">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-2xl mb-4">
          <Briefcase className="text-indigo-400" size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">
          {isEditing ? 'Update Your Listing' : 'Create Your Listing'}
        </h1>
        <div style={{ color: 'red', fontSize: '10px' }}>
          Debug Fields: {JSON.stringify(autoFilledFields)} | Tags: {JSON.stringify(autoFilledTags)}
        </div>
        <p className="text-slate-400 max-w-lg mx-auto mb-8">
          Provide the key details of your business to attract the right investors. All company names are kept private until mutual interest is confirmed.
        </p>

        {/* Document Parsing Upload Area */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', position: 'relative', zIndex: 10, marginBottom: '2rem' }} className="max-w-4xl mx-auto text-left">
          {isParsing && (
            <div className="absolute inset-[-1rem] bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-2xl">
              <Loader2 className="text-indigo-500 mb-4 animate-spin" size={32} />
              <p className="text-indigo-200 font-medium">Extracting data via secure backend...</p>
            </div>
          )}

          {/* Teaser Upload */}
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setTeaserFile(e.target.files?.[0] || null)}
              className="text-sm text-slate-300 cursor-pointer"
              title="Upload Teaser"
            />
            <div className={`mt-2 ${teaserFile ? 'text-amber-400' : 'text-slate-200'}`}>
              <UploadCloud size={24} />
            </div>
            <p className="font-semibold text-white">Upload Teaser</p>
            <p className="text-sm text-slate-400">Upload a PDF or Word document. We will securely extract the key metrics.</p>
            {teaserFile && <p className="text-xs text-amber-400 truncate max-w-full">{teaserFile.name}</p>}
          </div>

          {/* CIM Upload */}
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCimFile(e.target.files?.[0] || null)}
              className="text-sm text-slate-300 cursor-pointer"
              title="Upload CIM"
            />
            <div className={`mt-2 ${cimFile ? 'text-amber-400' : 'text-slate-200'}`}>
              <FileText size={24} />
            </div>
            <p className="font-semibold text-white">Upload CIM</p>
            <p className="text-sm text-slate-400">Upload a PDF or Word document. We will securely extract the key metrics.</p>
            {cimFile && <p className="text-xs text-amber-400 truncate max-w-full">{cimFile.name}</p>}
          </div>
        </div>

        {/* Extract Button */}
        {(teaserFile || cimFile) && (
          <div className="flex justify-center mb-10 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={handleExtractData}
              disabled={isParsing}
              className="btn-primary flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-600 border-none text-white font-bold rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={20} className={isParsing ? "animate-spin" : ""} />
              {isParsing ? 'Extracting Data...' : 'Extract Data with AI'}
            </button>
          </div>
        )}

      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Identity & Location */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Building2 className="text-indigo-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Business Identity</h2>
          </div>

          <div className="space-y-6">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
              <div className="glass border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="text-indigo-400" size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="form-label mb-1 flex justify-between items-center pr-2">
                      Company Name or Project Name
                      {autoFilledFields.includes('seller_name') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                    </label>
                    <input
                      type="text"
                      name="seller_name"
                      className={getInputClass('seller_name')}
                      placeholder="e.g. Acme Manufacturing LLC"
                      value={formData.seller_name}
                      onChange={handleChange}
                    />
                    <div className="flex items-center gap-1.5 mt-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <p className="text-xs text-indigo-300/70">This information is for internal reference only and will <strong>not</strong> be visible to buyers.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="form-label">Listing Title (Anonymized)</label>
                <input
                  type="text"
                  name="seller_anon_name"
                  className="form-input"
                  placeholder="e.g. Leading Material Handling..."
                  value={formData.seller_anon_name}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">Use a descriptive title that doesn't reveal your company name.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label flex justify-between">
                  Employee Count
                  {autoFilledFields.includes('employees_count') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="employees_count"
                    className={getInputClass('employees_count', 'form-input pl-11')}
                    value={formData.employees_count}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                  />
                  <Users className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.includes('employees_count') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label flex justify-between">
                  Year Founded
                  {autoFilledFields.includes('year_founded') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    name="year_founded"
                    className={getInputClass('year_founded', 'form-input pl-11')}
                    value={formData.year_founded}
                    onChange={handleChange}
                    placeholder="YYYY"
                  />
                  <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 ${autoFilledFields.includes('year_founded') ? 'text-highlight' : 'text-slate-500'}`} size={18} />
                </div>
              </div>
            </div>

            {/* Business Location & Ownership Structure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Business Location</label>
                <div className="geo-tree" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {geoLoading ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                      Loading geography data...
                    </div>
                  ) : geoError ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#f87171', fontSize: '0.875rem' }}>
                      {geoError}
                    </div>
                  ) : (
                    geoTree.map((continent, coIdx) => {
                      const isLastContinent = coIdx === geoTree.length - 1;
                      const allContinentKeys = continent.countries.flatMap(c => c.states.map(s => makeStateKey(c.code, s)));
                      const allContSelected = allContinentKeys.length > 0 && allContinentKeys.every(k => formData.locations.includes(k));
                      const someContSelected = allContinentKeys.some(k => formData.locations.includes(k)) && !allContSelected;
                      const isContExpanded = expandedContinents.has(continent.name);
                      return (
                        <div key={continent.name} className={`geo-branch ${isLastContinent ? 'geo-branch-last' : ''}`}>
                          <div className="geo-row">
                            <div
                              className={`geo-check ${allContSelected ? 'checked' : someContSelected ? 'partial' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleContinentToggle(continent); }}
                            >
                              {allContSelected
                                ? <CheckCircle2 size={14} />
                                : someContSelected
                                  ? <span style={{ width: 8, height: 8, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                                  : null
                              }
                            </div>
                            <span className="geo-label-bold" onClick={() => handleContinentToggle(continent)}>
                              {continent.name}
                            </span>
                            <button type="button" onClick={(e) => toggleContinentExpand(e, continent.name)} className="geo-toggle">
                              {isContExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                          {isContExpanded && (
                            <div className="geo-children">
                              {continent.countries.map((country, cIdx) => {
                                const isLastCountry = cIdx === continent.countries.length - 1;
                                const ctryKeys = country.states.map(s => makeStateKey(country.code, s));
                                const allCtrySelected = ctryKeys.length > 0 && ctryKeys.every(k => formData.locations.includes(k));
                                const someCtrySelected = ctryKeys.some(k => formData.locations.includes(k)) && !allCtrySelected;
                                const isCtryExpanded = expandedCountries.has(country.code);
                                return (
                                  <div key={country.code} className={`geo-branch ${isLastCountry ? 'geo-branch-last' : ''}`}>
                                    <div className="geo-row">
                                      <div
                                        className={`geo-check-sm ${allCtrySelected ? 'checked' : someCtrySelected ? 'partial' : ''}`}
                                        onClick={() => handleCountryToggle(country)}
                                      >
                                        {allCtrySelected
                                          ? <CheckCircle2 size={12} />
                                          : someCtrySelected
                                            ? <span style={{ width: 6, height: 6, background: '#e2e8f0', borderRadius: 1, display: 'block' }} />
                                            : null
                                        }
                                      </div>
                                      <span className="geo-label-semi" onClick={() => handleCountryToggle(country)}>{country.name}</span>
                                      <button type="button" onClick={(e) => toggleCountryExpand(e, country.code)} className="geo-toggle">
                                        {isCtryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                      </button>
                                    </div>
                                    {isCtryExpanded && (
                                      <div className="geo-children">
                                        {country.states.map((stateName, sIdx) => {
                                          const isLastState = sIdx === country.states.length - 1;
                                          const stateKey = makeStateKey(country.code, stateName);
                                          const isStateSelected = formData.locations.includes(stateKey);
                                          return (
                                            <div key={stateKey} className={`geo-branch ${isLastState ? 'geo-branch-last' : ''}`}>
                                              <div className="geo-row">
                                                <div className={`geo-check-sm ${isStateSelected ? 'checked' : ''}`} onClick={() => handleStateToggle(country.code, stateName)}>
                                                  {isStateSelected && <CheckCircle2 size={10} />}
                                                </div>
                                                <span className={`geo-label-state ${isStateSelected ? 'selected' : ''}`} onClick={() => handleStateToggle(country.code, stateName)}>{stateName}</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Ownership Structure</label>
                  <select name="ownership_structure" className="form-input" style={{ width: '100%', appearance: 'auto' }} value={formData.ownership_structure} onChange={handleChange}>
                    <option value="">Select Ownership</option>
                    <option value="Private Company">Private Company</option>
                    <option value="Investment Firm Portfolio Company">Investment Firm Portfolio Company</option>
                    <option value="Public Company">Public Company</option>
                    <option value="Corporate Subsidiary">Corporate Subsidiary</option>
                  </select>
                </div>
                <div>
                  <label className="form-label flex justify-between">
                    Legal Entity
                    {autoFilledFields.includes('legal_entity') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
                  </label>
                  <select name="legal_entity" className={getInputClass('legal_entity', 'form-input w-full')} style={{ appearance: 'auto', marginTop: '0.75rem' }} value={formData.legal_entity} onChange={handleChange}>
                    <option value="">Select Legal Entity</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="LLC">LLC</option>
                    <option value="S-Corp">S-Corp</option>
                    <option value="C-Corp">C-Corp</option>
                    <option value="General Partnership">General Partnership</option>
                    <option value="LP">LP</option>
                    <option value="LLP">LLP</option>
                    <option value="PLLC">PLLC</option>
                    <option value="PC">PC</option>
                    <option value="Trust">Trust</option>
                    <option value="Nonprofit">Nonprofit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Business Details */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Tag className="text-amber-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Business Characteristics</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {KEYWORD_CATEGORIES.map(cat => (
              <div key={cat.id} style={{ minWidth: 0 }} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 flex flex-col shadow-inner transition-all hover:border-slate-700/80">
                <label className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4 flex justify-between items-center px-1">
                  {cat.label}
                  {autoFilledFields.includes('keywords') && formData.categorized_keywords?.[cat.id]?.length > 0 && (
                    <AlertCircle size={12} className="text-amber-400 animate-pulse" title="Auto-populated" />
                  )}
                </label>
                <div className="flex-1">
                  <TagInput
                    tags={formData.categorized_keywords?.[cat.id] || []}
                    onChange={(newTags) => {
                      setFormData(prev => {
                        const updatedCategorized = {
                          ...(prev.categorized_keywords || {}),
                          [cat.id]: newTags
                        };
                        return {
                          ...prev,
                          categorized_keywords: updatedCategorized,
                          keywords: Object.values(updatedCategorized).flat().filter(Boolean)
                        };
                      });
                    }}
                    placeholder={`e.g. ${cat.example}`}
                    isInputHighlighted={autoFilledFields.includes('keywords') && formData.categorized_keywords?.[cat.id]?.length > 0}
                    autoFilledTags={autoFilledTags}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Financials */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <TrendingUp size={80} />
          </div>

          <div className="geo-row" style={{ marginBottom: '1.5rem', cursor: 'default' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ color: '#34d399' }} size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Financial Performance</h2>
          </div>

          <div className="overflow-x-auto mt-8">
            <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '24px 0' }}>
              <thead>
                <tr>
                  <th className="p-2 font-normal text-slate-500 text-left" style={{ width: '180px' }}></th>
                  {['FY-2', 'FY-1', 'FY0'].map(period => (
                    <th key={period} className="px-8 py-2 font-bold text-slate-300 text-right">
                      <div className="flex flex-col items-end" style={{ gap: '6px' }}>
                        <span>Fiscal Year {period.replace('FY', '')}</span>
                        <input
                          type="date"
                          style={{ textAlign: 'right' }}
                          className="text-indigo-400/70 bg-transparent outline-none w-full italic text-xs cursor-pointer hover:text-indigo-300 transition-colors"
                          value={formData.financial_history?.[period]?.date || ''}
                          onChange={(e) => handleFinancialDateChange(period, e.target.value)}
                          title={`Period end date for ${period}`}
                        />
                      </div>
                    </th>
                  ))}
                  <th className="px-8 py-2 font-bold text-slate-300 text-right">
                    <div className="flex flex-col items-end" style={{ gap: '6px' }}>
                      {showLtm ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowLtm(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '5px',
                              padding: '0.2rem 0.6rem', borderRadius: '0.4rem',
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#f87171', fontSize: '0.72rem', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.15s',
                              whiteSpace: 'nowrap', marginLeft: 'auto'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                          >
                            <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>✕</span> No LTM
                          </button>
                          <span>LTM</span>
                          <input
                            type="date"
                            style={{ textAlign: 'right' }}
                            className="text-blue-500 bg-transparent outline-none w-full placeholder-blue-500/50 italic text-xs cursor-pointer"
                            value={formData.financial_history?.LTM?.date || ''}
                            onChange={(e) => handleFinancialDateChange('LTM', e.target.value)}
                          />
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowLtm(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '0.2rem 0.6rem', borderRadius: '0.4rem',
                            border: '1px solid rgba(52,211,153,0.3)',
                            background: 'rgba(52,211,153,0.08)',
                            color: '#34d399', fontSize: '0.72rem', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            whiteSpace: 'nowrap', marginLeft: 'auto'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.18)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.6)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; }}
                        >
                          <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>＋</span> Add LTM
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* --- Revenue --- */}
                <tr>
                  <td className="p-2 pt-4 font-bold text-slate-200">Revenue</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const rev = formData.financial_history?.[year]?.revenue;
                    return (
                      <td key={year} className="px-4 py-2 pt-4 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(rev)}
                            onChange={(e) => handleFinancialChange(year, 'revenue', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'revenue' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>YoY Growth</td>
                  {(showLtm ? ['2023', '2024', '2025', 'LTM'] : ['2023', '2024', '2025']).map(year => {
                    let yoy = '';
                    const isFocused = focusedField && (
                      (focusedField.year === year && focusedField.field === 'revenue') ||
                      (year === '2024' && focusedField.year === '2023' && focusedField.field === 'revenue') ||
                      (year === '2025' && focusedField.year === '2024' && focusedField.field === 'revenue')
                    );

                    if (!isFocused) {
                      if (year === 'FY-1' && formData.financial_history?.['FY-2']?.revenue) {
                        yoy = Math.round(((formData.financial_history['FY-1']?.revenue - formData.financial_history['FY-2']?.revenue) / formData.financial_history['FY-2']?.revenue) * 100);
                      } else if (year === 'FY0' && formData.financial_history?.['FY-1']?.revenue) {
                        yoy = Math.round(((formData.financial_history['FY0']?.revenue - formData.financial_history['FY-1']?.revenue) / formData.financial_history['FY-1']?.revenue) * 100);
                      }
                    }
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {yoy !== '' ? `${yoy}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Gross Profit --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">Gross Profit</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history?.[year]?.gross_profit;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'gross_profit', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'gross_profit' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>Gross Profit Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history?.[year]?.gross_profit;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'gross_profit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBITDA --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">EBITDA</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history?.[year]?.ebitda;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'ebitda', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'ebitda' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>EBITDA Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history?.[year]?.ebitda;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebitda' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBIT --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">EBIT</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history[year].ebit;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'ebit', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'ebit' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>EBIT Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history[year].ebit;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '1.5rem', paddingTop: '0.25rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Net Income --- */}
                <tr>
                  <td className="p-2 pt-6 font-bold text-slate-200">Net Income</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history[year].net_income;
                    return (
                      <td key={year} className="px-4 py-2 pt-6 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end' }}>
                          <span className="text-blue-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#ffffff', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'net_income', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'net_income' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem 0.25rem 1.5rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#64748b' }}>Net Income Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM'] : ['FY-2', 'FY-1', 'FY0']).map(year => {
                    const val = formData.financial_history[year].net_income;
                    const rev = formData.financial_history[year].revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'net_income' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ padding: '0.25rem 2rem 1.5rem 2rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Metadata & Strategic */}
        <div className="glass p-8 rounded-3xl border border-slate-800 shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <PieChart className="text-purple-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Strategic Considerations</h2>
          </div>

          <div className="space-y-8">
            <div>
              <label className="form-label flex justify-between">
                Preferred Transaction Types
                {autoFilledFields.includes('pref_transaction_type') && <AlertCircle size={14} className="text-highlight" title="Auto-populated from document" />}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['Total Sale', 'Acquisition of Majority Stake', 'Acquisition of Minority Stake', 'Equity Raise', 'Debt Raise', 'Divestiture', 'Recapitalization', 'Restructuring'].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="pref_transaction_type"
                      className={`h-5 w-5 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500 ${autoFilledFields.includes('pref_transaction_type') ? 'text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-indigo-500'}`}
                      checked={formData.pref_transaction_type?.includes(type)}
                      onChange={() => {
                        if (autoFilledFields.includes('pref_transaction_type')) {
                          setAutoFilledFields(prev => prev.filter(f => f !== 'pref_transaction_type'));
                        }
                        handlePrefTransactionToggle(type);
                      }}
                    />
                    <span className={`text-sm transition-colors ${autoFilledFields.includes('pref_transaction_type') && formData.pref_transaction_type?.includes(type) ? 'text-amber-400 group-hover:text-amber-300' : 'text-slate-400 group-hover:text-white'}`}>
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="form-label">Ownership Characteristics</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { key: 'is_founder_owned', label: 'Founder-Owned' },
                  { key: 'is_female_owned', label: 'Female-Owned' },
                  { key: 'is_minority_owned', label: 'Minority-Owned' },
                  { key: 'is_family_owned', label: 'Family-Owned' },
                  { key: 'is_operator_owned', label: 'Operator-Owned' }
                ].map(flag => (
                  <label key={flag.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name={flag.key}
                      className={`h-5 w-5 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500 ${autoFilledFields.includes(flag.key) ? 'text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-indigo-500'}`}
                      checked={formData[flag.key]}
                      onChange={(e) => {
                        if (autoFilledFields.includes(flag.key)) {
                          setAutoFilledFields(prev => prev.filter(f => f !== flag.key));
                        }
                        handleChange(e);
                      }}
                    />
                    <span className={`text-sm transition-colors ${autoFilledFields.includes(flag.key) ? 'text-amber-400 group-hover:text-amber-300' : 'text-slate-400 group-hover:text-white'}`}>
                      {flag.label}
                    </span>
                    {autoFilledFields.includes(flag.key) && <AlertCircle size={12} className="text-highlight ml-[-4px]" title="Auto-populated from document" />}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="rotate-45" />
            {error}
          </div>
        )}

        <div className="flex justify-center items-center gap-6 py-10">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary px-12 py-4 text-lg font-bold border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all h-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'Draft')}
            disabled={loading}
            className="btn-secondary px-12 py-4 text-lg font-bold border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-indigo-100 transition-all h-auto bg-indigo-500/5 hover:bg-indigo-500/10"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-3 px-16 py-4 text-lg font-bold shadow-2xl shadow-indigo-500/20 group h-auto"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {formData.status === 'Draft' ? 'Publish Listing' : (isEditing ? 'Update Listing' : 'Publish Listing')}
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
