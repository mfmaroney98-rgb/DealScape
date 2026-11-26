import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { ndaTemplateService } from '../services/ndaTemplateService';
import { 
  Building2, 
  Globe, 
  FileText, 
  Users, 
  ArrowLeft, 
  Save, 
  Loader2,
  AlertCircle,
  MapPin,
  Map,
  UserPlus,
  Trash2,
  Mail,
  Briefcase,
  User,
  FileSignature,
  Upload,
  Star,
  Eye,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function SellerProfilePage({ userId, orgId, onComplete }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'users'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    organization_name: '',
    website_url: '',
    organization_summary: '',
    headquarters: '',
    other_locations: ''
  });

  // Organization users state
  const [orgUsers, setOrgUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    title: '',
    email: ''
  });
  const [addingUser, setAddingUser] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [userError, setUserError] = useState(null);
  const [userSuccess, setUserSuccess] = useState(null);

  // NDA templates & org defaults state
  const [ndaTemplates, setNdaTemplates] = useState([]);
  const [ndaDefaults, setNdaDefaults] = useState({
    default_nda_approval_required: true,
    default_nda_countersign_required: true,
    default_auto_release_cim_on_nda: true,
  });
  const [savingNdaDefaults, setSavingNdaDefaults] = useState(false);
  const [ndaDefaultsMsg, setNdaDefaultsMsg] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFile, setNewTemplateFile] = useState(null);
  const [newTemplateDefault, setNewTemplateDefault] = useState(true);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState(null);
  const [templateSuccess, setTemplateSuccess] = useState(null);
  const [templateActionId, setTemplateActionId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [org, users, templates] = await Promise.all([
          organizationService.getOrganization(orgId),
          organizationService.getOrganizationUsers(orgId),
          ndaTemplateService.getOrgTemplates(orgId)
        ]);
        
        setFormData({
          organization_name: org.organization_name || '',
          website_url: org.website_url || '',
          organization_summary: org.organization_summary || '',
          headquarters: org.headquarters || '',
          other_locations: Array.isArray(org.other_locations) ? org.other_locations.join(', ') : ''
        });
        setNdaDefaults({
          default_nda_approval_required: org.default_nda_approval_required ?? true,
          default_nda_countersign_required: org.default_nda_countersign_required ?? true,
          default_auto_release_cim_on_nda: org.default_auto_release_cim_on_nda ?? true,
        });
        setOrgUsers(users || []);
        setNdaTemplates(templates || []);
        setNewTemplateDefault((templates || []).length === 0);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load organization profile.');
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await organizationService.updateOrganization(orgId, {
        organization_name: formData.organization_name,
        website_url: formData.website_url,
        organization_summary: formData.organization_summary,
        headquarters: formData.headquarters,
        other_locations: formData.other_locations.split(',').map(l => l.trim()).filter(Boolean)
      });
      
      setSuccess(true);
      if (onComplete) {
        await onComplete();
      }
      
      setTimeout(() => {
        navigate('/dashboard/seller');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim()) return;

    setAddingUser(true);
    setUserError(null);
    setUserSuccess(null);

    try {
      const created = await organizationService.addOrganizationUser(orgId, {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        title: newUser.title,
        email: newUser.email,
        role: 'seller'
      });

      setOrgUsers(prev =>
        [...prev, created].sort((a, b) => {
          const aName = (a.first_name || a.name || a.email || '').trim().toLowerCase();
          const bName = (b.first_name || b.name || b.email || '').trim().toLowerCase();
          return aName.localeCompare(bName);
        })
      );
      setNewUser({ firstName: '', lastName: '', title: '', email: '' });
      setUserSuccess(`Added ${created.name} to the organization.`);
      setTimeout(() => setUserSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to add user:', err);
      setUserError(err.message || 'Failed to add user to organization.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveUser = async (member) => {
    if (member.id === userId) {
      if (!window.confirm('Are you sure you want to remove yourself from this organization?')) {
        return;
      }
    } else if (!window.confirm(`Remove ${member.name || member.email || 'this user'} from the organization?`)) {
      return;
    }

    setRemovingUserId(member.id);
    setUserError(null);
    setUserSuccess(null);

    try {
      await organizationService.removeOrganizationUser(member.id);
      setOrgUsers(prev => prev.filter(u => u.id !== member.id));
      setUserSuccess(`Removed ${member.name || member.email || 'user'} from the organization.`);
      setTimeout(() => setUserSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to remove user:', err);
      setUserError(err.message || 'Failed to remove user.');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleSaveNdaDefaults = async () => {
    setSavingNdaDefaults(true);
    setNdaDefaultsMsg(null);
    setTemplateError(null);
    try {
      await organizationService.updateOrganization(orgId, ndaDefaults);
      setNdaDefaultsMsg('Default NDA workflow settings saved.');
      setTimeout(() => setNdaDefaultsMsg(null), 3500);
    } catch (err) {
      console.error('Failed to save NDA defaults:', err);
      setTemplateError(err.message || 'Failed to save default NDA settings.');
    } finally {
      setSavingNdaDefaults(false);
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateFile) return;
    setUploadingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);

    try {
      const created = await ndaTemplateService.uploadOrgTemplate({
        orgId,
        userId,
        name: newTemplateName,
        file: newTemplateFile,
        isDefault: newTemplateDefault || ndaTemplates.length === 0,
      });
      const updatedList = await ndaTemplateService.getOrgTemplates(orgId);
      setNdaTemplates(updatedList);
      setNewTemplateName('');
      setNewTemplateFile(null);
      setNewTemplateDefault(false);
      setTemplateSuccess(`Uploaded "${created.name}".`);
      setTimeout(() => setTemplateSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to upload NDA template:', err);
      setTemplateError(err.message || 'Failed to upload NDA template.');
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleSetDefaultTemplate = async (templateId) => {
    setTemplateActionId(templateId);
    setTemplateError(null);
    try {
      await ndaTemplateService.setDefaultTemplate(orgId, templateId);
      const updatedList = await ndaTemplateService.getOrgTemplates(orgId);
      setNdaTemplates(updatedList);
    } catch (err) {
      console.error('Failed to set default template:', err);
      setTemplateError(err.message || 'Failed to update default template.');
    } finally {
      setTemplateActionId(null);
    }
  };

  const handleArchiveTemplate = async (template) => {
    if (!window.confirm(`Archive "${template.name}"? Existing NDA requests using it will remain intact.`)) return;
    setTemplateActionId(template.id);
    setTemplateError(null);
    try {
      await ndaTemplateService.archiveTemplate(orgId, template.id);
      const updatedList = await ndaTemplateService.getOrgTemplates(orgId);
      setNdaTemplates(updatedList);
    } catch (err) {
      console.error('Failed to archive template:', err);
      setTemplateError(err.message || 'Failed to archive template.');
    } finally {
      setTemplateActionId(null);
    }
  };

  const handleViewTemplate = async (filePath) => {
    try {
      const url = await ndaTemplateService.getSignedUrl(filePath, 120);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open template:', err);
      setTemplateError('Failed to open NDA template PDF.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto py-12">
        <Link to="/dashboard/seller" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-xl mb-4">
            <Users className="text-indigo-400" size={24} />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Seller Profile</h1>
          <p className="text-slate-400">Manage your organization's public identity and team members.</p>
        </div>

        {/* Tabs (matching SellerListings tab style) */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-800/60">
          {[
            { id: 'profile', icon: Building2, label: 'Seller Profile' },
            { id: 'users', icon: Users, label: 'Organization Users', count: orgUsers.length },
            { id: 'nda_templates', icon: FileSignature, label: 'NDA Templates', count: ndaTemplates.length }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-700 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-500/10'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900/60'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'profile' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass p-8 rounded-3xl shadow-2xl space-y-8">
              {/* Organization Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="field-group">
                  <label className="form-label mb-2 flex items-center gap-2">
                    <Building2 size={16} className="text-slate-500" />
                    Organization Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="organization_name"
                      className="form-input"
                      placeholder="Company Name"
                      value={formData.organization_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="form-label mb-2 flex items-center gap-2">
                    <Globe size={16} className="text-slate-500" />
                    Website URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="website_url"
                      className="form-input"
                      placeholder="https://www.example.com"
                      value={formData.website_url}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Headquarters and Other Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="field-group">
                  <label className="form-label mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-slate-500" />
                    Headquarters
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="headquarters"
                      className="form-input"
                      placeholder="e.g. New York, NY, USA or London, UK"
                      value={formData.headquarters}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="form-label mb-2 flex items-center gap-2">
                    <Map size={16} className="text-slate-500" />
                    Other Locations (comma-separated)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="other_locations"
                      className="form-input"
                      placeholder="e.g. Chicago, IL, USA, London, UK"
                      value={formData.other_locations}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Organization Summary */}
              <div className="field-group">
                <label className="form-label mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  Organization Summary
                </label>
                <div className="relative">
                  <textarea
                    name="organization_summary"
                    className="form-input min-h-[160px]"
                    placeholder="Tell us about your organization, team, and general industry focus..."
                    value={formData.organization_summary}
                    onChange={handleChange}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This summary helps buyers understand the team behind your listings.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
                <Save size={18} className="shrink-0 mt-0.5" />
                <span>Profile updated successfully! Redirecting...</span>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2 h-14 text-lg font-bold shadow-xl shadow-indigo-500/20"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <Save size={20} /> Save Seller Profile
                  </>
                )}
              </button>
              <Link to="/dashboard/seller" className="btn-secondary px-8 h-14 flex items-center justify-center font-bold">
                Cancel
              </Link>
            </div>
          </form>
        ) : activeTab === 'users' ? (
          <div className="space-y-8 animate-fade-in">
            {/* Add User Card */}
            <div className="glass p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Add User to Organization</h2>
                  <p className="text-xs text-slate-400">
                    Add a team member to {formData.organization_name || 'your organization'}.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="field-group">
                    <label className="form-label mb-2 flex items-center gap-2">
                      <User size={15} className="text-slate-500" />
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      className="form-input"
                      value={newUser.firstName}
                      onChange={handleNewUserChange}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="form-label mb-2 flex items-center gap-2">
                      <User size={15} className="text-slate-500" />
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      className="form-input"
                      value={newUser.lastName}
                      onChange={handleNewUserChange}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="form-label mb-2 flex items-center gap-2">
                      <Briefcase size={15} className="text-slate-500" />
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      className="form-input"
                      value={newUser.title}
                      onChange={handleNewUserChange}
                    />
                  </div>

                  <div className="field-group">
                    <label className="form-label mb-2 flex items-center gap-2">
                      <Mail size={15} className="text-slate-500" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={newUser.email}
                      onChange={handleNewUserChange}
                      required
                    />
                  </div>
                </div>

                {userError && (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{userError}</span>
                  </div>
                )}

                {userSuccess && (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fade-in">
                    <UserPlus size={18} className="shrink-0 mt-0.5" />
                    <span>{userSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingUser || !newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim()}
                    className="btn-primary flex items-center justify-center gap-2 px-6 py-3 font-bold shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    {addingUser ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <UserPlus size={18} /> Add User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Current Members List */}
            <div className="glass p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Organization Members</h2>
                  <p className="text-xs text-slate-400">
                    {orgUsers.length} {orgUsers.length === 1 ? 'member' : 'members'} in {formData.organization_name || 'this organization'}
                  </p>
                </div>
              </div>

              {orgUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users className="mx-auto mb-3 text-slate-500" size={36} />
                  <p className="font-medium">No users found in this organization.</p>
                  <p className="text-xs text-slate-500 mt-1">Use the form above to add team members.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {orgUsers.map((member) => {
                    const isCurrentUser = member.id === userId;
                    return (
                      <div
                        key={member.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                            {(member.name || member.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {member.name || 'Unnamed User'}
                              </span>
                              {member.title && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  {member.title}
                                </span>
                              )}
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {member.email || 'No email provided'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(member)}
                            disabled={removingUserId === member.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                            title="Remove user from organization"
                          >
                            {removingUserId === member.id ? (
                              <Loader2 className="animate-spin" size={15} />
                            ) : (
                              <>
                                <Trash2 size={15} />
                                Remove
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Organization Default NDA Workflow Settings */}
            <div className="glass p-8 rounded-3xl shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Default NDA Workflow Preferences</h2>
                  <p className="text-xs text-slate-400">
                    Pre-filled on new listings. You can override any of these per listing.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:bg-slate-500/5 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    checked={ndaDefaults.default_nda_approval_required}
                    onChange={(e) => setNdaDefaults((prev) => ({ ...prev, default_nda_approval_required: e.target.checked }))}
                  />
                  <div>
                    <div className="font-semibold text-sm">Require seller approval before sending NDA</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      When enabled, buyers submit an NDA request first and your deal team approves before they can view or sign the NDA.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:bg-slate-500/5 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    checked={ndaDefaults.default_nda_countersign_required}
                    onChange={(e) => setNdaDefaults((prev) => ({ ...prev, default_nda_countersign_required: e.target.checked }))}
                  />
                  <div>
                    <div className="font-semibold text-sm">Require seller countersignature (Recommended)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      After the buyer signs, a member of your deal team must countersign before the NDA is marked Executed.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:bg-slate-500/5 transition-colors">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    checked={ndaDefaults.default_auto_release_cim_on_nda}
                    onChange={(e) => setNdaDefaults((prev) => ({ ...prev, default_auto_release_cim_on_nda: e.target.checked }))}
                  />
                  <div>
                    <div className="font-semibold text-sm">Automatically release CIM once NDA is executed</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Independent of countersignature. When off, you manually grant CIM access after the NDA is executed.
                    </div>
                  </div>
                </label>
              </div>

              {ndaDefaultsMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 size={16} />
                  <span>{ndaDefaultsMsg}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNdaDefaults}
                  disabled={savingNdaDefaults}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-bold cursor-pointer"
                >
                  {savingNdaDefaults ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Default Preferences
                </button>
              </div>
            </div>

            {/* Upload NDA Template */}
            <div className="glass p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Upload NDA Template</h2>
                  <p className="text-xs text-slate-400">
                    Upload PDF NDA templates for your organization. Every listing requires a template or custom NDA before buyers can request access.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadTemplate} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="field-group">
                    <label className="form-label mb-2 block">Template Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Standard One-Way NDA"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label className="form-label mb-2 block">NDA PDF File</label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="form-input py-2"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setNewTemplateFile(f);
                        if (f && !newTemplateName) {
                          setNewTemplateName(f.name.replace(/\.pdf$/i, ''));
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                    checked={newTemplateDefault}
                    onChange={(e) => setNewTemplateDefault(e.target.checked)}
                  />
                  Set as organization default template
                </label>

                {templateError && (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{templateError}</span>
                  </div>
                )}

                {templateSuccess && (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                    <span>{templateSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploadingTemplate || !newTemplateFile || !newTemplateName.trim()}
                    className="btn-primary flex items-center gap-2 px-6 py-3 font-bold cursor-pointer disabled:opacity-50"
                  >
                    {uploadingTemplate ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    Upload Template
                  </button>
                </div>
              </form>
            </div>

            {/* Saved NDA Templates */}
            <div className="glass p-8 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Saved NDA Templates</h2>
                  <p className="text-xs text-slate-400">
                    {ndaTemplates.length} {ndaTemplates.length === 1 ? 'template' : 'templates'} available for your listings
                  </p>
                </div>
              </div>

              {ndaTemplates.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FileSignature className="mx-auto mb-3 text-slate-500" size={36} />
                  <p className="font-medium">No NDA templates uploaded yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Upload at least one PDF template above to enable NDA requests on your listings.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {ndaTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{tpl.name}</span>
                          {tpl.is_default && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Star size={11} className="fill-amber-400" /> Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 truncate">
                          {tpl.file_name} · SHA-256: {tpl.file_sha256?.slice(0, 12)}…
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewTemplate(tpl.file_path)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-500/10 border border-slate-700/60 transition-colors cursor-pointer"
                        >
                          <Eye size={14} /> View PDF
                        </button>
                        {!tpl.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultTemplate(tpl.id)}
                            disabled={templateActionId === tpl.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Star size={14} /> Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleArchiveTemplate(tpl)}
                          disabled={templateActionId === tpl.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {templateActionId === tpl.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
