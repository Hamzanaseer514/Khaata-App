import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import i18n from '@/config/i18n';

type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_KEY = '@khaata_app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('en');
  const isRTL = language === 'ur';

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved === 'en' || saved === 'ur') {
          setLangState(saved);
          i18n.changeLanguage(saved);
          I18nManager.forceRTL(saved === 'ur');
          I18nManager.allowRTL(saved === 'ur');
        }
      } catch (e) {
        console.error('Error loading language:', e);
      }
    };
    load();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      console.error('Error saving language:', e);
    }
    i18n.changeLanguage(lang);
    setLangState(lang);
    I18nManager.forceRTL(lang === 'ur');
    I18nManager.allowRTL(lang === 'ur');
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
