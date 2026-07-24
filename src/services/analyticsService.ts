const noop = async () => {};

export async function trackEvent(_eventName: string, _params?: Record<string, any>) {
  // Firebase Analytics removed — using REST/MongoDB backend only
}

export const trackSignUp = (_method: string) => {};
export const trackLogin = (_method: string) => {};

export const trackPostAudition = () => {};
export const trackApplyAudition = (_auditionId: string) => {};
export const trackUploadFilm = () => {};
export const trackCreateContest = () => {};
export const trackEnterContest = (_contestId: string) => {};
export const trackSendMessage = () => {};
export const trackFollowUser = () => {};

export const trackPurchasePremium = (_tier: string, _amount: number) => {};
export const trackContestPayment = (_contestId: string, _amount: number) => {};

export const trackScreenView = (_screenName: string) => {};
export const trackShare = (_contentType: string) => {};

export const useScreenTracking = (_screenName: string) => {
  // No-op: Firebase Analytics removed
};
