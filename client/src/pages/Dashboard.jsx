import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Mail,
    MessageSquare,
    UserCheck,
    Activity,
    ArrowRight,
    Clock,
    Zap,
    TrendingUp
} from 'lucide-react';
import { logsAPI, settingsAPI, authAPI } from '../services/api';

function Dashboard() {
    const [stats, setStats] = useState({
        total: 0,
        last24Hours: 0,
        byIntent: {}
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [settings, setSettings] = useState({});
    const [gmailStatus, setGmailStatus] = useState({ connected: false, email: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsRes, logsRes, settingsRes, authRes] = await Promise.all([
                logsAPI.getStats(),
                logsAPI.getAll(1, 5),
                settingsAPI.getAll(),
                authAPI.getStatus()
            ]);

            setStats(statsRes.data);
            setRecentLogs(logsRes.data.logs);
            setSettings(settingsRes.data);
            setGmailStatus(authRes.data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIntentBadgeClass = (intent) => {
        const classes = {
            'LEAD': 'lead',
            'INQUIRY': 'info',
            'SUPPORT': 'warning',
            'SPAM': 'error',
            'OTHER': 'warning'
        };
        return classes[intent] || 'info';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Monitor your automation pipeline at a glance</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">
                        <Mail size={24} />
                    </div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Emails Processed</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <UserCheck size={24} />
                    </div>
                    <div className="stat-value">{stats.byIntent?.LEAD || 0}</div>
                    <div className="stat-label">Leads Captured</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon pink">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-value">{stats.byIntent?.LEAD || 0}</div>
                    <div className="stat-label">Messages Sent</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon cyan">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-value">{stats.last24Hours}</div>
                    <div className="stat-label">Last 24 Hours</div>
                </div>
            </div>

            <div className="grid-2">
                {/* Status Card */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">System Status</h3>
                            <p className="card-description">Current automation state</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="connection-status" style={{ background: settings.automation_enabled === 'true' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-glass)' }}>
                            <div className="connection-icon" style={{ background: 'var(--gradient-primary)', borderRadius: '10px' }}>
                                <Zap size={20} style={{ color: 'white' }} />
                            </div>
                            <div className="connection-details">
                                <div className="connection-title">Automation Engine</div>
                                <div className="connection-email">
                                    {settings.automation_enabled === 'true' ? 'Running every ' + (settings.check_interval_seconds || 60) + 's' : 'Currently paused'}
                                </div>
                            </div>
                            <span className={`status-badge ${settings.automation_enabled === 'true' ? 'success' : 'warning'}`}>
                                <span className="status-dot"></span>
                                {settings.automation_enabled === 'true' ? 'Active' : 'Paused'}
                            </span>
                        </div>

                        <div className={`connection-status ${gmailStatus.connected ? 'connected' : ''}`}>
                            <div className="connection-icon gmail">
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path fill="#EA4335" d="M1.637 5.757L12 12.879l10.363-7.122L12 1.637z" />
                                    <path fill="#4285F4" d="M22.363 5.757V18.12c0 1.26-1.02 2.28-2.28 2.28H3.917c-1.26 0-2.28-1.02-2.28-2.28V5.757l10.363 7.122z" />
                                    <path fill="#34A853" d="M1.637 5.757l10.363 7.122 10.363-7.122" />
                                    <path fill="#FBBC05" d="M1.637 5.757c0-.627.255-1.195.667-1.605L12 12.879z" />
                                </svg>
                            </div>
                            <div className="connection-details">
                                <div className="connection-title">Gmail</div>
                                <div className="connection-email">
                                    {gmailStatus.email || 'Not connected'}
                                </div>
                            </div>
                            <span className={`status-badge ${gmailStatus.connected ? 'success' : 'error'}`}>
                                <span className="status-dot"></span>
                                {gmailStatus.connected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Quick Actions</h3>
                            <p className="card-description">Manage your automation</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/configuration" className="btn btn-primary" style={{ justifyContent: 'space-between' }}>
                            <span>Configure API Keys</span>
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/logs" className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                            <span>View All Activity</span>
                            <ArrowRight size={18} />
                        </Link>
                        {!gmailStatus.connected && (
                            <Link to="/configuration" className="btn btn-google" style={{ justifyContent: 'space-between' }}>
                                <span>Connect Gmail</span>
                                <ArrowRight size={18} />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <div>
                        <h3 className="card-title">Recent Activity</h3>
                        <p className="card-description">Latest processed emails</p>
                    </div>
                    <Link to="/logs" className="btn btn-sm btn-secondary">
                        View All
                    </Link>
                </div>

                {recentLogs.length > 0 ? (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>From</th>
                                    <th>Subject</th>
                                    <th>Intent</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.emailFrom}
                                        </td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.emailSubject}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${getIntentBadgeClass(log.detectedIntent)}`}>
                                                {log.detectedIntent}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)' }}>
                                                <Clock size={14} />
                                                {formatDate(log.createdAt)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${log.status === 'sent' ? 'success' : log.status === 'error' ? 'error' : 'info'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <Activity size={48} />
                        <h3>No activity yet</h3>
                        <p>Processed emails will appear here once the automation starts</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
