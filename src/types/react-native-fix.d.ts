import * as React from 'react';
import * as ReactNative from 'react-native';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface IntrinsicAttributes {
      [attrName: string]: any;
    }
    interface ElementClass extends React.Component<any> {}
  }
}

// Ensure React Native components satisfy the new ComponentClass signature
declare module 'react-native' {
  import * as React from 'react';
  export interface HostInstance {
    measure(callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void): void;
    measureLayout(relativeToNativeNode: number, onSuccess: (left: number, top: number, width: number, height: number) => void, onFail: () => void): void;
    measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
    focus(): void;
    blur(): void;
  }

  export interface View extends React.Component<any, any>, HostInstance {}
  export interface Text extends React.Component<any, any>, HostInstance {}
  export interface ScrollView extends React.Component<any, any>, HostInstance {}
  export interface Image extends React.Component<any, any>, HostInstance {}
  export interface Pressable extends React.Component<any, any>, HostInstance {}
  export interface SafeAreaView extends React.Component<any, any>, HostInstance {}
  export interface TextInput extends React.Component<any, any>, HostInstance {}
  export interface ActivityIndicator extends React.Component<any, any>, HostInstance {}
  export interface TouchableOpacity extends React.Component<any, any>, HostInstance {}
  export interface FlatList<ItemT = any> extends React.Component<any, any>, HostInstance {
    props: any;
    render(): React.ReactNode;
  }
  export interface KeyboardAvoidingView extends React.Component<any, any>, HostInstance {}
  export interface Switch extends React.Component<any, any>, HostInstance {}
  export interface TouchableWithoutFeedback extends React.Component<any, any>, HostInstance {}
  export interface Modal extends React.Component<any, any>, HostInstance {}
  export interface StatusBar extends React.Component<any, any>, HostInstance {}
  export interface RefreshControl extends React.Component<any, any>, HostInstance {}
  export interface SectionList<ItemT = any, SectionT = any> extends React.Component<any, any>, HostInstance {}
}

declare module 'expo-router' {
  export type Href = string;
  export const useRouter: () => any;
  export const useLocalSearchParams: <T = any>() => T;
  export const useGlobalSearchParams: <T = any>() => T;
  export const useSegments: () => string[];
  export const useFocusEffect: (effect: () => void | (() => void)) => void;
  export const router: any;
  export const Link: React.ComponentType<any>;
  export const Stack: React.ComponentType<any> & { Screen: React.ComponentType<any> };
  export const Tabs: React.ComponentType<any> & { Screen: React.ComponentType<any> };
  export const Redirect: React.ComponentType<any>;
}

declare module 'invariant';
