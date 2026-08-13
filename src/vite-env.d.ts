/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** `major.minor` do package.json + contagem de commits (ver appVersion no vite.config). */
declare const __APP_VERSION__: string;
/** Commit curto do build — aparece no title da versão, para suporte. */
declare const __APP_COMMIT__: string;
/** ISO da hora do build. */
declare const __APP_BUILT_AT__: string;
