import { ApiHttpError } from './api-http.error';

/** Maps transport failures to safe UI text while retaining validated business messages. */
export function userErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiHttpError) {
    if (error.status === 0 || error.status === 408) {
      return 'La connexion est indisponible. Vérifiez votre réseau puis réessayez.';
    }
    if (error.status === 401) return 'Votre session a expiré. Reconnectez-vous.';
    if (error.status === 403) return 'Vous ne disposez pas des autorisations nécessaires.';
    if (error.status >= 500) return 'Le service rencontre une erreur temporaire. Réessayez dans quelques instants.';
    return safeLocalMessage(error.message) ? error.message.trim() : fallback;
  }

  return fallback;
}

function safeLocalMessage(message: string): boolean {
  return message.length > 0
    && message.length <= 300
    && !/[<>\r\n]|https?:\/\/|exception|stacktrace|bearer\s|eyJ[a-zA-Z0-9_-]+\./i.test(message);
}
