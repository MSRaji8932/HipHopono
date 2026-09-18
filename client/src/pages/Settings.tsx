import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

export default function Settings() {
  const { settings, updateSettings, refreshSettings } = useSettings();
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [providerLabel, setProviderLabel] = useState('');
  const [modelName, setModelName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiFormat, setApiFormat] = useState<'openai' | 'anthropic' | 'other'>('openai');
  const [apiToken, setApiToken] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [autoApproveReads, setAutoApproveReads] = useState(true);
  const [autoApproveWrites, setAutoApproveWrites] = useState(false);
  const [autoApproveCommands, setAutoApproveCommands] = useState(false);
  const [commandTimeoutMs, setCommandTimeoutMs] = useState(30000);
  const [useQueryAuth, setUseQueryAuth] = useState(false);

  // Sync state when settings load from server
  useEffect(() => {
    if (settings) {
      setProviderLabel(settings.providerLabel || '');
      setModelName(settings.modelName || '');
      setApiBaseUrl(settings.apiBaseUrl || '');
      setApiFormat(settings.apiFormat || 'openai');
      setTemperature(settings.temperature || 0.2);
      setMaxTokens(settings.maxTokens || 8192);
      setSystemPrompt(settings.systemPrompt || '');
      setAutoApproveReads(settings.autoApproveReads ?? true);
      setAutoApproveWrites(settings.autoApproveWrites ?? false);
      setAutoApproveCommands(settings.autoApproveCommands ?? false);
      setCommandTimeoutMs(settings.commandTimeoutMs || 30000);
      setUseQueryAuth(settings.customHeaders?.['X-Auth-As-Query'] === 'true');
    }
  }, [settings]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings({
        providerLabel,
        modelName,
        apiBaseUrl,
        apiFormat,
        temperature,
        maxTokens,
        systemPrompt,
        autoApproveReads,
        autoApproveWrites,
        autoApproveCommands,
        commandTimeoutMs,
        customHeaders: useQueryAuth ? { 'X-Auth-As-Query': 'true' } : {},
      });
      if (apiToken) {
        await api.settings.update({ apiToken });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save all current form values first, then test
      await updateSettings({
        providerLabel,
        modelName,
        apiBaseUrl,
        apiFormat,
        temperature,
        maxTokens,
        systemPrompt,
        autoApproveReads,
        autoApproveWrites,
        autoApproveCommands,
        commandTimeoutMs,
        customHeaders: useQueryAuth ? { 'X-Auth-As-Query': 'true' } : {},
      });
      if (apiToken) {
        await api.settings.update({ apiToken });
      }
      const result = await api.settings.testConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({ ok: false, error: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      alert('Password changed successfully');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleReset = async () => {
    if (!confirm('RESET EVERYTHING?\n\nThis will delete ALL data:\n- All chats & messages\n- All projects\n- All settings\n- Your password\n\nA new admin password will be generated.\n\nThis CANNOT be undone.')) return;
    setResetting(true);
    try {
      const result = await api.settings.reset() as { username: string; password: string };
      alert(
        `RESET COMPLETE\n\n` +
        `New Credentials:\n` +
        `Username: ${result.username}\n` +
        `Password: ${result.password}\n\n` +
        `Credentials saved to: database/RESET_CREDENTIALS_*.txt\n\n` +
        `You will be redirected to login.`
      );
      // Clear all local state and redirect
      window.location.href = '/login';
    } catch (err) {
      // Even if request fails (session invalid), redirect to login
      window.location.href = '/login';
    }
  };

  return (
    <div className="h-screen overflow-y-auto bg-bg">
      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-bright">Settings</h1>
          <button
            onClick={() => navigate('/workspace')}
            className="text-text-muted hover:text-text text-sm"
          >
            Back to workspace
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium text-text mb-4">Model / Provider</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Provider Label</label>
                  <input
                    type="text"
                    value={providerLabel}
                    onChange={(e) => setProviderLabel(e.target.value)}
                    placeholder="OpenAI"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">API Format</label>
                  <select
                    value={apiFormat}
                    onChange={(e) => setApiFormat(e.target.value as 'openai' | 'anthropic' | 'other')}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="other">Other (Custom)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Model Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">API Base URL</label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">
                  API Token
                  {settings?.apiTokenSet && (
                    <span className="ml-2 text-success text-xs">
                      (Set: {settings.apiTokenPreview})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder={settings?.apiTokenSet ? 'Enter new token to replace...' : 'Enter API token...'}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useQueryAuth"
                  checked={useQueryAuth}
                  onChange={(e) => setUseQueryAuth(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useQueryAuth" className="text-sm text-text-muted">
                  Send API key as query parameter (?api_key=...) instead of Authorization header
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors text-sm disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              {testResult && (
                <div className={`text-sm ${testResult.ok ? 'text-success' : 'text-danger'}`}>
                  {testResult.ok ? 'Connection successful!' : `Failed: ${testResult.error}`}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-text mb-4">Agent Behavior</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-muted mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm font-mono resize-y"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={autoApproveReads}
                    onChange={(e) => setAutoApproveReads(e.target.checked)}
                    className="rounded"
                  />
                  Auto-approve reads
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={autoApproveWrites}
                    onChange={(e) => setAutoApproveWrites(e.target.checked)}
                    className="rounded"
                  />
                  Auto-approve writes
                </label>
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={autoApproveCommands}
                    onChange={(e) => setAutoApproveCommands(e.target.checked)}
                    className="rounded"
                  />
                  Auto-approve commands
                </label>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Command Timeout (ms)</label>
                <input
                  type="number"
                  value={commandTimeoutMs}
                  onChange={(e) => setCommandTimeoutMs(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-text mb-4">Account</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-text focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword}
                className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors text-sm disabled:opacity-50"
              >
                Change Password
              </button>
            </div>
          </section>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-bg font-medium rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-6 py-2 bg-danger/20 hover:bg-danger/30 text-danger rounded transition-colors text-sm disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Reset Full'}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors text-sm"
            >
              Logout
            </button>
          </div>

          {error && <div className="text-danger text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}
