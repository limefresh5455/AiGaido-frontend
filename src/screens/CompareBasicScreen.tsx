import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { comparisonService } from '../services/comparisonService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Config from 'react-native-config';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'CompareBasic'>;
  route: { params: { placeIds: string[] } };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompareBasicScreen({ navigation, route }: Props) {
  const { placeIds } = route.params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compareBasic', placeIds],
    queryFn: () => comparisonService.compareBasic({ place_ids: placeIds }),
    enabled: placeIds && placeIds.length > 0,
  });

  const comparisonData = data?.places || [];
  const attributeTable = data?.attribute_table || [];
  const highlights = data?.highlights || {};

  const ROW_HEIGHT = 48;
  const SECTION_TITLE_HEIGHT = 40;
  const HEADER_HEIGHT = 190;
  const FIXED_COL_WIDTH = 130;

  const numPlaces = comparisonData.length;
  const isScrollable = numPlaces > 2;
  const COLUMN_WIDTH = isScrollable ? SCREEN_WIDTH * 0.42 : (SCREEN_WIDTH - FIXED_COL_WIDTH) / numPlaces;

  const SECTIONS = [
    {
      title: 'Basic Info',
      data: [
        { label: 'Distance', field: 'distance_from_you_km', icon: 'navigate-outline' },
        { label: 'Status', field: 'business_status', icon: 'information-circle-outline' },
        { label: 'Open Now', field: 'open_now', icon: 'time-outline' },
        { label: 'Price', field: 'price_level', icon: 'cash-outline' },
        { label: 'Type', field: 'primary_type', icon: 'pricetag-outline' },
      ]
    },
    ...(attributeTable.length > 0 ? [{
      title: 'Attributes',
      data: attributeTable.map((attr: any) => ({
        label: attr.label,
        field: `_attr_${attr.key}`,
        icon: 'list-outline',
        isDynamic: true,
        key: attr.key
      }))
    }] : []),
    {
      title: 'Amenities',
      data: [
        { label: 'Dine In', field: 'dine_in', icon: 'restaurant-outline' },
        { label: 'Takeout', field: 'takeout', icon: 'bag-handle-outline' },
        { label: 'Delivery', field: 'delivery', icon: 'bicycle-outline' },
        { label: 'Outdoor', field: 'outdoor_seating', icon: 'sunny-outline' },
        { label: 'Reserve', field: 'reservable', icon: 'calendar-outline' },
        { label: 'Wheelchair', field: 'wheelchair_accessible', icon: 'body-outline' },
        { label: 'Dogs', field: 'allows_dogs', icon: 'paw-outline' },
      ]
    },
    {
      title: 'Food & Drinks',
      data: [
        { label: 'Breakfast', field: 'serves_breakfast', icon: 'sunny-outline' },
        { label: 'Lunch', field: 'serves_lunch', icon: 'fast-food-outline' },
        { label: 'Dinner', field: 'serves_dinner', icon: 'moon-outline' },
        { label: 'Brunch', field: 'serves_brunch', icon: 'cafe-outline' },
        { label: 'Vegetarian', field: 'serves_vegetarian_food', icon: 'leaf-outline' },
      ]
    },
    {
      title: 'Your Context',
      data: [
        { label: 'Saved', field: '_context_saved', icon: 'bookmark-outline' },
        { label: 'Visited', field: '_context_visited', icon: 'footsteps-outline' },
      ]
    },
    {
      title: 'Reviews',
      data: [
        { label: 'Rating', field: 'rating', icon: 'star-outline' },
        { label: 'Total', field: 'user_rating_count', icon: 'people-outline' },
      ]
    }
  ];

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const getCellValue = (item: any, row: any) => {
    if (row.isDynamic) {
      const attr = attributeTable.find((a: any) => a.key === row.key);
      const val = attr?.values.find((v: any) => v.place_id === item.place_id);
      return val ? (val.label || val.value || '--') : '--';
    }
    if (row.field === '_context_saved') return item.your_context?.is_saved ? 'Yes' : 'No';
    if (row.field === '_context_visited') return item.your_context?.has_visited ? 'Yes' : 'No';
    return formatValue(item[row.field]);
  };

  const formatHighlightValue = (key: string, value: any) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const parts = [];
      if (value.name) parts.push(value.name);
      if (value.rating) parts.push(`${value.rating}★`);
      if (value.review_count) parts.push(`(${value.review_count} reviews)`);
      if (value.count) parts.push(`(${value.count} reviews)`);
      if (value.distance_km) parts.push(`${value.distance_km}km away`);
      return parts.join(' • ') || JSON.stringify(value);
    }
    return String(value);
  };

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    if (photoName.startsWith('http')) return photoName;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Loading detailed comparison...</Text>
      </SafeAreaView>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Icon name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>
          {data?.message || 'Failed to load detailed comparison'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryButton, { marginTop: 12, backgroundColor: '#f3f4f6' }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.retryText, { color: '#4b5563' }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detailed Comparison</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Highlights Section */}
        {Object.keys(highlights).length > 0 && (
          <View style={[styles.section, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {Object.entries(highlights).map(([key, value]: [string, any]) => (
              <View key={key} style={styles.highlightRow}>
                <Text style={styles.highlightLabel}>{key.replace(/_/g, ' ')}</Text>
                <Text style={styles.highlightValue}>{formatHighlightValue(key, value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Synchronized Table Section */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 16 }}>
          
          {/* Fixed Left Column */}
          <View style={{ width: FIXED_COL_WIDTH, borderRightWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#ffffff', zIndex: 10 }}>
            {/* Header Spacer */}
            <View style={{ height: HEADER_HEIGHT, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }} />
            
            {SECTIONS.map((section, idx) => (
              <View key={idx}>
                <View style={{ height: SECTION_TITLE_HEIGHT, justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{section.title}</Text>
                </View>
                {section.data.map((row: any) => (
                  <View key={row.field} style={{ flexDirection: 'row', alignItems: 'center', height: ROW_HEIGHT, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb', width: '100%' }}>
                    <Icon name={row.icon} size={16} color="#4b5563" />
                    <Text style={[styles.labelText, { flex: 1, marginLeft: 6 }]} numberOfLines={2}>{row.label}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Top Reviews Row Label */}
            <View>
              <View style={{ height: SECTION_TITLE_HEIGHT, justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Top Reviews</Text>
              </View>
              <View style={{ flexDirection: 'row', height: 168, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb', width: '100%', alignItems: 'flex-start', paddingTop: 14 }}>
                <Icon name="chatbubble-outline" size={16} color="#4b5563" />
                <Text style={[styles.labelText, { flex: 1, marginLeft: 6 }]} numberOfLines={2}>Review</Text>
              </View>
            </View>
          </View>

          {/* Right Scrollable Data */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ flex: 1 }} 
            bounces={false}
            snapToInterval={COLUMN_WIDTH}
            decelerationRate="fast"
            snapToAlignment="start"
          >
            <View>
              {/* Place Headers */}
              <View style={{ flexDirection: 'row', height: HEADER_HEIGHT, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                {comparisonData.map((item: any) => (
                  <View key={item.place_id} style={[styles.placeHeaderColumn, { width: COLUMN_WIDTH, justifyContent: 'center' }]}>
                    {item.photo_name || (item.photo_references && item.photo_references.length > 0) ? (
                      <Image 
                        source={{ uri: getPhotoUrl(item.photo_name || item.photo_references[0].name) as string }} 
                        style={styles.placeImage} 
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Icon name="business" size={32} color="#d1d5db" />
                      </View>
                    )}
                    <Text style={styles.placeName} numberOfLines={2}>{item.display_name}</Text>
                    <View style={styles.ratingRow}>
                      <Icon name="star" size={14} color="#f59e0b" />
                      <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'N/A'}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Data Rows */}
              {SECTIONS.map((section, idx) => (
                <View key={idx}>
                  <View style={{ height: SECTION_TITLE_HEIGHT, backgroundColor: '#f9fafb' }} />
                  {section.data.map((row: any) => (
                    <View key={row.field} style={{ flexDirection: 'row', height: ROW_HEIGHT }}>
                      {comparisonData.map((item: any) => (
                        <View key={item.place_id} style={{ width: COLUMN_WIDTH, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f9fafb', paddingHorizontal: 8 }}>
                          <Text style={styles.valueText} numberOfLines={2}>{getCellValue(item, row)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}

              {/* Top Reviews Data Rows */}
              <View>
                <View style={{ height: SECTION_TITLE_HEIGHT, backgroundColor: '#f9fafb' }} />
                <View style={{ flexDirection: 'row', height: 168 }}>
                  {comparisonData.map((item: any) => (
                    <View key={item.place_id} style={{ width: COLUMN_WIDTH, padding: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' }}>
                      {item.top_reviews && item.top_reviews.length > 0 ? (
                        <View style={styles.reviewCard}>
                          <View style={styles.reviewHeaderRow}>
                            <Text style={styles.reviewAuthorText} numberOfLines={1}>
                              {item.top_reviews[0].author_name || 'Anonymous'}
                            </Text>
                            {item.top_reviews[0].rating != null && (
                              <View style={styles.reviewRatingBadge}>
                                <Icon name="star" size={10} color="#f59e0b" />
                                <Text style={styles.reviewRatingBadgeText}>
                                  {Number(item.top_reviews[0].rating).toFixed(1)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.reviewBodyText} numberOfLines={4}>"{item.top_reviews[0].text}"</Text>
                        </View>
                      ) : (
                        <View style={[styles.reviewCard, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={styles.noReviewText}>No reviews available</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
  },
  placesHeader: {
    flexDirection: 'row',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  placeHeaderColumn: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontFamily: 'Poppins-Regular',
  },
  placeName: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
    height: 40,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'Poppins-Regular',
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#111827',
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-ExtraBold',
    color: '#3b2c85',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  rowVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 0,
  },
  fullWidthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    color: '#3b2c85',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  fullWidthLabelText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#3b2c85',
    textTransform: 'uppercase',
  },
  labelColumn: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 8,
    fontFamily: 'Poppins-Regular',
  },
  labelText: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: 'Poppins-Medium',
  },
  valuesScroll: {
    flex: 1,
  },
  valueColumn: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  highlightRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#111827',
    lineHeight: 20,
  },
  reviewCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'flex-start',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 4,
  },
  reviewAuthorText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#1f2937',
    flex: 1,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  reviewRatingBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#d97706',
  },
  reviewBodyText: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
    color: '#4b5563',
    lineHeight: 16,
    textAlign: 'left',
  },
  noReviewText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9ca3af',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});
