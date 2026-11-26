/**
 * Todos los textos de un idioma, por pantalla (MM-172). El servidor los pide
 * con `getMessages()` y el navegador con `useMessages()`; ninguno los escribe.
 */
import { accountsMessagesByLocale, quickAddMessagesByLocale } from "./money-messages";
import { adminMessagesByLocale } from "./admin-messages";
import { authMessagesByLocale } from "./auth-messages";
import { budgetsMessagesByLocale } from "./budgets-messages";
import { categoriesMessagesByLocale } from "./categories-messages";
import { forecastMessagesByLocale } from "./forecast-messages";
import { goalsMessagesByLocale } from "./goals-messages";
import { LOCALE_TAGS, type Locale } from "./locale";
import { mapMessagesByLocale } from "./map-messages";
import { commonMessages } from "./messages";
import { moneyFlowMessagesByLocale } from "./money-flow-messages";
import { moneyStoryMessagesByLocale } from "./money-story-messages";
import { notificationsMessagesByLocale } from "./notifications-messages";
import { onboardingMessagesByLocale } from "./onboarding-messages";
import { payablesMessagesByLocale } from "./payables-messages";
import { plansMessagesByLocale } from "./plans-messages";
import { recurringMessagesByLocale } from "./recurring-messages";
import { registerMessagesByLocale } from "./register-messages";
import { resetMessagesByLocale } from "./reset-messages";
import { scenariosMessagesByLocale } from "./scenarios-messages";
import { settingsMessagesByLocale } from "./settings-messages";
import { transactionsMessagesByLocale } from "./transactions-messages";
import { transferMessagesByLocale } from "./transfer-messages";
import { voiceMessagesByLocale } from "./voice-messages";

function messagesFor(locale: Locale) {
  return {
    locale,
    /** es-BO, en-US o pt-BR: para `<html lang>` y las fechas. */
    tag: LOCALE_TAGS[locale],
    common: commonMessages[locale],
    accounts: accountsMessagesByLocale[locale],
    admin: adminMessagesByLocale[locale],
    auth: authMessagesByLocale[locale],
    budgets: budgetsMessagesByLocale[locale],
    categories: categoriesMessagesByLocale[locale],
    forecast: forecastMessagesByLocale[locale],
    goals: goalsMessagesByLocale[locale],
    map: mapMessagesByLocale[locale],
    moneyFlow: moneyFlowMessagesByLocale[locale],
    moneyStory: moneyStoryMessagesByLocale[locale],
    notifications: notificationsMessagesByLocale[locale],
    onboarding: onboardingMessagesByLocale[locale],
    payables: payablesMessagesByLocale[locale],
    plans: plansMessagesByLocale[locale],
    quickAdd: quickAddMessagesByLocale[locale],
    recurring: recurringMessagesByLocale[locale],
    register: registerMessagesByLocale[locale],
    reset: resetMessagesByLocale[locale],
    scenarios: scenariosMessagesByLocale[locale],
    settings: settingsMessagesByLocale[locale],
    transactions: transactionsMessagesByLocale[locale],
    transfer: transferMessagesByLocale[locale],
    voice: voiceMessagesByLocale[locale],
  };
}

export type Messages = ReturnType<typeof messagesFor>;

export const catalogs: Record<Locale, Messages> = {
  es: messagesFor("es"),
  en: messagesFor("en"),
  pt: messagesFor("pt"),
};
