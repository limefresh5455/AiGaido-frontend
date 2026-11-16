import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import RazorpayCheckout from 'react-native-razorpay';
import Config from 'react-native-config';
import { CreditPlan, Transaction } from '../services/types';
import { authService } from '../services/authService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomButton from '../components/Buttons/Button';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Plans'>;
};

const showFriendlyError = (error:any) => {
  let title = "Payment Couldn't Be Processed";
  let message = "Something went wrong while initiating your transaction. Please try again or contact support if the issue persists.";

  // Handle Razorpay specific errors
  if (error?.code) {
    switch (error.code) {
      case 0:
        // Razorpay error code 0 usually means payment cancelled by user or setup issue
        title = "Payment Cancelled";
        message = "The payment process was closed before completion. No money was deducted from your account.";
        break;
      case 2:
        title = "Network Connection Error";
        message = "Please check your internet connection and try again.";
        break;
      default:
        title = "Payment Failed";
        message = error.description || "We were unable to complete your payment. Please try another payment method.";
        break;
    }
  } else if (error.message === "ORDER_CREATION_FAILED") {
    title = "Unable to Start Payment";
    message = "Could not reach the payment server. Please try again in a few moments.";
  }

  Alert.alert(
    title,
    message,
  );
};

export default function PlansScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [purchasedDetails, setPurchasedDetails] = useState<{
    credits: number;
    inr: number;
    currency: string;
  } | null>(null);
  const [customAmountText, setCustomAmountText] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);

  const { data: plansData, isLoading: isLoadingPlans, refetch: refetchPlans } = useQuery({
    queryKey: ['creditPlans'],
    queryFn: () => paymentService.listPlans(),
  });

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['authMe'],
    queryFn: () => authService.getMe(),
  });

  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: () => paymentService.getPaymentHistory(),
  });

  const { data: transactionDetails, isLoading: isLoadingTransaction } = useQuery({
    queryKey: ['paymentDetails', selectedTransactionId],
    queryFn: () => paymentService.getPayoutDetails(selectedTransactionId!.toString()),
    enabled: !!selectedTransactionId && isTransactionModalVisible,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPlans(),
      refetchUser(),
      refetchHistory()
    ]);
    setIsRefreshing(false);
  };

  const confirmPaymentMutation = useMutation({
    mutationFn: (data: any) =>
      paymentService.confirmPayment(data),
    onSuccess: (response) => {
       setSuccessModalVisible(true);
      queryClient.invalidateQueries({ queryKey: ['authMe'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'An error occurred during confirmation');
    },
  });

  const createIntentMutation = useMutation({
    mutationFn: ({plan,amount_inr}:{plan: string,amount_inr:number}) => paymentService.createPaymentIntent({ package:plan ,amount_inr }),
    onSuccess: async (response, variables) => {

      
      if (response) {
       
        const { client_secret, order_id } = response;
        const finalOrderId = order_id;

        if (!finalOrderId) {
          Alert.alert('Error', 'Order ID is missing from the response.');
          return;
        }

        const options = {
          description: 'Credits for AiGaido',
          image: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          currency: 'INR',
          key: Config.RAZORPAY_KEY_ID || '', 
          amount: variables.amount_inr * 100, // amount in paise
          name: 'AiGaido',
          order_id: finalOrderId, // Replace with order_id from backend
          prefill: {
            email: userData?.email || '',
            contact: '',
            name: userData?.full_name || ''
          },
          theme: { color: '#3b2c85' }
        };

        RazorpayCheckout.open(options).then((data) => {
          // Confirm payment on backend
    
          confirmPaymentMutation.mutate({
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            razorpay_signature: data.razorpay_signature,
            // payment_intent_id: finalOrderId, // Fallback if backend still expects this
          });

          const creditsReceived = selectedPlan 
            ? selectedPlan.credits 
            : Math.floor(variables.amount_inr / 3);
          const amountCharged = selectedPlan 
            ? selectedPlan.inr 
            : variables.amount_inr;

          setPurchasedDetails({
            credits: creditsReceived,
            inr: amountCharged,
            currency: selectedPlan?.currency || 'INR',
          });
         
         
        }).catch((error) => {
      
          showFriendlyError(error);
        });
      }
      //  else {
      //   Alert.alert('Error', response?.message || 'Failed to initiate payment');
      // }
    },
    onError: (error: any) => {
    
      Alert.alert('Error', error.message || 'An error occurred');
    },
  });

  const handlePurchase = (plan: CreditPlan) => {
    setSelectedPlan(plan);
    createIntentMutation.mutate({plan:plan?.label,amount_inr:plan?.inr});
  };

  const handleCustomPurchase = () => {
    const customAmount = parseInt(customAmountText, 10);
    if (isNaN(customAmount) || customAmount < 100) {
      Alert.alert('Error', 'Minimum amount is ₹100');
      return;
    }
    setSelectedPlan(null);
    createIntentMutation.mutate({ plan: 'custom', amount_inr: customAmount });
  };

  if (isLoadingPlans) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
      </View>
    );
  }

  const plans = plansData?.packages || [
     {
            "inr": 150,
            "credits": 50,
            "label": "Starter",
            "currency": "INR"
        },
        {
            "inr": 300,
            "credits": 110,
            "label": "Popular",
            "currency": "INR"
        },
        {
            "inr": 500,
            "credits": 190,
            "label": "Pro",
            "currency": "INR"
        },
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getCurrencySymbol = (currency?: string) => {
    if (currency === 'INR') return '₹';
    if (currency === 'USD') return '$';
    return '₹'; // Default to INR since backend updated to INR packages
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Credits</Text>
        <View style={styles.creditBadge}>
          <Icon name="flash" size={16} color="#3b2c85" />
          <Text style={styles.creditText}>{userData?.credits || 0}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#3b2c85']} />
        }
      >
        <Text style={styles.subtitle}>Choose a plan or enter custom amount</Text>

        {plans.map((plan) => (
          <View
            key={plan.label}
            style={styles.planCard}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.label}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>{getCurrencySymbol(plan.currency)}</Text>
                <Text style={styles.priceText}>{plan.inr}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.planFooter}>
              <View style={styles.creditInfo}>
                <Icon name="flash" size={20} color="#3b2c85" />
                <Text style={styles.planCredits}>{plan.credits} Credits</Text>
              </View>
              <CustomButton
                title="Buy Now"
                size="sm"
                onPress={() => handlePurchase(plan)}
                loading={createIntentMutation.isPending && createIntentMutation.variables?.plan === plan.label}
                disabled={createIntentMutation.isPending}
                borderRadius={10}
                buttonStyle={{ minWidth: 100 }}
              />
            </View>
          </View>
        ))}

        {/* Custom Pricing Card */}
        <View style={styles.customCard}>
          <Text style={styles.customTitle}>Custom Credits</Text>
          <Text style={styles.customSubtitle}>Need more? Add any custom amount (₹1 per credit, min ₹100).</Text>
          
          <View style={styles.customInputContainer}>
            <Text style={styles.customCurrencyPrefix}>₹</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Enter amount (min 100)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={customAmountText}
              onChangeText={setCustomAmountText}
            />
          </View>
          
          {customAmountText !== '' && (
            <View style={styles.customCalculation}>
              {parseInt(customAmountText, 10) < 100 ? (
                <Text style={styles.errorText}>Minimum amount must be ₹100</Text>
              ) : (
                <Text style={styles.calculationText}>
                  You will receive:{' '}
                  <Text style={styles.calculationHighlight}>
                    {Math.floor(parseInt(customAmountText, 10))} Credits
                  </Text>
                </Text>
              )}
            </View>
          )}

          <CustomButton
            type="primary"
            title="Buy Custom Credits"
            onPress={handleCustomPurchase}
            loading={createIntentMutation.isPending && !selectedPlan}
            disabled={createIntentMutation.isPending || !customAmountText || parseInt(customAmountText, 10) < 100}
            buttonStyle={styles.customPurchaseButton}
          />
        </View>

        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Credits are used for AI travel assistance and premium location features. Credits never expire.
          </Text>
        </View>

        {/* Payment History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Payment History</Text>
          {isLoadingHistory ? (
            <ActivityIndicator size="small" color="#3b2c85" style={{ marginVertical: 20 }} />
          ) : historyData?.transactions && historyData.transactions.length > 0 ? (
            <>
              {historyData.transactions.slice(0, showAllHistory ? undefined : 3).map((tx: Transaction) => (
                <TouchableOpacity 
                  key={tx.id} 
                  style={styles.txCard}
                  onPress={() => {
                    setSelectedTransactionId(tx.id);
                    setIsTransactionModalVisible(true);
                  }}
                >
                  <View style={styles.txRow}>
                    <View style={styles.txIconContainer}>
                      <Icon name="flash" size={18} color="#3b2c85" />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txCredits}>+{tx.credits_purchased} Credits</Text>
                      <Text style={styles.txDate}>{formatDate(tx.completed_at || tx.created_at)}</Text>
                    </View>
                    <View style={styles.txAmountContainer}>
                      <Text style={styles.txAmount}>₹{(tx?.amount_inr).toFixed(2)}</Text>
                      <View style={[
                        styles.statusBadge,
                        tx.status === 'succeeded' ? styles.statusSuccess : styles.statusPending
                      ]}>
                        <Text style={[
                          styles.statusText,
                          tx.status === 'succeeded' ? styles.statusTextSuccess : styles.statusTextPending
                        ]}>
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {historyData.transactions.length > 3 && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => setShowAllHistory(!showAllHistory)}
                >
                  <Text style={styles.seeAllText}>
                    {showAllHistory ? 'Show Less' : `See All (${historyData.transactions.length})`}
                  </Text>
                  <Icon
                    name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#3b2c85"
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyHistory}>
              <Icon name="receipt-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyHistoryText}>No transactions found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Premium Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Icon name="checkmark-circle" size={54} color="#2c853bff" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Credits Added!</Text>
            <Text style={styles.modalSubtitle}>
              Your payment has been successfully processed and your credits are ready to use.
            </Text>

            <View style={styles.receiptContainer}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Credits Received</Text>
                <View style={styles.receiptValueBadge}>
                  <Icon name="flash" size={14} color="#3b2c85" />
                  <Text style={styles.receiptValueBold}>{purchasedDetails?.credits} Credits</Text>
                </View>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Charged</Text>
                <Text style={styles.receiptValue}>
                  {purchasedDetails?.currency === 'USD' ? '$' : ''}
                  {(purchasedDetails?.inr || 0).toFixed(2)} {purchasedDetails?.currency !== 'USD' ? purchasedDetails?.currency : ''}
                </Text>
              </View>
            </View>

            <CustomButton
              type="primary"
              title="Done"
              onPress={() => setSuccessModalVisible(false)}
              buttonStyle={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
      {/* Transaction Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTransactionModalVisible}
        onRequestClose={() => {
          setIsTransactionModalVisible(false);
          setSelectedTransactionId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.receiptRow, { width: '100%', marginBottom: 16 }]}>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsTransactionModalVisible(false);
                  setSelectedTransactionId(null);
                }}
              >
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            {isLoadingTransaction ? (
              <ActivityIndicator size="large" color="#3b2c85" style={{ marginVertical: 30 }} />
            ) : transactionDetails ? (
              <View style={[styles.receiptContainer, { borderWidth: 0, padding: 0 }]}>
                <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <Text style={styles.receiptLabel}>Transaction ID</Text>
                  <Text style={styles.receiptValue}>{transactionDetails.id}</Text>
                </View>
                <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <Text style={styles.receiptLabel}>Date</Text>
                  <Text style={styles.receiptValue}>{formatDate(transactionDetails.completed_at || transactionDetails.created_at)}</Text>
                </View>
                <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <Text style={styles.receiptLabel}>Amount</Text>
                  <Text style={styles.receiptValue}>{transactionDetails.currency === 'INR' ? '₹' : '$'}{(transactionDetails.amount_inr || transactionDetails.amount_usd || (transactionDetails.amount_paise ? transactionDetails.amount_paise / 100 : 0)).toFixed(2)}</Text>
                </View>
                <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <Text style={styles.receiptLabel}>Credits</Text>
                  <Text style={styles.receiptValue}>+{transactionDetails.credits_purchased}</Text>
                </View>
                <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                  <Text style={styles.receiptLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    transactionDetails.status === 'succeeded' ? styles.statusSuccess : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusText,
                      transactionDetails.status === 'succeeded' ? styles.statusTextSuccess : styles.statusTextPending
                    ]}>
                      {transactionDetails.status}
                    </Text>
                  </View>
                </View>
                {transactionDetails.razorpay_payment_id && (
                  <View style={[styles.receiptRow, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }]}>
                    <Text style={styles.receiptLabel}>Payment Ref</Text>
                    <Text style={styles.receiptValue}>{transactionDetails.razorpay_payment_id}</Text>
                  </View>
                )}
                {transactionDetails.metadata?.email_sent && (
                   <View style={[styles.receiptRow, { paddingVertical: 12 }]}>
                     <Text style={styles.receiptLabel}>Receipt</Text>
                     <Text style={styles.receiptValue}>Emailed</Text>
                   </View>
                )}
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginVertical: 20 }}>Failed to load details</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Processing Overlay */}
      {confirmPaymentMutation.isPending && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.processingTitle}>Processing Payment...</Text>
            <Text style={styles.processingSubtitle}>Please don't close the app</Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    fontFamily: 'Poppins-Regular',
  },
  creditText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    fontFamily: 'Poppins-Regular',
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
    marginTop: 4,
  },
  priceText: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'Poppins-Regular',
  },
  planCredits: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#3b2c85',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    fontFamily: 'Poppins-Regular',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#3730a3',
    lineHeight: 18,
  },
  historySection: {
    marginTop: 32,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 16,
  },  
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txCredits: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    marginTop: 2,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  statusSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'capitalize',
  },
  statusTextSuccess: {
    color: '#065f46',
    fontFamily: 'Poppins-Regular',
  },
  statusTextPending: {
    color: '#92400e',
    fontFamily: 'Poppins-Regular',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  customCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  customSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    marginBottom: 16,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  customCurrencyPrefix: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#374151',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Poppins-SemiBold',
  },
  customCalculation: {
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  calculationText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
  },
  calculationHighlight: {
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  customPurchaseButton: {
    backgroundColor: '#3b2c85',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  customPurchaseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
    gap: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#3b2c85',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0fff0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e6ffe1ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  receiptContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  receiptValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    fontFamily: 'Poppins-Regular',
  },
  receiptValueBold: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
  },
  receiptValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  modalButton: {
    backgroundColor: '#3b2c85',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  processingCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  processingTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
    textAlign: 'center',
  },
});

