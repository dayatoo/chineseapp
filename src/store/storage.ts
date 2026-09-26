import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** All user data lives on-device in AsyncStorage. */
export const persistStorage = createJSONStorage(() => AsyncStorage);
