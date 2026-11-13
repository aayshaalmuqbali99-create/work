import "server-only";

/** Development e-mail/password sign-in. Off in production unless explicitly enabled. */
export const devLoginEnabled = () => process.env.FAC_DEV_LOGIN === "true" || (process.env.NODE_ENV !== "production" && process.env.FAC_DEV_LOGIN !== "false");

/** Microsoft Entra ID (Azure AD) single sign-on is configured. */
export const entraEnabled = () => !!(process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET);
