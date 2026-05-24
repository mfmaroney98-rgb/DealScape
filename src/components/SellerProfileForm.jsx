import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sellerListingService } from '../services/sellerListingService';
import { aiService } from '../services/aiService';
import TagInput from './TagInput';
import { fetchNaicsSectors, expandNaicsCodes } from '../services/naicsService';
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
  Sparkles,
  Plus,
  Minus
} from 'lucide-react';



const KEYWORD_CATEGORIES = [
  { id: 'industry', label: 'Industry / Vertical', example: 'Industrials, HealthTech' },
  { id: 'business_model', label: 'Business Model', example: 'B2B SaaS, Managed Services' },
  { id: 'revenue_model', label: 'Revenue Model', example: 'Subscription, Recurring' },
  { id: 'customer_type', label: 'Customer Type', example: 'Fortune 500, SMB' },
  { id: 'operational_model', label: 'Operational Model', example: 'Asset-light, Remote-first' },
  { id: 'differentiation', label: 'Differentiation', example: 'Proprietary IP, Sole-source' },
  { id: 'end_market', label: 'End Market', example: 'Independent Clinics, Government' }
];

export default function SellerProfileForm({ userId, orgId, onComplete }) {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const isEditing = !!listingId;

  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [teaserFile, setTeaserFile] = useState(null);
  const [cimFile, setCimFile] = useState(null);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const [filesUrlsToDelete, setFilesUrlsToDelete] = useState([]);

  const handleRemoveExistingFile = (type) => {
    const oldUrl = formData[`${type}_url`];
    if (oldUrl) {
      setFilesUrlsToDelete(prev => [...prev, oldUrl]);
    }
    setFilesToDelete(prev => [...prev, type]);
    setFormData(prev => ({
      ...prev,
      [`${type}_url`]: null,
      [`${type}_file_name`]: null
    }));
  };

  const handleRemoveTeaserFile = () => {
    if (teaserFile) {
      setTeaserFile(null);
      setFormData(prev => ({
        ...prev,
        teaser_file_name: null
      }));
    } else {
      handleRemoveExistingFile('teaser');
    }
  };

  const handleRemoveCimFile = () => {
    if (cimFile) {
      setCimFile(null);
      setFormData(prev => ({
        ...prev,
        cim_file_name: null
      }));
    } else {
      handleRemoveExistingFile('cim');
    }
  };
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

  // Geography data loaded from Supabase
  const [geoTree, setGeoTree] = useState([]);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);

  const [expandedNaicsSectors, setExpandedNaicsSectors] = useState(new Set());
  const [expandedNaicsSubsectors, setExpandedNaicsSubsectors] = useState(new Set());

  // NAICS data loaded from Supabase
  const [naicsSectors, setNaicsSectors] = useState([]);
  const [naicsLoading, setNaicsLoading] = useState(true);
  const [naicsError, setNaicsError] = useState(null);

  useEffect(() => {
    fetchGeographyTree()
      .then(data => setGeoTree(data))
      .catch(err => setGeoError(err.message || 'Failed to load geography data'))
      .finally(() => setGeoLoading(false));

    fetchNaicsSectors()
      .then(data => setNaicsSectors(data))
      .catch(err => setNaicsError(err.message || 'Failed to load NAICS codes'))
      .finally(() => setNaicsLoading(false));

    // Fetch listing data if editing
    if (isEditing) {
      if (!orgId) {
        setLoading(true);
        return;
      }
      setLoading(true);
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
                user_id: data.user_id || userId,
                organization_id: data.organization_id || orgId,
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
                financial_history: sanitizedHistory,
                naics_codes: Array.isArray(data.naics_codes) ? data.naics_codes : []
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
  }, [listingId, userId, isEditing, orgId]);

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
        'FY-2': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '', capex: '' },
        'FY-1': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '', capex: '' },
        'FY0': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '', capex: '' },
        'LTM': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '', capex: '' },
        'FY1E': { date: '', revenue: '', gross_profit: '', ebitda: '', ebit: '', net_income: '', capex: '' }
      },
      naics_codes: [],
      embedding: null,
      last_embedded_text: '',
      status: 'Draft',
      teaser_url: null,
      teaser_file_name: null,
      cim_url: null,
      cim_file_name: null
    }
  });

  // Sync userId and orgId to formData when they become available
  useEffect(() => {
    if (userId && !formData.user_id) {
      setFormData(prev => ({ ...prev, user_id: userId }));
    }
    if (orgId && !formData.organization_id) {
      setFormData(prev => ({ ...prev, organization_id: orgId }));
    }
  }, [userId, orgId, formData.user_id, formData.organization_id]);

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
    if (autoFilledFields.includes('locations')) {
      setAutoFilledFields(prev => prev.filter(f => f !== 'locations'));
    }
    const key = makeStateKey(countryCode, stateName);
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.includes(key)
        ? prev.locations.filter(s => s !== key)
        : [...prev.locations, key]
    }));
  };

  const handleCountryToggle = (country) => {
    if (autoFilledFields.includes('locations')) {
      setAutoFilledFields(prev => prev.filter(f => f !== 'locations'));
    }
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
    if (autoFilledFields.includes('locations')) {
      setAutoFilledFields(prev => prev.filter(f => f !== 'locations'));
    }
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

  // NAICS code toggle handlers
  const toggleNaicsSectorExpand = (e, sectorCode) => {
    e.stopPropagation();
    setExpandedNaicsSectors(prev => {
      const next = new Set(prev);
      if (next.has(sectorCode)) next.delete(sectorCode);
      else next.add(sectorCode);
      return next;
    });
  };

  const toggleNaicsSubsectorExpand = (e, subsectorCode) => {
    e.stopPropagation();
    setExpandedNaicsSubsectors(prev => {
      const next = new Set(prev);
      if (next.has(subsectorCode)) next.delete(subsectorCode);
      else next.add(subsectorCode);
      return next;
    });
  };

  const handleNaicsSectorToggle = (sector) => {
    const allCodes = [
      sector.code,
      ...sector.subsectors.map(s => s.code),
      ...sector.subsectors.flatMap(s => (s.industryGroups || []).map(ig => ig.code))
    ];
    setFormData(prev => {
      const allSelected = allCodes.every(c => prev.naics_codes.includes(c));
      let updated = [...prev.naics_codes];
      if (allSelected) {
        updated = updated.filter(c => !allCodes.includes(c));
      } else {
        allCodes.forEach(c => { if (!updated.includes(c)) updated.push(c); });
      }
      return { ...prev, naics_codes: updated };
    });
  };

  const handleNaicsSubsectorToggle = (sectorCode, subsector) => {
    const subsectorCode = subsector.code;
    const allSubCodes = [subsectorCode, ...(subsector.industryGroups || []).map(ig => ig.code)];
    
    setFormData(prev => {
      let updated = [...prev.naics_codes];
      const allSelected = allSubCodes.every(c => updated.includes(c));
      
      if (allSelected) {
        updated = updated.filter(c => !allSubCodes.includes(c));
        updated = updated.filter(c => c !== sectorCode);
      } else {
        allSubCodes.forEach(c => { if (!updated.includes(c)) updated.push(c); });
        const sector = naicsSectors.find(s => s.code === sectorCode);
        if (sector) {
          const allSectorSubCodes = [
            ...sector.subsectors.map(s => s.code),
            ...sector.subsectors.flatMap(s => (s.industryGroups || []).map(ig => ig.code))
          ];
          if (allSectorSubCodes.every(c => updated.includes(c))) {
            if (!updated.includes(sectorCode)) updated.push(sectorCode);
          }
        }
      }
      return { ...prev, naics_codes: updated };
    });
  };

  const handleNaicsIndustryGroupToggle = (sectorCode, subsectorCode, igCode) => {
    setFormData(prev => {
      let updated = [...prev.naics_codes];
      if (updated.includes(igCode)) {
        updated = updated.filter(c => c !== igCode);
        updated = updated.filter(c => c !== subsectorCode && c !== sectorCode);
      } else {
        if (!updated.includes(igCode)) updated.push(igCode);
        const sector = naicsSectors.find(s => s.code === sectorCode);
        const subsector = sector?.subsectors.find(s => s.code === subsectorCode);
        if (subsector && (subsector.industryGroups || []).every(ig => updated.includes(ig.code))) {
          if (!updated.includes(subsectorCode)) updated.push(subsectorCode);
          if (sector.subsectors.every(s => updated.includes(s.code))) {
            if (!updated.includes(sectorCode)) updated.push(sectorCode);
          }
        }
      }
      return { ...prev, naics_codes: updated };
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

        const rawNaicsCodes = parsedData.naics_codes || [];
        const expandedNaics = expandNaicsCodes(rawNaicsCodes, naicsSectors);

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
          financial_history: mergedHistory,
          naics_codes: expandedNaics.length ? [...new Set([...prev.naics_codes, ...expandedNaics])] : prev.naics_codes,
          locations: parsedData.locations?.length ? [...new Set([...prev.locations, ...parsedData.locations])] : prev.locations
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
      if (parsedData.naics_codes?.length) updatedFields.push('naics_codes');
      if (parsedData.locations?.length) updatedFields.push('locations');

      setAutoFilledFields(updatedFields);
      if (hasKeywords) {
        const tagsToHighlight = (parsedData.keywords && typeof parsedData.keywords === 'object')
          ? Object.values(parsedData.keywords).flat().filter(Boolean)
          : (Array.isArray(parsedData.keywords) ? parsedData.keywords : []);
        setAutoFilledTags(tagsToHighlight);
      }

      // Auto-expand NAICS tree for parsed codes
      if (parsedData.naics_codes && Array.isArray(parsedData.naics_codes)) {
        setExpandedNaicsSectors(prev => {
          const next = new Set(prev);
          parsedData.naics_codes.forEach(code => {
            if (code.length >= 2) next.add(code.substring(0, 2));
          });
          return next;
        });
        setExpandedNaicsSubsectors(prev => {
          const next = new Set(prev);
          parsedData.naics_codes.forEach(code => {
            if (code.length >= 3) next.add(code.substring(0, 3));
          });
          return next;
        });
      }

      // Auto-expand Geography tree for parsed locations
      if (parsedData.locations && Array.isArray(parsedData.locations)) {
        setExpandedCountries(prev => {
          const next = new Set(prev);
          parsedData.locations.forEach(locKey => {
            const [cCode] = locKey.split(':');
            if (cCode) next.add(cCode);
          });
          return next;
        });
        setExpandedContinents(prev => {
          const next = new Set(prev);
          parsedData.locations.forEach(locKey => {
            const [cCode] = locKey.split(':');
            if (cCode) {
              const continent = geoTree.find(cont =>
                cont.countries.some(ctry => ctry.code === cCode)
              );
              if (continent) next.add(continent.name);
            }
          });
          return next;
        });
      }

      // 4. Generate Triple-Vector Segmented Embeddings for Granular Matching
      if (parsedData.keywords && typeof parsedData.keywords === 'object') {
        try {
          const { industryVec, modelVec, targetVec } = await aiService.generateSegmentedEmbeddings(parsedData.keywords);
          setFormData(prev => ({ 
            ...prev, 
            embedding_industry: industryVec,
            embedding_model: modelVec,
            embedding_target: targetVec,
            last_embedded_text: JSON.stringify(parsedData.keywords)
          }));
        } catch (err) {
          console.warn('Failed to generate segmented embeddings during parsing', err);
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
    return `${baseClass} transition-colors`;
  };

  const [viewingLoader, setViewingLoader] = useState({ teaser: false, cim: false });

  const handleViewDocument = async (type) => {
    try {
      const file = type === 'teaser' ? teaserFile : cimFile;
      if (file instanceof File) {
        // Unsaved local file: open using browser object URL
        const localUrl = URL.createObjectURL(file);
        window.open(localUrl, '_blank');
      } else {
        // Saved file: request secure signed URL from storage
        const storageUrl = formData[`${type}_url`];
        if (storageUrl) {
          setViewingLoader(prev => ({ ...prev, [type]: true }));
          const signedUrl = await sellerListingService.getSignedUrl(storageUrl);
          window.open(signedUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('Failed to view document:', err);
      setError(`Failed to open document: ${err.message || err.toString()}`);
    } finally {
      setViewingLoader(prev => ({ ...prev, [type]: false }));
    }
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

      // Clear phantom file names if they were never uploaded to storage
      if (!teaserFile && !formData.teaser_url) {
        sanitizedData.teaser_file_name = null;
      }
      if (!cimFile && !formData.cim_url) {
        sanitizedData.cim_file_name = null;
      }

      // Apply specific type conversions and status
      sanitizedData.employees_count = sanitizedData.employees_count === '' || sanitizedData.employees_count === null ? null : parseInt(sanitizedData.employees_count, 10);
      sanitizedData.year_founded = sanitizedData.year_founded === '' || sanitizedData.year_founded === null ? null : String(sanitizedData.year_founded);
      sanitizedData.status = submitStatus;

      // Ensure keywords are saved as a comma-separated string (not array) for the TEXT column
      if (Array.isArray(sanitizedData.keywords)) {
        sanitizedData.keywords = sanitizedData.keywords.join(', ');
      }

      // Triple-Vector Refresh: Regenerate segmented embeddings if keywords have changed
      const currentKeywordsJson = JSON.stringify(formData.categorized_keywords || {});
      if (currentKeywordsJson !== formData.last_embedded_text) {
        try {
          const { industryVec, modelVec, targetVec } = await aiService.generateSegmentedEmbeddings(formData.categorized_keywords);
          sanitizedData.embedding_industry = industryVec;
          sanitizedData.embedding_model = modelVec;
          sanitizedData.embedding_target = targetVec;
          sanitizedData.last_embedded_text = currentKeywordsJson;
        } catch (err) {
          console.warn('Failed to refresh segmented embeddings on submit:', err);
        }
      }

      // 1. Save metadata first to get ID
      const savedListing = await sellerListingService.saveListing(sanitizedData);

      // 2. Handle file uploads and deletions
      const fileUpdates = {};
      let hasUpdates = false;

      if (teaserFile instanceof File) {
        const path = await sellerListingService.uploadListingDocument(savedListing.id, teaserFile, 'teaser');
        fileUpdates.teaser_url = path;
        fileUpdates.teaser_file_name = teaserFile.name;
        hasUpdates = true;
      }
      if (cimFile instanceof File) {
        const path = await sellerListingService.uploadListingDocument(savedListing.id, cimFile, 'cim');
        fileUpdates.cim_url = path;
        fileUpdates.cim_file_name = cimFile.name;
        hasUpdates = true;
      }

      // Clean up deleted files from storage
      for (const oldUrl of filesUrlsToDelete) {
        try {
          await sellerListingService.deleteListingDocument(oldUrl);
        } catch (err) {
          console.warn('Failed to delete old storage file:', oldUrl, err);
        }
      }

      // Apply nulls for deleted fields in DB
      if (filesToDelete.includes('teaser')) {
        fileUpdates.teaser_url = null;
        fileUpdates.teaser_file_name = null;
        hasUpdates = true;
      }
      if (filesToDelete.includes('cim')) {
        fileUpdates.cim_url = null;
        fileUpdates.cim_file_name = null;
        hasUpdates = true;
      }

      // Save updates back to DB if any
      if (hasUpdates) {
        await sellerListingService.updateListing(savedListing.id, fileUpdates);
      }

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
    <div className="max-w-[1400px] mx-auto py-12 px-6 animate-fade-in">
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
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Teaser Document</h4>
            {(formData.teaser_file_name && !filesToDelete.includes('teaser')) || teaserFile ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 w-full flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <FileText className="text-amber-600 flex-shrink-0" size={20} />
                    <span className="text-sm text-slate-900 font-bold truncate" title={teaserFile ? teaserFile.name : formData.teaser_file_name}>
                      {teaserFile ? teaserFile.name : formData.teaser_file_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {(teaserFile || formData.teaser_url) && (
                      <button
                        type="button"
                        onClick={() => handleViewDocument('teaser')}
                        disabled={viewingLoader.teaser}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-2.5 py-1.5 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      >
                        {viewingLoader.teaser && <Loader2 className="animate-spin" size={12} />}
                        View
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveTeaserFile}
                      className="text-xs text-red-600 hover:text-red-700 font-bold px-2.5 py-1.5 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {formData.teaser_file_name && !formData.teaser_url && !teaserFile && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded-lg font-medium leading-relaxed">
                    Draft recovered. Please re-select this PDF file to upload it upon saving.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setTeaserFile(file);
                    setFilesToDelete(prev => prev.filter(f => f !== 'teaser'));
                    setFormData(prev => ({
                      ...prev,
                      teaser_file_name: file ? file.name : null
                    }));
                  }}
                  className="text-sm text-slate-900 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 transition-colors w-full"
                  title="Upload Teaser"
                />
                <div className={`mt-2 ${teaserFile ? 'text-amber-600' : 'text-slate-700'}`}>
                  <UploadCloud size={24} />
                </div>
                <p className="font-bold text-slate-900">Upload New Teaser</p>
                <p className="text-xs text-slate-800 font-medium">Select a PDF document. We will securely extract the key metrics.</p>
              </div>
            )}
          </div>

          {/* CIM Upload */}
          <div style={{ flex: 1 }} className="flex flex-col items-start gap-2 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-2">CIM Document</h4>
            {(formData.cim_file_name && !filesToDelete.includes('cim')) || cimFile ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 w-full flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <FileText className="text-indigo-600 flex-shrink-0" size={20} />
                    <span className="text-sm text-slate-900 font-bold truncate" title={cimFile ? cimFile.name : formData.cim_file_name}>
                      {cimFile ? cimFile.name : formData.cim_file_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {(cimFile || formData.cim_url) && (
                      <button
                        type="button"
                        onClick={() => handleViewDocument('cim')}
                        disabled={viewingLoader.cim}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-2.5 py-1.5 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                      >
                        {viewingLoader.cim && <Loader2 className="animate-spin" size={12} />}
                        View
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveCimFile}
                      className="text-xs text-red-600 hover:text-red-700 font-bold px-2.5 py-1.5 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {formData.cim_file_name && !formData.cim_url && !cimFile && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 p-2 rounded-lg font-medium leading-relaxed">
                    Draft recovered. Please re-select this PDF file to upload it upon saving.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCimFile(file);
                    setFilesToDelete(prev => prev.filter(f => f !== 'cim'));
                    setFormData(prev => ({
                      ...prev,
                      cim_file_name: file ? file.name : null
                    }));
                  }}
                  className="text-sm text-slate-900 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 transition-colors w-full"
                  title="Upload CIM"
                />
                <div className={`mt-2 ${cimFile ? 'text-indigo-600' : 'text-slate-700'}`}>
                  <FileText size={24} />
                </div>
                <p className="font-bold text-slate-900">Upload New CIM</p>
                <p className="text-xs text-slate-800 font-medium">Select a PDF document. We will securely extract the key metrics.</p>
              </div>
            )}
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
        <div className="glass p-8 rounded-3xl shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Building2 className="text-indigo-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Business Identity</h2>
          </div>

          <div className="space-y-6">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  Company Name or Project Name
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  <p className="text-xs text-slate-500">This information is for internal reference only and will <strong>not</strong> be visible to buyers.</p>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    Listing Title (Anonymized)
                  </span>
                </label>
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
                <label className="form-label flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  Employee Count
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="employees_count"
                    className={getInputClass('employees_count', 'form-input')}
                    value={formData.employees_count}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label className="form-label flex items-center gap-2">
                  <Building2 size={16} className="text-slate-400" />
                  Year Founded
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    name="year_founded"
                    className={getInputClass('year_founded', 'form-input')}
                    value={formData.year_founded}
                    onChange={handleChange}
                    placeholder="YYYY"
                  />
                </div>
              </div>
            </div>

            {/* Business Location & Ownership Structure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="form-label flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                    <span className="flex items-center gap-2">
                      <Briefcase size={16} className="text-slate-400" />
                      Ownership Structure
                    </span>
                  </label>
                  <select name="ownership_structure" className={getInputClass('ownership_structure', 'form-input w-full')} style={{ width: '100%', appearance: 'auto' }} value={formData.ownership_structure} onChange={handleChange}>
                    <option value="">Select Ownership</option>
                    <option value="Private Company">Private Company</option>
                    <option value="Investment Firm Portfolio Company">Investment Firm Portfolio Company</option>
                    <option value="Public Company">Public Company</option>
                    <option value="Corporate Subsidiary">Corporate Subsidiary</option>
                  </select>
                </div>
                <div>
                  <label className="form-label flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                    <MapPin size={16} className="text-slate-400" />
                    Business Location
                  </label>
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
                            <div className="geo-row group">
                              <button
                                type="button"
                                onClick={(e) => toggleContinentExpand(e, continent.name)}
                                className={`geo-expand-btn ${isContExpanded ? 'expanded' : ''}`}
                              >
                                {isContExpanded ? <Minus size={10} strokeWidth={3} /> : <Plus size={10} strokeWidth={3} />}
                              </button>
                              <div
                                className={`geo-check ${allContSelected ? 'checked' : someContSelected ? 'partial' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleContinentToggle(continent); }}
                              >
                                {allContSelected && <CheckCircle2 size={14} />}
                              </div>
                              <span className="geo-label-bold" onClick={() => handleContinentToggle(continent)}>
                                {continent.name}
                              </span>
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
                                      <div className="geo-row group">
                                        <button
                                          type="button"
                                          onClick={(e) => toggleCountryExpand(e, country.code)}
                                          className={`geo-expand-btn ${isCtryExpanded ? 'expanded' : ''}`}
                                        >
                                          {isCtryExpanded ? <Minus size={10} strokeWidth={3} /> : <Plus size={10} strokeWidth={3} />}
                                        </button>
                                        <div
                                          className={`geo-check-sm ${allCtrySelected ? 'checked' : someCtrySelected ? 'partial' : ''}`}
                                          onClick={() => handleCountryToggle(country)}
                                        >
                                          {allCtrySelected && <CheckCircle2 size={12} />}
                                        </div>
                                        <span className="geo-label-semi" onClick={() => handleCountryToggle(country)}>{country.name}</span>
                                      </div>
                                      {isCtryExpanded && (
                                        <div className="geo-children">
                                          {country.states.map((stateName, sIdx) => {
                                            const isLastState = sIdx === country.states.length - 1;
                                            const stateKey = makeStateKey(country.code, stateName);
                                            const isStateSelected = formData.locations.includes(stateKey);
                                            return (
                                              <div key={stateKey} className={`geo-branch ${isLastState ? 'geo-branch-last' : ''}`}>
                                                <div className="geo-row group">
                                                  <div className="geo-expand-spacer" />
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
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <label className="form-label flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
                    <FileText size={16} className="text-slate-400" />
                    Legal Entity
                  </label>
                  <select name="legal_entity" className={getInputClass('legal_entity', 'form-input w-full')} style={{ width: '100%', appearance: 'auto' }} value={formData.legal_entity} onChange={handleChange}>
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

                <div>
                  <label className="form-label flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                    <span className="flex items-center gap-2">
                      <Briefcase size={16} className="text-slate-400" />
                      Industry Classification (NAICS)
                      {formData.naics_codes.length > 0 && (
                        <span className="ml-2 text-[0.7rem] bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5 font-bold">
                          {formData.naics_codes.length} SELECTED
                        </span>
                      )}
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Select the NAICS codes that best describe your business.
                  </p>
                  <div className="geo-tree" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {naicsLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                        Loading industry codes...
                      </div>
                    ) : naicsError ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#f87171' }}>
                        {naicsError}
                      </div>
                    ) : (
                      naicsSectors.map((sector, sIdx) => {
                        const isLastSector = sIdx === naicsSectors.length - 1;
                        const allSubCodes = [
                          ...sector.subsectors.map(s => s.code),
                          ...sector.subsectors.flatMap(s => (s.industryGroups || []).map(ig => ig.code))
                        ];
                        const allSelected = [sector.code, ...allSubCodes].every(c => formData.naics_codes.includes(c));
                        const someSelected = allSubCodes.some(c => formData.naics_codes.includes(c)) && !allSelected;
                        const isExpanded = expandedNaicsSectors.has(sector.code);

                        return (
                          <div key={sector.code} className={`geo-branch ${isLastSector ? 'geo-branch-last' : ''}`}>
                            <div className="geo-row group">
                              <button
                                type="button"
                                onClick={(e) => toggleNaicsSectorExpand(e, sector.code)}
                                className={`geo-expand-btn ${isExpanded ? 'expanded' : ''}`}
                              >
                                {isExpanded ? <Minus size={10} strokeWidth={3} /> : <Plus size={10} strokeWidth={3} />}
                              </button>
                              <div
                                className={`geo-check-sm ${allSelected ? 'checked' : someSelected ? 'partial' : ''}`}
                                onClick={() => handleNaicsSectorToggle(sector)}
                              >
                                {allSelected && <CheckCircle2 size={12} />}
                              </div>
                              <span className="geo-label-semi" style={{ fontSize: '0.875rem' }} onClick={() => handleNaicsSectorToggle(sector)}>
                                <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace', marginRight: '0.3rem' }}>{sector.code}</span>
                                {sector.name}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="geo-children">
                                {sector.subsectors.map((sub, ssIdx) => {
                                  const isLastSub = ssIdx === sector.subsectors.length - 1;
                                  const igCodes = (sub.industryGroups || []).map(ig => ig.code);
                                  const isSubAllSelected = [sub.code, ...igCodes].every(c => formData.naics_codes.includes(c));
                                  const isSubSomeSelected = igCodes.some(c => formData.naics_codes.includes(c)) && !isSubAllSelected;
                                  const isSubExpanded = expandedNaicsSubsectors.has(sub.code);

                                  return (
                                    <div key={sub.code} className={`geo-branch ${isLastSub ? 'geo-branch-last' : ''}`}>
                                      <div className="geo-row group">
                                        {sub.industryGroups?.length > 0 ? (
                                          <button
                                            type="button"
                                            onClick={(e) => toggleNaicsSubsectorExpand(e, sub.code)}
                                            className={`geo-expand-btn ${isSubExpanded ? 'expanded' : ''}`}
                                          >
                                            {isSubExpanded ? <Minus size={10} strokeWidth={3} /> : <Plus size={10} strokeWidth={3} />}
                                          </button>
                                        ) : (
                                          <div className="geo-expand-spacer" />
                                        )}
                                        <div
                                          className={`geo-check-sm ${isSubAllSelected ? 'checked' : isSubSomeSelected ? 'partial' : ''}`}
                                          onClick={() => handleNaicsSubsectorToggle(sector.code, sub)}
                                        >
                                          {isSubAllSelected && <CheckCircle2 size={10} />}
                                        </div>
                                        <span className={`geo-label-state ${isSubAllSelected ? 'selected' : ''}`} style={{ fontSize: '0.875rem' }} onClick={() => handleNaicsSubsectorToggle(sector.code, sub)}>
                                          <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace', marginRight: '0.3rem' }}>{sub.code}</span>
                                          {sub.name}
                                        </span>
                                      </div>

                                      {isSubExpanded && sub.industryGroups && (
                                        <div className="geo-children">
                                          {sub.industryGroups.map((ig, igIdx) => {
                                            const isLastIg = igIdx === sub.industryGroups.length - 1;
                                            const isIgSelected = formData.naics_codes.includes(ig.code);
                                            return (
                                              <div key={ig.code} className={`geo-branch ${isLastIg ? 'geo-branch-last' : ''}`}>
                                                <div className="geo-row group">
                                                  <div className="geo-expand-spacer" />
                                                  <div
                                                    className={`geo-check-sm ${isIgSelected ? 'checked' : ''}`}
                                                    onClick={() => handleNaicsIndustryGroupToggle(sector.code, sub.code, ig.code)}
                                                  >
                                                    {isIgSelected && <CheckCircle2 size={8} />}
                                                  </div>
                                                  <span className={`geo-label-state ${isIgSelected ? 'selected' : ''}`} style={{ fontSize: '0.825rem', opacity: 0.9 }} onClick={() => handleNaicsIndustryGroupToggle(sector.code, sub.code, ig.code)}>
                                                    <span style={{ color: 'var(--color-accent)', fontFamily: 'monospace', marginRight: '0.3rem' }}>{ig.code}</span>
                                                    {ig.name}
                                                  </span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Business Details */}
        <div className="glass p-8 rounded-3xl shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Tag className="text-amber-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Business Characteristics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {KEYWORD_CATEGORIES.map(cat => (
              <div key={cat.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col transition-all hover:border-accent/30 hover:shadow-md">
                <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-6 flex justify-between items-center px-1">
                  {cat.label}
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
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Financials */}
        <div className="glass" style={{ padding: '2rem', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative' }}>
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
            <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: '16px 0' }}>
              <thead>
                <tr>
                  <th className="p-2 font-normal text-slate-600 text-left" style={{ width: '200px', verticalAlign: 'bottom' }}></th>
                  {['FY-2', 'FY-1', 'FY0'].map(period => (
                    <th key={period} className="px-4 py-2 font-bold text-slate-500 text-right" style={{ verticalAlign: 'bottom', position: 'relative' }}>
                      <div className="flex flex-col items-end" style={{ gap: '4px' }}>
                        <span>Fiscal Year {period.replace('FY', '')}</span>
                        <input
                          type="date"
                          style={{ textAlign: 'right' }}
                          className="text-slate-500 bg-transparent outline-none w-full italic text-xs cursor-pointer hover:text-slate-400 transition-colors"
                          value={formData.financial_history?.[period]?.date || ''}
                          onChange={(e) => handleFinancialDateChange(period, e.target.value)}
                          title={`Period end date for ${period}`}
                        />
                      </div>
                      
                      {/* --- Sleek Add LTM button in between columns --- */}
                      {period === 'FY0' && !showLtm && (
                        <div style={{ position: 'absolute', top: '12px', left: 'calc(100% + 8px)', transform: 'translateX(-50%)', zIndex: 20 }}>
                          <button
                            type="button"
                            onClick={() => setShowLtm(true)}
                            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg"
                            style={{
                              background: 'rgba(52, 211, 153, 0.1)',
                              border: '1px solid rgba(52, 211, 153, 0.4)',
                              color: '#059669',
                              fontSize: '0.62rem',
                              fontWeight: '800',
                              letterSpacing: '0.05em',
                              cursor: 'pointer',
                              backdropFilter: 'blur(8px)',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Plus size={12} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                            ADD LTM
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                  {showLtm && (
                    <th className="px-4 py-2 font-bold text-slate-500 text-right" style={{ verticalAlign: 'bottom' }}>
                      <div className="flex flex-col items-end" style={{ gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowLtm(false)}
                          className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            letterSpacing: '0.03em',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            whiteSpace: 'nowrap',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>✕</span>
                          REMOVE LTM
                        </button>
                        <span style={{ letterSpacing: '0.05em' }}>LTM</span>
                        <input
                          type="date"
                          style={{ textAlign: 'right' }}
                          className="text-slate-500 bg-transparent outline-none w-full placeholder-slate-500/50 italic text-xs cursor-pointer"
                          value={formData.financial_history?.LTM?.date || ''}
                          onChange={(e) => handleFinancialDateChange('LTM', e.target.value)}
                        />
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-2 font-bold text-right text-slate-500" style={{ verticalAlign: 'bottom' }}>
                    <div className="flex flex-col items-end" style={{ gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', color: '#7c3aed', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '0.3rem', padding: '0.1rem 0.4rem' }}>ESTIMATE</span>
                      <span>Fiscal Year +1</span>
                      <input
                        type="date"
                        className="text-slate-500 bg-transparent outline-none w-full italic text-xs cursor-pointer hover:text-slate-400 transition-colors"
                        style={{ textAlign: 'right' }}
                        value={formData.financial_history?.['FY1E']?.date || ''}
                        onChange={(e) => handleFinancialDateChange('FY1E', e.target.value)}
                        title="Expected fiscal year end date"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* --- Revenue --- */}
                <tr>
                  <td className="p-2 pt-2 font-bold text-slate-500">Revenue</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const rev = formData.financial_history?.[year]?.revenue;
                    return (
                      <td key={year} className="px-4 py-2 pt-2 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
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
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>YoY Growth</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    let yoy = '';
                    const isFocused = focusedField && (
                      (focusedField.year === year && focusedField.field === 'revenue') ||
                      (year === 'FY-1' && focusedField.year === 'FY-2' && focusedField.field === 'revenue') ||
                      (year === 'FY0' && focusedField.year === 'FY-1' && focusedField.field === 'revenue') ||
                      (year === 'FY1E' && focusedField.year === 'FY0' && focusedField.field === 'revenue')
                    );

                    if (!isFocused) {
                      const currentRev = formData.financial_history?.[year]?.revenue;
                      if (year === 'FY-1') {
                        const priorRev = formData.financial_history?.['FY-2']?.revenue;
                        if (currentRev && priorRev) {
                          yoy = Math.round(((currentRev - priorRev) / priorRev) * 100);
                        }
                      } else if (year === 'FY0') {
                        const priorRev = formData.financial_history?.['FY-1']?.revenue;
                        if (currentRev && priorRev) {
                          yoy = Math.round(((currentRev - priorRev) / priorRev) * 100);
                        }
                      } else if (year === 'FY1E') {
                        const priorRev = formData.financial_history?.['FY0']?.revenue;
                        if (currentRev && priorRev) {
                          yoy = Math.round(((currentRev - priorRev) / priorRev) * 100);
                        }
                      }
                    }
                    return (
                      <td key={year} style={{ paddingBottom: '0.75rem', paddingTop: '0.125rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: year === 'FY1E' ? '#a78bfa' : '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {yoy !== '' ? `${yoy}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Gross Profit --- */}
                <tr>
                  <td className="p-2 pt-3 font-bold text-slate-500">Gross Profit</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.gross_profit;
                    return (
                      <td key={year} className="px-4 py-2 pt-3 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
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
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>Gross Profit Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.gross_profit;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'gross_profit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '0.75rem', paddingTop: '0.125rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBITDA --- */}
                <tr>
                  <td className="p-2 pt-3 font-bold text-slate-500">EBITDA</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.ebitda;
                    return (
                      <td key={year} className="px-4 py-2 pt-3 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
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
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>EBITDA Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.ebitda;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebitda' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '0.75rem', paddingTop: '0.125rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- EBIT --- */}
                <tr>
                  <td className="p-2 pt-3 font-bold text-slate-500">EBIT</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.ebit;
                    return (
                      <td key={year} className="px-4 py-2 pt-3 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
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
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>EBIT Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.ebit;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'ebit' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '0.75rem', paddingTop: '0.125rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- Net Income --- */}
                <tr>
                  <td className="p-2 pt-3 font-bold text-slate-500">Net Income</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.net_income;
                    return (
                      <td key={year} className="px-4 py-2 pt-3 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
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
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>Net Income Margin</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.net_income;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'net_income' || focusedField.field === 'revenue');
                    const margin = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ padding: '0.25rem 2rem 1.5rem 2rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {margin !== '' ? `${margin}%` : ''}
                      </td>
                    );
                  })}
                </tr>

                {/* --- CapEx --- */}
                <tr>
                  <td className="p-2 pt-3 font-bold text-slate-500">CapEx</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.capex;
                    return (
                      <td key={year} className="px-4 py-2 pt-3 text-right">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', justifyContent: 'flex-end', transition: 'all 0.2s' }}>
                          <span className="text-slate-500 font-medium">$</span>
                          <input
                            type="text"
                            style={{ textAlign: 'right', flexGrow: 1, background: 'transparent', outline: 'none', color: '#64748b', fontWeight: 'bold', minWidth: 0 }}
                            value={formatWithCommas(val)}
                            onChange={(e) => handleFinancialChange(year, 'capex', e.target.value)}
                            onFocus={() => setFocusedField({ year, field: 'capex' })}
                            onBlur={() => setFocusedField(null)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ padding: '0.125rem 0.25rem 0.75rem 1rem', fontSize: '0.75rem', fontStyle: 'italic', color: '#475569' }}>CapEx % of Revenue</td>
                  {(showLtm ? ['FY-2', 'FY-1', 'FY0', 'LTM', 'FY1E'] : ['FY-2', 'FY-1', 'FY0', 'FY1E']).map(year => {
                    const val = formData.financial_history?.[year]?.capex;
                    const rev = formData.financial_history?.[year]?.revenue;
                    const isFocused = focusedField && focusedField.year === year && (focusedField.field === 'capex' || focusedField.field === 'revenue');
                    const pct = (!isFocused && val && rev) ? Math.round((val / rev) * 100) : '';
                    return (
                      <td key={year} style={{ paddingBottom: '0.75rem', paddingTop: '0.125rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.875rem', fontStyle: 'italic' }}>
                        {pct !== '' ? `${pct}%` : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Metadata & Strategic */}
        <div className="glass p-8 rounded-3xl shadow-xl relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <PieChart className="text-purple-400" size={20} />
            </div>
            <h2 className="text-xl font-bold">Strategic Considerations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <label className="form-label">Preferred Transaction Types</label>
              <div className="grid grid-cols-1 gap-3 mt-4">
                {['Total Sale', 'Acquisition of Majority Stake', 'Acquisition of Minority Stake', 'Equity Raise', 'Debt Raise', 'Divestiture', 'Recapitalization', 'Restructuring'].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="pref_transaction_type"
                      className="h-5 w-5 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500 text-indigo-500"
                      checked={formData.pref_transaction_type?.includes(type)}
                      onChange={() => {
                        if (autoFilledFields.includes('pref_transaction_type')) {
                          setAutoFilledFields(prev => prev.filter(f => f !== 'pref_transaction_type'));
                        }
                        handlePrefTransactionToggle(type);
                      }}
                    />
                    <span className="text-sm transition-colors text-slate-400 group-hover:text-white">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Ownership Characteristics</label>
              <div className="grid grid-cols-1 gap-4 mt-4">
                {[
                  { key: 'is_founder_owned', label: 'Founder-Owned' },
                  { key: 'is_family_owned', label: 'Family-Owned' },
                  { key: 'is_operator_owned', label: 'Operator-Owned' },
                  { key: 'is_female_owned', label: 'Female-Owned' },
                  { key: 'is_minority_owned', label: 'Minority-Owned' }
                ].map(flag => (
                  <label key={flag.key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name={flag.key}
                      className="h-5 w-5 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500 text-indigo-500"
                      checked={formData[flag.key]}
                      onChange={(e) => {
                        if (autoFilledFields.includes(flag.key)) {
                          setAutoFilledFields(prev => prev.filter(f => f !== flag.key));
                        }
                        handleChange(e);
                      }}
                    />
                    <span className="text-sm transition-colors text-slate-400 group-hover:text-white">
                      {flag.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <label className="form-label flex items-center gap-2" style={{ marginBottom: '1rem' }}>
                  <Tag size={16} className="text-slate-400" />
                  Reason for Sale
                </label>
                <TagInput
                  tags={formData.categorized_keywords?.reason_for_sale || []}
                  setTags={(tags) => setFormData(prev => ({
                    ...prev,
                    categorized_keywords: {
                      ...prev.categorized_keywords,
                      reason_for_sale: tags
                    }
                  }))}
                  placeholder="e.g. Owner retirement, Growth capital, Corporate divestiture..."
                />
              </div>
              <div>
                <label className="form-label flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                  <span className="flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    Owner Transition Period
                  </span>
                </label>
                <select
                  name="owner_transition"
                  className="form-input w-full bg-white"
                  style={{ width: '100%', appearance: 'auto' }}
                  value={formData.owner_transition || ''}
                  onChange={handleChange}
                >
                  <option value="">Select duration...</option>
                  <option value="Flexible / open to discussion">Flexible / open to discussion</option>
                  <option value="Short transition only (0–12 months)">Short transition only (0–12 months)</option>
                  <option value="1–2 years">1–2 years</option>
                  <option value="3+ years">3+ years</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Describe the motivation for the transaction and the expected owner transition period. This is visible to buyers on their match results but does not affect your semantic score.
            </p>
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
