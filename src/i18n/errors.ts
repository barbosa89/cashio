import type { AppTranslator } from "@/i18n/types";
import { en } from "@/i18n/locales/en";

export type AppErrorCode =
  | "generic"
  | "settingsLoad"
  | "settingsSave"
  | "accountSave"
  | "categorySave"
  | "tagSave"
  | "reportGenerate"
  | "shareUnavailable"
  | "invalidReportRange"
  | "reversedReportRange"
  | "futureReportRange"
  | "emptyName"
  | "emptyAccountName"
  | "emptyCategoryName"
  | "emptyTagName"
  | "invalidMonth"
  | "concreteAccountRequired"
  | "invalidAccount"
  | "invalidCategory"
  | "budgetCategoryType"
  | "invalidInitialBalance"
  | "duplicateAccount"
  | "defaultAccountDelete"
  | "accountInUse"
  | "duplicateCategory"
  | "categoryInUse"
  | "duplicateTag"
  | "tagInUse"
  | "invalidAmount"
  | "categoryRequired"
  | "transferMustBeExpense"
  | "sameDestinationAccount"
  | "invalidBudgetAmount"
  | "budgetCategoryMissing"
  | "backupProviderUnavailable"
  | "backupNotFound"
  | "backupWebUnavailable"
  | "tempDirectoryUnavailable"
  | "backupPrepareFailed"
  | "backupHashMismatch"
  | "backupIntegrityFailed"
  | "nativeModuleUnavailable"
  | "driveAndroidOnly"
  | "icloudIosOnly"
  | "signInCancelled"
  | "localFileMissing"
  | "icloudContainerMissing"
  | "icloudUnavailable"
  | "invalidAccountMigration";

export type AppErrorDescriptor = {
  code: AppErrorCode;
  values?: Record<string, number | string>;
};

export class AppError extends Error {
  readonly descriptor: AppErrorDescriptor;

  constructor(
    descriptor: AppErrorDescriptor,
    options?: { cause?: unknown },
  ) {
    super(descriptor.code, options);
    this.name = "AppError";
    this.descriptor = descriptor;
  }
}

export function isAppErrorDescriptor(value: unknown): value is AppErrorDescriptor {
  if (!value || typeof value !== "object") {
    return false;
  }

  const code = (value as Partial<AppErrorDescriptor>).code;
  return typeof code === "string" && code in en.errors;
}

export function getErrorDescriptor(error: unknown): AppErrorDescriptor {
  if (error instanceof AppError) {
    return error.descriptor;
  }

  return { code: "generic" };
}

export function translateError(error: unknown, t: AppTranslator) {
  const descriptor = getErrorDescriptor(error);
  return translateErrorDescriptor(descriptor, t);
}

export function translateErrorDescriptor(
  descriptor: AppErrorDescriptor,
  t: AppTranslator,
) {
  const translate = t as unknown as (
    key: string,
    values?: Record<string, number | string>,
  ) => string;
  return translate(`errors.${descriptor.code}`, descriptor.values);
}
