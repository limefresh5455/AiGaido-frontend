import { useState, useEffect } from 'react';
import { COLORS } from '../constants';
import { getReferralActivities, type ReferralActivity } from '../services/referralActivityService';

const ReferralActivities = () => {
  const limit = 50;
  const [activities, setActivities] = useState<ReferralActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    const result = await getReferralActivities(limit, offset);
    if (result.success && result.data) {
      setActivities(result.data);
      setTotal(result.total || 0);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <th style={{ padding: '16px', fontWeight: 500 }}>Referral Code</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Total Referrals</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Paid Referrals</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Total Earned</th>
              <th style={{ padding: '16px', fontWeight: 500 }}>Wallet Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  Loading activities...
                </td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                  No referral activities found.
                </td>
              </tr>
            ) : (
              activities.map((activity, index) => (
                <tr
                  key={index}
                  style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 500, color: COLORS.textDark }}>
                      {activity.user_name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: COLORS.textLight }}>
                      {activity.user_email}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span
                      style={{
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        color: COLORS.textDark,
                      }}
                    >
                      {activity.referral_code}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500, color: COLORS.textDark }}>
                    {activity.referral_count}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 500, color: COLORS.textDark }}>
                    {activity.paid_referral_count}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#10b981' }}>
                    ₹{activity.referral_bonus_payment_get}
                  </td>
                  <td style={{ padding: '16px', fontWeight: 600, color: '#3b2c85' }}>
                    ₹{activity.wallet_balance}
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
          Showing <strong>{activities.length > 0 ? offset + 1 : 0}</strong> to{' '}
          <strong>{Math.min(offset + limit, total)}</strong> of <strong>{total}</strong> users
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
    </div>
  );
};

export default ReferralActivities;
