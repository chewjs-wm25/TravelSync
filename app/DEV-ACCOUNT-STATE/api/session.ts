/**
 * session.ts — Shim re-export for backward compatibility.
 *
 * The original DEV-ACCOUNT-STATE session logic has been migrated to
 * business_logic_layer/01_User_&_Account_Management/sessionHelper.ts.
 * This file re-exports the same symbols so existing imports
 * (e.g. from Module 03) continue to work without changes.
 */

export {
  getAuthSession,
  requireUser,
  requireAdmin,
  type AuthSession,
  type AuthResult,
} from "@/business_logic_layer/01_User_&_Account_Management/sessionHelper";
