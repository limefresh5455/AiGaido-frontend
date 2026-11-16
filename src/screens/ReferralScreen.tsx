import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Clipboard,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { referralService, ReferralItem, WithdrawalItem } from '../services/referralService';

type ReferralScreenProps = {
  navigation: any;
};

export default function ReferralScreen({ navigation }: ReferralScreenProps) {
  const [copied, setCopied] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['myReferrals'],
    queryFn: referralService.getMyReferrals,
  });

  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

  const { data: withdrawalData, isLoading: isWithdrawalLoading, refetch: refetchWithdrawals } = useQuery({
    queryKey: ['myWithdrawals'],
    queryFn: referralService.getWithdrawals,
  });
  
  const totalWithdrawals = withdrawalData?.total ?? 0;
  const withdrawalsList: WithdrawalItem[] = withdrawalData?.data ?? [];

  const referralCode = data?.referral_code ?? '—';
  const playStoreLink = 'https://play.google.com/store/apps/details?id=com.geomap.ai';
  const referralLink = 'play.google.com/store/apps/details?id=com.geomap.ai';
  const totalReferrals = data?.total_referrals ?? 0;
  const totalCommission = data?.total_commission_earned_inr ?? 0;
  const walletBalance = data?.wallet_balance_inr ?? 0;
  const referrals: ReferralItem[] = data?.referrals ?? [];

  const handleCopy = () => {
    Clipboard.setString(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join AiGaido and explore the world!\n\nDownload AiGaido from Play Store:\n${playStoreLink}\n\nUse my Referral Code during signup: ${referralCode}`,
        url: playStoreLink,
        title: 'Join AiGaido',
      });
    } catch (_) {}
  };

  const handleSubmitWithdrawal = async () => {
    const amount = parseInt(withdrawAmount, 10);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹100.');
      return;
    }
    if (amount > walletBalance) {
      Alert.alert('Error', 'Insufficient wallet balance.');
      return;
    }

    if (!upiId) {
      Alert.alert('Error', 'Please enter a valid UPI ID.');
      return;
    }

    try {
      setIsWithdrawing(true);
      await referralService.withdrawFunds({
        payment: amount,
        upi_id: upiId,
      });
      Alert.alert('Success', 'Withdrawal request submitted successfully.');
      setIsWithdrawModalVisible(false);
      setWithdrawAmount('');
      setUpiId('');
      refetch();
      refetchWithdrawals();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit withdrawal request.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
        return { bg: '#ecfdf5', text: '#059669' };
      case 'pending':
        return { bg: '#fffbeb', text: '#d97706' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const renderReferralItem = ({ item, index }: { item: ReferralItem; index: number }) => {
    const statusColors = getStatusColor(item.status);
    const initials = item.referee_name
      ? item.referee_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    return (
      <View style={[styles.historyItem, index === 0 && { marginTop: 0 }]}>
        {/* Avatar */}
        <View style={styles.historyAvatar}>
          <Text style={styles.historyAvatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={styles.historyInfo}>
          <Text style={styles.historyName} numberOfLines={1}>
            {item.referee_name}
          </Text>
          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Right side */}
        <View style={styles.historyRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {item.status}
            </Text>
          </View>
          {item.commission_earned_inr > 0 ? (
            <Text style={styles.historyCredits}>+₹{item.commission_earned_inr}</Text>
          ) : item.credits_earned > 0 ? (
            <Text style={styles.historyCredits}>+{item.credits_earned} cr</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#7c3aed', '#4c1d95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <Text style={styles.headerSubtitle}>Invite friends & earn cash</Text>
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loaderText}>Loading your referrals…</Text>
          </View>
        ) : isError ? (
          <View style={styles.loaderWrap}>
            <Icon name="alert-circle-outline" size={40} color="#ef4444" />
            <Text style={styles.errorText}>Could not load referral data.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Referral Code Card ── */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Your Referral Code</Text>

              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText} selectable>
                    {referralCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnCopied]}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={copied ? '#10b981' : '#7c3aed'}
                  />
                  <Text
                    style={[styles.copyBtnText, copied && styles.copyBtnTextCopied]}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.linkPreview}>{referralLink}</Text>

              {/* Share Button */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Icon name="share-social-outline" size={20} color="#ffffff" />
                <Text style={styles.shareBtnText}>Share Referral Link</Text>
              </TouchableOpacity>
            </View>

            {/* ── Summary Cards ── */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { marginRight: 8 }]}>
                <View style={styles.summaryIconWrap}>
                  <Icon name="people-outline" size={22} color="#7c3aed" />
                </View>
                <Text style={styles.summaryValue}>{totalReferrals}</Text>
                <Text style={styles.summaryLabel}>Total Referrals</Text>
              </View>
              <View style={[styles.summaryCard, { marginLeft: 8 }]}>
                <View style={[styles.summaryIconWrap, { backgroundColor: '#ecfdf5' }]}>
                  <Icon name="gift-outline" size={22} color="#10b981" />
                </View>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  ₹{totalCommission}
                </Text>
                <Text style={styles.summaryLabel}>Total Earning</Text>
              </View>
            </View>

            {/* ── Wallet Card ── */}
            <View style={styles.walletCard}>
              <View style={styles.walletLeft}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletAmount}>₹{walletBalance}</Text>
              </View>
              <TouchableOpacity 
                style={styles.withdrawBtn} 
                activeOpacity={0.8}
                onPress={() => setIsWithdrawModalVisible(true)}
              >
                <Icon name="wallet-outline" size={18} color="#ffffff" />
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            {/* ── Withdrawal History Card ── */}
            <TouchableOpacity 
              style={styles.walletCard} 
              activeOpacity={0.8}
              onPress={() => setIsHistoryModalVisible(true)}
            >
              <View style={styles.walletLeft}>
                <Text style={styles.walletLabel}>Withdrawal History</Text>
                <Text style={styles.historyCountText}>{totalWithdrawals} Transactions</Text>
              </View>
              <Icon name="chevron-forward-outline" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* ── Referral History ── */}
            <View style={styles.card}>
              <View style={styles.historyHeader}>
                <Text style={styles.cardTitle}>Referral History</Text>
                {isFetching && (
                  <ActivityIndicator size="small" color="#7c3aed" />
                )}
              </View>

              {referrals.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Icon name="person-add-outline" size={44} color="#d1d5db" />
                  <Text style={styles.emptyText}>
                    No referrals yet.{'\n'}Share your code to get started!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={referrals}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderReferralItem}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Withdraw Modal ── */}
      <Modal
        visible={isWithdrawModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsWithdrawModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => Keyboard.dismiss()} 
          />
          <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Withdraw Funds</Text>
                  <TouchableOpacity onPress={() => setIsWithdrawModalVisible(false)}>
                    <Icon name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  style={styles.modalBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.balanceHeader}>Available Balance: ₹{walletBalance}</Text>
                  


                  <Text style={styles.inputLabel}>Amount (₹)</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Min. ₹100"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                  />

                  <Text style={styles.inputLabel}>UPI ID</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="e.g. 9876543210@upi"
                    placeholderTextColor="#9ca3af"
                    value={upiId}
                    onChangeText={setUpiId}
                    autoCapitalize="none"
                  />
                </ScrollView>

                <TouchableOpacity 
                  style={styles.submitBtn} 
                  activeOpacity={0.8}
                  onPress={handleSubmitWithdrawal}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Request Withdrawal</Text>
                  )}
                </TouchableOpacity>
              </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Withdrawal History Modal ── */}
      <Modal
        visible={isHistoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsHistoryModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setIsHistoryModalVisible(false)} 
          />
          <View style={[styles.modalContainer, { height: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdrawal History</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {isWithdrawalLoading ? (
              <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />
            ) : withdrawalsList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Icon name="receipt-outline" size={44} color="#d1d5db" />
                <Text style={styles.emptyText}>No withdrawals yet.</Text>
              </View>
            ) : (
              <FlatList
                data={withdrawalsList}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.withdrawalItem}>
                    <View style={styles.withdrawalRow}>
                      <Text style={styles.withdrawalAmount}>₹{item.payment}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: item.status.toLowerCase() === 'pending' ? '#fffbeb' : item.status.toLowerCase() === 'rejected' ? '#fef2f2' : '#ecfdf5' }]}>
                        <Text style={[styles.statusText, { color: item.status.toLowerCase() === 'pending' ? '#d97706' : item.status.toLowerCase() === 'rejected' ? '#dc2626' : '#059669' }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.withdrawalDetail}>
                      <Text style={{ fontFamily: 'Poppins-SemiBold' }}>UPI ID: </Text>{item.upi_id}
                    </Text>
                    
                    {item.processed_at ? (
                      <Text style={styles.withdrawalDate}>Processed: {new Date(item.processed_at).toLocaleDateString()}</Text>
                    ) : null}
                    
                    {item.admin_notes ? (
                      <Text style={styles.adminNotes}>Note: {item.admin_notes}</Text>
                    ) : null}
                  </View>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Scroll
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },

  // Loader / Error
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loaderText: {
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    fontSize: 14,
  },

  // Generic Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#6b7280',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },

  // Code Row
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#4c1d95',
    letterSpacing: 3,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  copyBtnCopied: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  copyBtnText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#7c3aed',
  },
  copyBtnTextCopied: {
    color: '#10b981',
  },
  linkPreview: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Share button
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  shareBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    color: '#7c3aed',
    lineHeight: 34,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Wallet Card
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  walletLeft: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#6b7280',
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
  },
  historyCountText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  withdrawText: {
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
    fontSize: 14,
  },

  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  historyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#ede9fe',
  },
  historyAvatarText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#7c3aed',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  historyDate: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'capitalize',
  },
  historyCredits: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#10b981',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginTop: 12,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContentWrap: {
    width: '100%',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  balanceHeader: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#7c3aed',
    textAlign: 'center',
    marginBottom: 16,
  },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  methodBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#6b7280',
  },
  methodBtnTextActive: {
    color: '#111827',
    fontFamily: 'Poppins-Bold',
  },
  modalBody: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 12,
  },
  inputField: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
  },
  modalHint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    marginTop: 8,
  },
  submitBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  
  // Withdrawal History Items
  withdrawalItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  withdrawalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  withdrawalAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  withdrawalDetail: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    marginBottom: 2,
  },
  withdrawalDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#9ca3af',
    marginTop: 6,
  },
  adminNotes: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#ef4444',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
