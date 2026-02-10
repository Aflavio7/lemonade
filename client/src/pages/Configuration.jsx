import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Key,
    Link2,
    MessageSquare,
    Save,
    CheckCircle,
    XCircle,
    AlertCircle,
    ExternalLink,
    Unlink
} from 'lucide-react';
import { settingsAPI, authAPI } from '../services/api';

function Configuration() {
    const [searchParams] = useSearchParams();
    const [settings, setSettings] = useState({
        mail_provider: 'gmail',
        gemini_api_key: '',
        twilio_account_sid: '',
        twilio_auth_token: '',
        whatsapp_phone_number: '',
        booking_url: '',
        check_interval_seconds: '60',
        imap_host: '',
        imap_port: '993',
        imap_user: '',
        imap_pass: '',
        imap_secure: 'true',
        smtp_host: '',
        smtp_port: '465',
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: 'true'
    });
    const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        loadSettings();

        // Check for OAuth callback status
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'gmail_connected') {
            showToast('Gmail connected successfully!', 'success');
        } else if (error) {
            showToast('Failed to connect Gmail. Please try again.', 'error');
        }
    }, [searchParams]);

    const loadSettings = async () => {
        try {
            const [settingsRes, authRes] = await Promise.all([
                settingsAPI.getAll(),
                authAPI.getStatus()
            ]);

            setSettings(prev => ({
                ...prev,
                mail_provider: settingsRes.data.mail_provider || 'gmail',
                gemini_api_key: settingsRes.data.gemini_api_key || '',
                twilio_account_sid: settingsRes.data.twilio_account_sid || '',
                twilio_auth_token: settingsRes.data.twilio_auth_token || '',
                whatsapp_phone_number: settingsRes.data.whatsapp_phone_number || '',
                booking_url: settingsRes.data.booking_url || '',
                check_interval_seconds: settingsRes.data.check_interval_seconds || '60',
                imap_host: settingsRes.data.imap_host || '',
                imap_port: settingsRes.data.imap_port || '993',
                imap_user: settingsRes.data.imap_user || '',
                imap_pass: settingsRes.data.imap_pass || '',
                imap_secure: settingsRes.data.imap_secure || 'true',
                smtp_host: settingsRes.data.smtp_host || '',
                smtp_port: settingsRes.data.smtp_port || '465',
                smtp_user: settingsRes.data.smtp_user || '',
                smtp_pass: settingsRes.data.smtp_pass || '',
                smtp_secure: settingsRes.data.smtp_secure || 'true'
            }));
            setGmailStatus(authRes.data);
        } catch (error) {
            console.error('Failed to load settings:', error);
            showToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsAPI.update(settings);
            showToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const connectGmail = async () => {
        try {
            const res = await authAPI.getGoogleAuthUrl();
            window.location.href = res.data.authUrl;
        } catch (error) {
            console.error('Failed to get auth URL:', error);
            showToast('Failed to initiate Google authentication', 'error');
        }
    };

    const disconnectGmail = async () => {
        try {
            await authAPI.disconnect();
            setGmailStatus({ connected: false, email: null });
            showToast('Gmail disconnected', 'success');
        } catch (error) {
            console.error('Failed to disconnect:', error);
            showToast('Failed to disconnect Gmail', 'error');
        }
    };

    const [testingImap, setTestingImap] = useState(false);

    const handleTestImap = async () => {
        if (!settings.imap_host || !settings.imap_user || !settings.imap_pass) {
            showToast('Please fill in all IMAP fields before testing', 'error');
            return;
        }

        setTestingImap(true);
        try {
            const res = await settingsAPI.testImap({
                imap_host: settings.imap_host,
                imap_port: settings.imap_port,
                imap_user: settings.imap_user,
                imap_pass: settings.imap_pass,
                imap_secure: settings.imap_secure
            });
            showToast(res.data.message || 'IMAP Connection successful!', 'success');
        } catch (error) {
            console.error('IMAP Test failed:', error);
            const detail = error.response?.data?.details || error.message;
            showToast(`Connection failed: ${detail}`, 'error');
        } finally {
            setTestingImap(false);
        }
    };

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const maskValue = (value) => {
        if (!value || value.length < 8) return value;
        return value.substring(0, 4) + '•'.repeat(value.length - 8) + value.substring(value.length - 4);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Configuration</h1>
                <p>Manage your API keys and integrations</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Email Provider</h3>
                        <p className="card-description">Choose how you want to connect to your email inbox</p>
                    </div>
                </div>
                <div className="provider-toggle">
                    <button
                        className={`provider-btn ${settings.mail_provider === 'gmail' ? 'active' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, mail_provider: 'gmail' }))}
                    >
                        Gmail (OAuth)
                    </button>
                    <button
                        className={`provider-btn ${settings.mail_provider === 'custom' ? 'active' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, mail_provider: 'custom' }))}
                    >
                        Custom (IMAP/SMTP)
                    </button>
                </div>
            </div>

            <div className="grid-2">
                {/* Provider Specific Settings */}
                {settings.mail_provider === 'gmail' ? (
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Gmail Integration</h3>
                                <p className="card-description">Connect your Gmail account for email monitoring</p>
                            </div>
                        </div>

                        <div className={`connection-status ${gmailStatus.connected ? 'connected' : ''}`} style={{ marginBottom: '1rem' }}>
                            <div className="connection-icon gmail">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#EA4335" d="M1.637 5.757L12 12.879l10.363-7.122L12 1.637z" />
                                    <path fill="#4285F4" d="M22.363 5.757V18.12c0 1.26-1.02 2.28-2.28 2.28H3.917c-1.26 0-2.28-1.02-2.28-2.28V5.757l10.363 7.122z" />
                                    <path fill="#34A853" d="M1.637 5.757l10.363 7.122 10.363-7.122" />
                                    <path fill="#FBBC05" d="M1.637 5.757c0-.627.255-1.195.667-1.605L12 12.879z" />
                                </svg>
                            </div>
                            <div className="connection-details">
                                <div className="connection-title">
                                    {gmailStatus.connected ? 'Connected' : 'Not Connected'}
                                </div>
                                <div className="connection-email">
                                    {gmailStatus.email || 'Click below to connect your Gmail account'}
                                </div>
                            </div>
                            {gmailStatus.connected && (
                                <CheckCircle size={24} style={{ color: 'var(--accent-green)' }} />
                            )}
                        </div>

                        {gmailStatus.connected ? (
                            <button onClick={disconnectGmail} className="btn btn-danger" style={{ width: '100%' }}>
                                <Unlink size={18} />
                                Disconnect Gmail
                            </button>
                        ) : (
                            <button onClick={connectGmail} className="btn btn-google" style={{ width: '100%' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Connect with Google
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Custom Email (IMAP)</h3>
                                <p className="card-description">Configure your IMAP settings for monitoring</p>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">IMAP Host</label>
                                <input type="text" name="imap_host" value={settings.imap_host} onChange={handleChange} className="form-input" placeholder="imap.example.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">IMAP Port</label>
                                <input type="text" name="imap_port" value={settings.imap_port} onChange={handleChange} className="form-input" placeholder="993" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">IMAP User</label>
                                <input type="text" name="imap_user" value={settings.imap_user} onChange={handleChange} className="form-input" placeholder="user@example.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">IMAP Password</label>
                                <input type="password" name="imap_pass" value={settings.imap_pass} onChange={handleChange} className="form-input" placeholder="password" />
                            </div>
                        </div>
                        <div className="form-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label className="checkbox-label" style={{ marginBottom: 0 }}>
                                <input type="checkbox" name="imap_secure" checked={settings.imap_secure === 'true'} onChange={e => handleChange({ target: { name: 'imap_secure', type: 'checkbox', checked: e.target.checked } })} />
                                Use Secure Connection (SSL/TLS)
                            </label>
                            <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={handleTestImap}
                                disabled={testingImap}
                                style={{ marginLeft: 'auto' }}
                            >
                                {testingImap ? 'Testing...' : 'Test Connection'}
                            </button>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }} />
                        <h3 className="card-sub-title" style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>SMTP Settings (for sending emails)</h3>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">SMTP Host</label>
                                <input type="text" name="smtp_host" value={settings.smtp_host} onChange={handleChange} className="form-input" placeholder="smtp.example.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">SMTP Port</label>
                                <input type="text" name="smtp_port" value={settings.smtp_port} onChange={handleChange} className="form-input" placeholder="465" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking Link */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">General Settings</h3>
                            <p className="card-description">Common system configurations</p>
                        </div>
                        <Link2 size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Booking URL</label>
                        <input
                            type="url"
                            name="booking_url"
                            value={settings.booking_url}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="https://calendly.com/your-link"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Check Interval (seconds)</label>
                        <input
                            type="number"
                            name="check_interval_seconds"
                            value={settings.check_interval_seconds}
                            onChange={handleChange}
                            className="form-input"
                            min="30"
                            max="3600"
                        />
                    </div>
                </div>
            </div>

            {/* API Keys Section */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Service Credentials</h3>
                        <p className="card-description">Configure your AI and Messaging credentials</p>
                    </div>
                    <Key size={20} style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Gemini API Key</label>
                        <input
                            type="password"
                            name="gemini_api_key"
                            value={settings.gemini_api_key}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Twilio Account SID</label>
                        <input
                            type="password"
                            name="twilio_account_sid"
                            value={settings.twilio_account_sid}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Twilio Auth Token</label>
                        <input
                            type="password"
                            name="twilio_auth_token"
                            value={settings.twilio_auth_token}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">WhatsApp Phone Number</label>
                        <input
                            type="text"
                            name="whatsapp_phone_number"
                            value={settings.whatsapp_phone_number}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save All Settings
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>
                        <div className="toast-icon">
                            {toast.type === 'success' ? (
                                <CheckCircle size={20} style={{ color: 'var(--accent-green)' }} />
                            ) : (
                                <XCircle size={20} style={{ color: 'var(--accent-red)' }} />
                            )}
                        </div>
                        <div className="toast-message">{toast.message}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Configuration;
