export const ADMIN_UID = 'moVQIEK5RqhXUOf4wk1L7913kZZ2';
export const GOOGLE_WEB_CLIENT_ID = '977625264040-361rbt4brb2avgb0hbg3g7uou27e8mo1.apps.googleusercontent.com';

// Single source of truth for API URLs.
export const DEV_API_URL = 'http://82.29.162.228:1908/api';   // local dev (VPS)
export const PROD_API_URL = 'http://82.29.162.228:1908/api';  // production (VPS)

export const APP_CONFIG = {
  APP_NAME: 'CineLink',
  PRIMARY_COLOR: '#C9956C',
  BACKGROUND_COLOR: '#0A0A0A',
};

export const FEATURES = {
  USE_BACKEND_API: true,
};

export const FILTER_TAGS = ['All', 'Actor', 'Director', 'Writer', 'Mumbai', 'Delhi', 'Bollywood'];
export const ROLES = ['Hero', 'Heroine', 'Villain', 'Supporting', 'Child Artist', 'Comedian', 'Any Role'];
export const CATEGORIES = ['Movies', 'Short Films', 'Theatre', 'YouTube / Web', 'TV / OTT'];
export const ROLE_TAGS = ['Lead', 'Supporting', 'Character', 'Theatre', 'Film', 'OTT', 'Web Series', 'Ad Film'];

import { categoryColors } from '../theme';

export const CATEGORY_COLORS = categoryColors;
