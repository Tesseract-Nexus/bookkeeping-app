import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';

interface SelectOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function Select({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  error,
  disabled = false,
  searchable = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <View>
      {label && (
        <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      )}
      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between border rounded-xl px-4 py-3 ${
          error
            ? 'border-error-500'
            : isOpen
            ? 'border-primary-500 border-2'
            : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
      >
        <Text
          className={`flex-1 ${
            selectedOption ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9CA3AF"
        />
      </TouchableOpacity>
      {error && (
        <Text className="text-error-500 text-sm mt-1">{error}</Text>
      )}

      <BottomSheet
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
        title={label || 'Select'}
        height={options.length > 6 ? 400 : 'auto'}
      >
        <View className="px-4 pb-6">
          {searchable && (
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mb-4">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 ml-2 text-gray-900"
              />
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className={`flex-row items-center py-4 border-b border-gray-100 ${
                  value === option.value ? 'bg-primary-50' : ''
                }`}
              >
                {option.icon && (
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={value === option.value ? '#4F46E5' : '#6B7280'}
                    style={{ marginRight: 12 }}
                  />
                )}
                <View className="flex-1">
                  <Text
                    className={`text-base ${
                      value === option.value
                        ? 'text-primary-600 font-medium'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text className="text-gray-400 text-sm mt-0.5">
                      {option.description}
                    </Text>
                  )}
                </View>
                {value === option.value && (
                  <Ionicons name="checkmark" size={22} color="#4F46E5" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
}

// Need to import TextInput
import { TextInput } from 'react-native';

interface ChipSelectOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChipSelectProps {
  options: ChipSelectOption[];
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
}

export function ChipSelect({
  options,
  value,
  onChange,
  multiple = false,
  selectedValues = [],
  onMultiChange,
}: ChipSelectProps) {
  const handlePress = (optionValue: string) => {
    if (multiple && onMultiChange) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onMultiChange(newValues);
    } else {
      onChange(optionValue);
    }
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
      return selectedValues.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => handlePress(option.value)}
          className={`flex-row items-center mr-2 px-4 py-2 rounded-full ${
            isSelected(option.value) ? 'bg-primary-600' : 'bg-gray-100'
          }`}
        >
          {option.icon && (
            <Ionicons
              name={option.icon}
              size={16}
              color={isSelected(option.value) ? '#FFFFFF' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            className={`font-medium ${
              isSelected(option.value) ? 'text-white' : 'text-gray-600'
            }`}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(value?.getMonth() || new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(value?.getFullYear() || new Date().getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date?: Date) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(selectedYear, selectedMonth, day);
    onChange(newDate);
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);

  return (
    <View>
      {label && (
        <Text className="text-gray-700 font-medium mb-2">{label}</Text>
      )}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        className={`flex-row items-center justify-between border rounded-xl px-4 py-3 ${
          error ? 'border-error-500' : 'border-gray-300'
        } bg-white`}
      >
        <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
          {formatDate(value)}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      {error && (
        <Text className="text-error-500 text-sm mt-1">{error}</Text>
      )}

      <BottomSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Date"
        height={400}
      >
        <View className="px-4 pb-6">
          {/* Month/Year Navigation */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#4F46E5" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              {months[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          {/* Weekday Headers */}
          <View className="flex-row mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-gray-400 text-sm font-medium">{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {/* Empty cells for first week */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <View key={`empty-${index}`} className="w-[14.28%] h-10" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const date = new Date(selectedYear, selectedMonth, day);
              const isSelected =
                value?.getDate() === day &&
                value?.getMonth() === selectedMonth &&
                value?.getFullYear() === selectedYear;
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === selectedMonth &&
                new Date().getFullYear() === selectedYear;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleDayPress(day)}
                  className={`w-[14.28%] h-10 items-center justify-center ${
                    isSelected ? 'bg-primary-600 rounded-full' : ''
                  }`}
                >
                  <Text
                    className={`${
                      isSelected
                        ? 'text-white font-bold'
                        : isToday
                        ? 'text-primary-600 font-bold'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
