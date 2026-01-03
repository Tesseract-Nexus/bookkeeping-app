import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | 'auto' | 'full';
  showHandle?: boolean;
  showCloseButton?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  showCloseButton = true,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getHeightStyle = () => {
    if (height === 'full') return { height: SCREEN_HEIGHT * 0.9 };
    if (height === 'auto') return {};
    return { height };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          style={{ opacity }}
          className="absolute inset-0 bg-black/50"
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            { transform: [{ translateY }] },
            getHeightStyle(),
          ]}
          className="bg-white rounded-t-3xl"
        >
          {showHandle && (
            <View {...panResponder.panHandlers} className="items-center pt-3 pb-2">
              <View className="w-10 h-1 bg-gray-300 rounded-full" />
            </View>
          )}

          {(title || showCloseButton) && (
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ActionSheetOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  options,
  cancelLabel = 'Cancel',
}: ActionSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showHandle={true}
      showCloseButton={false}
    >
      <View className="px-4 py-2">
        {title && (
          <Text className="text-lg font-semibold text-gray-900 text-center">
            {title}
          </Text>
        )}
        {message && (
          <Text className="text-gray-500 text-center mt-1">{message}</Text>
        )}

        <View className="mt-4">
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                option.onPress();
                onClose();
              }}
              disabled={option.disabled}
              className={`flex-row items-center py-4 ${
                index < options.length - 1 ? 'border-b border-gray-100' : ''
              } ${option.disabled ? 'opacity-50' : ''}`}
            >
              {option.icon && (
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={option.destructive ? '#EF4444' : '#374151'}
                  style={{ marginRight: 12 }}
                />
              )}
              <Text
                className={`text-base ${
                  option.destructive ? 'text-error-600' : 'text-gray-700'
                } font-medium`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={onClose}
          className="bg-gray-100 rounded-xl py-4 mt-4 mb-4"
        >
          <Text className="text-gray-700 font-semibold text-center">
            {cancelLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}
