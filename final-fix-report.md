# 🎬 CineLink — Firestore Migration Report

**Date:** 2026-07-22
**Status:** Fixing logout + role-based access using MongoDB (not Firestore)

---

## 🔴 Critical Issues Fixed (This Session)

### 1. Logout Not Working
**File:** `screens/SettingsScreen.tsx`
**Cause:** Called `auth().signOut()` directly — only signed out Firebase, left AsyncStorage + AppContext intact.
**Fix:** Now calls `useApp().signOut()` which clears Firebase auth, AsyncStorage tokens, and AppContext state all at once.

### 2. Admin Not Detected After Login (bora1132004@gmail.com)
**File:** `src/context/AppContext.tsx`
**Cause:** `restoreSession()` fetched the profile from backend but returned stale AsyncStorage data instead of the fresh response. The stale data had no `isAdmin` field.
**Fix:** `restoreSession()` now returns the fresh `/users/profile` response from MongoDB.

### 3. Admin Detection No Longer Uses Hardcoded Emails
**File:** `src/context/AppContext.tsx`
- Removed `ADMIN_EMAILS` import and fallback
- `setIsAdmin(data.isAdmin === true)` — pure MongoDB field, no hardcoded fallback
- Removed `ADMIN_EMAIL` and `ADMIN_EMAILS` from `src/api/config.ts`

### 4. AdminReportsScreen Invalid Hook Call
**File:** `screens/AdminReportsScreen.tsx`
**Cause:** `useApp()` was called inside a `useEffect` callback (violates React Rules of Hooks).
**Fix:** Moved `const {isAdmin} = useApp()` to component top level.

### 5. AppContext Infinite Effect Loop
**File:** `src/context/AppContext.tsx`
**Cause:** `useEffect` had `[populateFromUserData, refreshUserData]` dependencies creating circular re-renders.
**Fix:** Used `[]` deps with inline `fetchProfile` call.

---

## 🟡 Backend Enhancements (For Settings + Toggle Storage)

### User Model
Added 3 new fields to `backend/src/models/User.ts`:
- `notificationsEnabled: Boolean, default: true`
- `emailNotifications: Boolean, default: true`  
- `profileVisible: Boolean, default: true`

### User Profile Update Route
Added `notificationsEnabled`, `emailNotifications`, `profileVisible` to the `PUT /api/users/profile` allowed fields.

---

## ⚠️ Remaining Firestore Usage (To Be Migrated)

These files still use Firestore directly — need backend APIs:

| File | Firestore Refs | Priority | APIs Available? |
|------|---------------|----------|----------------|
| `screens/AuditionDetailScreen.tsx` | 26 | 🔴 High | Partially (applications API exists, comments API exists, likes API exists for films only) |
| `screens/HomeScreen.tsx` | 23 | 🔴 High | Partially (feedPosts, films, contests, notifications APIs exist) |
| `screens/ChatScreen.tsx` | 23 | 🔴 High | ✅ Chat API fully exists |
| `screens/ChatListScreen.tsx` | 11 | 🔴 High | ✅ Chat list API exists |
| `screens/SettingsScreen.tsx` | 11 | ✅ Done | ✅ Profile API exists |
| `hooks/usePremiumStatus.ts` | 2 | 🟡 Medium | ✅ Premium API exists |
| `hooks/useUserRole.ts` | 2 | 🟡 Medium | ✅ Profile API exists (dead code anyway) |
| `hooks/usePagination.ts` | 3 | 🟡 Medium | ❌ Pagination not in API yet |
| `screens/CastingRequestScreen.tsx` | 2 | ✅ Done | ✅ Migrated to POST /users/casting-request |
| `utils/spamPrevention.ts` | 5 | 🟢 Low | ❌ Rate limiting not in API |
| `src/services/NotificationService.ts` | 2 | 🟢 Low | ✅ upload/notification-token exists |
| `src/services/offlineService.ts` | 3 | 🟢 Low | N/A (Firestore persistence config) |
