import {useApp} from '../src/context/AppContext';

export function useUserRole() {
  const {role, isAdmin, isApprovedDirector} = useApp();
  const r = role?.toLowerCase() || 'actor';

  return {
    role: r,
    isActor: r === 'actor',
    isDirector: r === 'director',
    isAdmin: isAdmin || r === 'admin',
    canPostAudition: isApprovedDirector || isAdmin || r === 'director',
    canQuickPost: isAdmin,
  };
}
