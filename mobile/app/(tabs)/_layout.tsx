import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '../../constants/Colors';
import { LayoutDashboard, ShoppingCart, Truck, Users, Package, Menu } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: theme.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Solar ERP',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales POS',
          tabBarLabel: 'Sales',
          tabBarIcon: ({ color }) => <ShoppingCart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Purchases & Containers',
          tabBarLabel: 'Purchases',
          tabBarIcon: ({ color }) => <Truck color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Accounts & Ledgers',
          tabBarLabel: 'Accounts',
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products & Stock',
          tabBarLabel: 'Products',
          tabBarIcon: ({ color }) => <Package color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Reports & Settings',
          tabBarLabel: 'More',
          tabBarIcon: ({ color }) => <Menu color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
