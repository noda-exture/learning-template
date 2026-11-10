// 検証用Cookieです。Adobe FPIDとの連携は別途実装します。
export const cookieConfig = {
  enabled: true, name: 'lab_fpid', maxAge: 60 * 60 * 24 * 365,
  httpOnly: true, sameSite: 'Lax', secure: 'auto', path: '/',
};
