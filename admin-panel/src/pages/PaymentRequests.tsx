import { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import {
  getPaymentRequests,
  updatePaymentRequestStatus,
  type PaymentRequest,
} from '../services/paymentService';
import { X, ChevronDown } from 'lucide-react';

const PaymentRequests = () => {
  const limit = 50;
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('APPROVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const handleRowClick = (req: PaymentRequest) => {
    setSelectedRequest(req);
    setNewStatus(req.status);
    setAdminNotes(req.admin_notes || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;
    setUpdating(true);
    const result = await updatePaymentRequestStatus(selectedRequest.id, newStatus, adminNotes);
    if (result.success) {
      fetchRequests();
      handleCloseModal();
    } else {
      alert(result.message);
    }
    setUpdating(false);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setOffset(0);
    setIsFilterDropdownOpen(false);
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    const result = await getPaymentRequests(filter, limit, offset);
    if (result.success && result.data) {
      setRequests(result.data);
      setTotal(result.total || 0);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, offset]);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#f59e0b'; // yellow
      case 'REJECTED':
        return '#ef4444'; // red
      default:
        return '#10b981'; // green
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: COLORS.white,
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ color: '#3b2c85', fontSize: '1.25rem', margin: 0 }}>Requests</h2>

        <div style={{ position: 'relative', minWidth: '180px' }}>
          <div
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 16px',
              borderRadius: '8px',
              border: isFilterDropdownOpen ? '1px solid #3b2c85' : `1px solid #cbd5e1`,
              backgroundColor: '#ffffff',
              fontSize: '0.875rem',
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'border-color 0.2s',
              userSelect: 'none',
            }}
          >
            <span style={{ fontWeight: 500 }}>
              {filter === 'ALL' ? 'All Requests' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </span>
            <ChevronDown
              size={18}
              color="#64748b"
              style={{
                transform: isFilterDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </div>

          {isFilterDropdownOpen && (
            <>
              <div
                onClick={() => setIsFilterDropdownOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '100%',
                  marginTop: '8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                  zIndex: 20,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                {[
                  { value: 'ALL', label: 'All Requests' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '0.875rem',
                      color: filter === option.value ? '#3b2c85' : '#334155',
                      cursor: 'pointer',
                      backgroundColor: filter === option.value ? '#f1f5f9' : 'transparent',
                      fontWeight: filter === option.value ? 600 : 400,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseOver={(e) => {
                      if (filter !== option.value)
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseOut={(e) => {
                      if (filter !== option.value)
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: COLORS.background,
                color: COLORS.textLight,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <th style={{ padding: '16px', fontWeight: 500 }}>User</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Payment</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>UPI ID</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Created At</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Processed At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  Loading requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  No requests found.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr
                  key={req.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => handleRowClick(req)}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '16px' }}>
                    <div>{req.user_name}</div>
                    <div style={{ fontSize: '0.875rem', color: COLORS.textLight }}>
                      {req.user_email}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>₹{req.payment}</td>
                  <td style={{ padding: '16px' }}>{req.upi_id}</td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: `${getStatusColor(req.status)}20`,
                        color: getStatusColor(req.status),
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: COLORS.textLight }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px', color: COLORS.textLight }}>
                    {req.processed_at ? new Date(req.processed_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: COLORS.white,
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ color: COLORS.textLight, fontSize: '0.875rem' }}>
          Showing <strong>{requests.length > 0 ? offset + 1 : 0}</strong> to{' '}
          <strong>{Math.min(offset + limit, total)}</strong> of <strong>{total}</strong> requests
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: `1px solid ${COLORS.textLight}`,
              backgroundColor: offset === 0 || loading ? '#f3f4f6' : COLORS.white,
              color: COLORS.textDark,
              cursor: offset === 0 || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Previous
          </button>
          <button
            disabled={offset + limit >= total || loading}
            onClick={() => setOffset(offset + limit)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: `1px solid ${COLORS.textLight}`,
              backgroundColor: offset + limit >= total || loading ? '#f3f4f6' : COLORS.white,
              color: COLORS.textDark,
              cursor: offset + limit >= total || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {isModalOpen && selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#3b2c85' }}>
                Review Request
              </h3>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    User
                  </span>
                  <div style={{ fontWeight: 500, color: '#0f172a', wordBreak: 'break-word' }}>
                    {selectedRequest.user_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>
                    {selectedRequest.user_email}
                  </div>
                </div>
                <div style={{ flex: '1 1 100px', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Amount
                  </span>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>
                    ₹{selectedRequest.payment}
                  </div>
                </div>
                <div style={{ flex: '1 1 100%', minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#64748b',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    UPI ID
                  </span>
                  <div
                    style={{
                      fontWeight: 500,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {selectedRequest.upi_id}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                Status
              </label>

              <div
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isStatusDropdownOpen ? '1px solid #3b2c85' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'border-color 0.2s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontWeight: 500 }}>{newStatus}</span>
                <ChevronDown
                  size={18}
                  color="#64748b"
                  style={{
                    transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>

              {isStatusDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsStatusDropdownOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow:
                        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      border: '1px solid #e2e8f0',
                      zIndex: 20,
                      overflow: 'hidden',
                    }}
                  >
                    {['PENDING', 'APPROVED', 'REJECTED'].map((option) => (
                      <div
                        key={option}
                        onClick={() => {
                          setNewStatus(option);
                          setIsStatusDropdownOpen(false);
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: '0.875rem',
                          color: newStatus === option ? '#3b2c85' : '#334155',
                          cursor: 'pointer',
                          backgroundColor: newStatus === option ? '#f1f5f9' : 'transparent',
                          fontWeight: newStatus === option ? 600 : 400,
                          transition: 'background-color 0.15s',
                        }}
                        onMouseOver={(e) => {
                          if (newStatus !== option)
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseOut={(e) => {
                          if (newStatus !== option)
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Paid via UPI UTR: 123456789012"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  minHeight: '80px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3b2c85')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '8px',
              }}
            >
              <button
                onClick={handleCloseModal}
                disabled={updating}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3b2c85',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: updating ? 0.7 : 1,
                }}
                onMouseOver={(e) =>
                  !updating && (e.currentTarget.style.backgroundColor = '#2a1f63')
                }
                onMouseOut={(e) => !updating && (e.currentTarget.style.backgroundColor = '#3b2c85')}
              >
                {updating ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRequests;
