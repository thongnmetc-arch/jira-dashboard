import { createContext, useContext, useState, useCallback } from 'react';
import vi from './vi';
import en from './en';

const dictionaries = { vi, en };
export const languages = Object.keys(dictionaries);

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('jira-dash-lang') || 'vi';
  });

  const t = useCallback((key) => {
    const keys = key.split('.');
    let value = dictionaries[lang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? key;
  }, [lang]);

  const setLanguage = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('jira-dash-lang', newLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === 'vi' ? 'en' : 'vi');
  }, [lang, setLanguage]);

  return (
    <I18nContext.Provider value={{ t, lang, setLanguage, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
