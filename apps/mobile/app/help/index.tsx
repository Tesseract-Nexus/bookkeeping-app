import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  BookOpen,
  FileText,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Video,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Users,
  Shield,
  Zap,
  Calculator,
  Receipt,
  BarChart3,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const quickLinks = [
  { id: '1', title: 'Getting Started', icon: BookOpen, description: 'Learn the basics' },
  { id: '2', title: 'Invoice Guide', icon: FileText, description: 'Create & manage invoices' },
  { id: '3', title: 'GST Compliance', icon: Calculator, description: 'Tax filing help' },
  { id: '4', title: 'Reports', icon: BarChart3, description: 'Financial reports' },
];

const faqs = [
  {
    id: '1',
    question: 'How do I create my first invoice?',
    answer: 'Go to Invoices → Tap the + button → Fill in customer details and line items → Save or send directly to customer.',
    category: 'Invoices',
  },
  {
    id: '2',
    question: 'How do I add a new customer?',
    answer: 'Navigate to Customers → Tap Add Customer → Enter customer details including GSTIN if applicable → Save.',
    category: 'Customers',
  },
  {
    id: '3',
    question: 'How do I file GSTR-1?',
    answer: 'Go to Tax → GSTR-1 → Review your outward supplies → Verify invoice data → Export JSON for GST portal upload.',
    category: 'Tax',
  },
  {
    id: '4',
    question: 'How do I track expenses?',
    answer: 'Use the Expenses section to log all business expenses. You can upload receipts, categorize expenses, and track reimbursements.',
    category: 'Expenses',
  },
  {
    id: '5',
    question: 'How do I generate financial reports?',
    answer: 'Go to Reports → Select report type (P&L, Balance Sheet, Cash Flow) → Choose date range → View or export.',
    category: 'Reports',
  },
];

const supportOptions = [
  { id: '1', title: 'Email Support', icon: Mail, description: 'support@bookkeep.com', action: 'mailto:support@bookkeep.com' },
  { id: '2', title: 'Phone Support', icon: Phone, description: '+91 1800-xxx-xxxx', action: 'tel:+911800xxxxxxx' },
  { id: '3', title: 'Live Chat', icon: MessageCircle, description: 'Available 9 AM - 6 PM', action: 'chat' },
  { id: '4', title: 'Video Tutorials', icon: Video, description: 'Watch & learn', action: 'tutorials' },
];

const categories = [
  { id: '1', title: 'Account & Profile', icon: Users, count: 12 },
  { id: '2', title: 'Invoicing', icon: FileText, count: 24 },
  { id: '3', title: 'Tax & GST', icon: Calculator, count: 18 },
  { id: '4', title: 'Expenses', icon: Receipt, count: 8 },
  { id: '5', title: 'Security', icon: Shield, count: 6 },
  { id: '6', title: 'Integrations', icon: Zap, count: 10 },
];

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredFaqs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSupportAction = (action: string) => {
    if (action.startsWith('mailto:') || action.startsWith('tel:')) {
      Linking.openURL(action);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Help & Support</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">How can we help you?</Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 mt-4">
          <Search size={18} className="text-gray-400" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for help..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-3 px-2 text-gray-900 dark:text-white"
          />
        </View>
      </Animated.View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Links */}
        <View className="p-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(100)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Quick Start Guides
          </Animated.Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Animated.View
                  key={link.id}
                  entering={FadeInUp.duration(400).delay(150 + index * 50)}
                >
                  <TouchableOpacity
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 mr-3 w-36 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                    activeOpacity={0.7}
                  >
                    <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-3">
                      <Icon size={20} className="text-primary" />
                    </View>
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">{link.title}</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{link.description}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>

        {/* Help Categories */}
        <View className="px-4 mb-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(200)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Browse by Category
          </Animated.Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat, index) => {
              const Icon = cat.icon;
              return (
                <Animated.View
                  key={cat.id}
                  entering={FadeInUp.duration(400).delay(250 + index * 30)}
                >
                  <TouchableOpacity
                    className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
                    activeOpacity={0.7}
                  >
                    <Icon size={16} className="text-primary mr-2" />
                    <Text className="text-sm text-gray-900 dark:text-white">{cat.title}</Text>
                    <View className="ml-2 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">
                      <Text className="text-xs text-gray-500 dark:text-gray-400">{cat.count}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* FAQs */}
        <View className="px-4 mb-4">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(300)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Frequently Asked Questions
          </Animated.Text>
          {filteredFaqs.map((faq, index) => (
            <Animated.View
              key={faq.id}
              entering={FadeInUp.duration(400).delay(350 + index * 50)}
            >
              <TouchableOpacity
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="bg-white dark:bg-gray-800 rounded-xl mb-2 border border-gray-200 dark:border-gray-700 overflow-hidden"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between p-4">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center mb-1">
                      <View className="px-2 py-0.5 rounded-full bg-primary/10 mr-2">
                        <Text className="text-xs font-medium text-primary">{faq.category}</Text>
                      </View>
                    </View>
                    <Text className="text-sm font-medium text-gray-900 dark:text-white">{faq.question}</Text>
                  </View>
                  {expandedFaq === faq.id ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </View>
                {expandedFaq === faq.id && (
                  <View className="px-4 pb-4 pt-0">
                    <View className="h-px bg-gray-100 dark:bg-gray-700 mb-3" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 leading-5">{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Contact Support */}
        <View className="px-4 mb-6">
          <Animated.Text
            entering={FadeInUp.duration(400).delay(500)}
            className="text-base font-semibold text-gray-900 dark:text-white mb-3"
          >
            Contact Support
          </Animated.Text>
          <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {supportOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Animated.View
                  key={option.id}
                  entering={FadeInUp.duration(400).delay(550 + index * 50)}
                >
                  <TouchableOpacity
                    onPress={() => handleSupportAction(option.action)}
                    className={`flex-row items-center justify-between p-4 ${
                      index < supportOptions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                        <Icon size={18} className="text-primary" />
                      </View>
                      <View>
                        <Text className="text-sm font-medium text-gray-900 dark:text-white">{option.title}</Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400">{option.description}</Text>
                      </View>
                    </View>
                    <ExternalLink size={16} className="text-gray-400" />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Help Card */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(700)}
          className="mx-4 mb-8"
        >
          <View className="bg-gradient-to-r from-primary to-purple-600 rounded-xl p-5">
            <View className="flex-row items-center mb-3">
              <HelpCircle size={24} className="text-white mr-2" />
              <Text className="text-lg font-bold text-white">Still need help?</Text>
            </View>
            <Text className="text-white/90 text-sm mb-4">
              Our support team is available 24/7 to assist you with any questions.
            </Text>
            <TouchableOpacity className="bg-white rounded-lg py-2.5 px-4 self-start">
              <Text className="text-primary font-semibold">Contact Us</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
