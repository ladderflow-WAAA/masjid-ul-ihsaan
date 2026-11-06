import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Clock, Calendar, Bell, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A1F17',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          color: '#ffffff',
          fontFamily: 'Inter_700Bold',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: '#0A1F17',
          borderTopColor: '#122E22',
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#F5F3EF',
        tabBarInactiveTintColor: '#5C8A78',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: 'Inter_600SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size || 22} />,
          headerTitle: t('appName'),
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: t('tabs.timetable'),
          tabBarLabel: t('tabs.timetable'),
          tabBarAccessibilityLabel: t('tabs.timetable'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: t('tabs.announcements'),
          tabBarLabel: t('tabs.announcements'),
          tabBarAccessibilityLabel: t('tabs.announcements'),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarAccessibilityLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}
