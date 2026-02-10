import { useState, useEffect } from 'react';
import {
    FileText,
    Clock,
    ChevronLeft,
    ChevronRight,
    Trash2,
    RefreshCw,
    Filter,
    Eye,
    X
} from 'lucide-react';
import { logsAPI } from '../services/api';

function Logs() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [intentFilter, setIntentFilter] = useState('all');

    useEffect(() => {
        loadLogs();
    }, [pagination.page]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await logsAPI.getAll(pagination.page, pagination.limit);
            setLogs(res.data.logs);
            setPagination(prev => ({
                ...prev,
                total: res.data.pagination.total,
                totalPages: res.data.pagination.totalPages
            }));
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
            return;
        }

        try {
            await logsAPI.clear();
            setLogs([]);
            setPagination(prev => ({ ...prev, total: 0, totalPages: 0, page: 1 }));
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    };

    const getIntentBadgeClass = (intent) => {
        const classes = {
            'LEAD': 'lead',
            'INQUIRY': 'info',
            'SUPPORT': 'warning',
            'SPAM': 'error',
            'ERROR': 'error',
            'OTHER': 'warning'
        };
        return classes[intent] || 'info';
    };

    const getStatusBadgeClass = (status) => {
        const classes = {
            'sent': 'success',
            'success': 'success',
            'processed': 'info',
            'skipped': 'warning',
            'error': 'error',
            'pending_config': 'warning',
            'no_phone': 'warning'
        };
        return classes[status] || 'info';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const filteredLogs = intentFilter === 'all'
        ? logs
        : logs.filter(log => log.detectedIntent === intentFilter);

    const intents = ['all', 'LEAD', 'INQUIRY', 'SUPPORT', 'SPAM', 'OTHER'];

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Activity Logs</h1>
                    <p>History of all processed emails and automated responses</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={loadLogs} className="btn btn-secondary btn-sm" disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Refresh
                    </button>
                    <button onClick={clearLogs} className="btn btn-danger btn-sm" disabled={logs.length === 0}>
                        <Trash2 size={16} />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Filter by intent:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {intents.map(intent => (
                            <button
                                key={intent}
                                onClick={() => setIntentFilter(intent)}
                                className={`btn btn-sm ${intentFilter === intent ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                            >
                                {intent === 'all' ? 'All' : intent}
                            </button>
                        ))}
                    </div>
                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {pagination.total} total records
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                {filteredLogs.length > 0 ? (
                    <>
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>From</th>
                                        <th>Subject</th>
                                        <th>Intent</th>
                                        <th>Message Sent</th>
                                        <th>Status</th>
                                        <th>Time</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.emailFrom}
                                            </td>
                                            <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.emailSubject}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getIntentBadgeClass(log.detectedIntent)}`}>
                                                    {log.detectedIntent}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.messageSent || '-'}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                                    <Clock size={14} />
                                                    {formatDate(log.createdAt)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ padding: '0.375rem 0.5rem' }}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page <= 1}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        className={`pagination-btn ${pagination.page === pageNum ? 'active' : ''}`}
                                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                className="pagination-btn"
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.totalPages}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>No logs yet</h3>
                        <p>Activity logs will appear here once emails are processed</p>
                    </div>
                )}
            </div>

            {/* Log Detail Modal */}
            {selectedLog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '2rem'
                    }}
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="card animate-fade-in"
                        style={{
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">Log Details</h3>
                                <p className="card-description">{formatDate(selectedLog.createdAt)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.5rem' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="form-label">From</label>
                                <p style={{ color: 'var(--text-primary)' }}>{selectedLog.emailFrom}</p>
                            </div>

                            <div>
                                <label className="form-label">Subject</label>
                                <p style={{ color: 'var(--text-primary)' }}>{selectedLog.emailSubject}</p>
                            </div>

                            <div>
                                <label className="form-label">Email Body</label>
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                    maxHeight: '150px',
                                    overflow: 'auto'
                                }}>
                                    {selectedLog.emailBody || 'No body content'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Detected Intent</label>
                                    <span className={`status-badge ${getIntentBadgeClass(selectedLog.detectedIntent)}`}>
                                        {selectedLog.detectedIntent}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Status</label>
                                    <span className={`status-badge ${getStatusBadgeClass(selectedLog.status)}`}>
                                        {selectedLog.status}
                                    </span>
                                </div>
                            </div>

                            {selectedLog.messageSent && (
                                <div>
                                    <label className="form-label">Message Sent</label>
                                    <div style={{
                                        background: 'rgba(16, 185, 129, 0.05)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {selectedLog.messageSent}
                                    </div>
                                    {selectedLog.sentTo && (
                                        <p className="form-hint">Sent to: {selectedLog.sentTo}</p>
                                    )}
                                </div>
                            )}

                            {selectedLog.intentDetails && (
                                <div>
                                    <label className="form-label">AI Analysis Details</label>
                                    <div style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        fontFamily: 'monospace',
                                        overflow: 'auto'
                                    }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {JSON.stringify(JSON.parse(selectedLog.intentDetails || '{}'), null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default Logs;
