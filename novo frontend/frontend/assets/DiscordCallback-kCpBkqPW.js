/* ========================================
 * DiscordCallback Page
 * Pagina de callback do OAuth Discord
 * Recebe code+state, envia ao backend, exibe resultado
 * ======================================== */

import {
  a as React,
  G as useNavigate,
  N as useSearchParams,
  h as useAuthStore,
  j as jsx,
  ac as Spinner,
  B as Button,
  J as API_BASE_URL,
} from "./index-Bx06KCE-.js";
import {
  F as DiscordIcon,
  l as SCANNER_REDIRECT_PATH,
  f as DISCORD_OAUTH_STATE_COOKIE_KEY,
  j as DISCORD_LINK_RESULT_KEY,
} from "./discord-BL8Te9RE.js";
import "./iconBase-BPc6woXW.js";

/* ---- CheckCircleSolidIcon ---- */
function CheckCircleSolidIconRender(
  { title: titleText, titleId, ...restProps },
  ref,
) {
  return React.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref,
        "aria-labelledby": titleId,
      },
      restProps,
    ),
    titleText ? React.createElement("title", { id: titleId }, titleText) : null,
    React.createElement("path", {
      fillRule: "evenodd",
      d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z",
      clipRule: "evenodd",
    }),
  );
}
const CheckCircleSolidIcon = React.forwardRef(CheckCircleSolidIconRender);

/* ---- ExclamationCircleSolidIcon ---- */
function ExclamationCircleSolidIconRender(
  { title: titleText, titleId, ...restProps },
  ref,
) {
  return React.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref,
        "aria-labelledby": titleId,
      },
      restProps,
    ),
    titleText ? React.createElement("title", { id: titleId }, titleText) : null,
    React.createElement("path", {
      fillRule: "evenodd",
      d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z",
      clipRule: "evenodd",
    }),
  );
}
const ExclamationCircleSolidIcon = React.forwardRef(
  ExclamationCircleSolidIconRender,
);

/* ---- Cookie Helper ---- */
const getCookie = (name) => {
  if (typeof document > "u") return null;
  const found = document.cookie
    .split(";")
    .map((cookiePart) => cookiePart.trim())
    .find((cookiePart) => cookiePart.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : null;
};

/* ---- DiscordCallback Component ---- */
function DiscordCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuthStore();
  const currentOrigin = typeof window < "u" ? window.location.origin : "";

  /* URL parameters */
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const urlError = searchParams.get("error");
  const urlErrorDescription = searchParams.get("error_description");

  /* Component state */
  const [status, setStatus] = React.useState("working");
  const [statusMessage, setStatusMessage] = React.useState(
    "Confirmando autorizacao no Discord...",
  );
  const [detailText, setDetailText] = React.useState(null);

  /* Retrieve stored OAuth state from cookie */
  const storedState = React.useMemo(
    () => getCookie(DISCORD_OAUTH_STATE_COOKIE_KEY),
    [],
  );

  /**
   * Broadcast result to opener window and localStorage.
   */
  const broadcastResult = (result) => {
    const payload = {
      ...result,
      source: "discord-oauth",
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(DISCORD_LINK_RESULT_KEY, JSON.stringify(payload));
    } catch {}
    try {
      window.opener?.postMessage(payload, window.location.origin);
    } catch {}
  };

  /**
   * Set error state and broadcast error result.
   */
  const handleError = (message) => {
    setStatus("error");
    setStatusMessage("Nao foi possivel concluir o vinculo.");
    setDetailText(message);
    broadcastResult({ status: "error", message });
  };

  /* Main effect: exchange code for token */
  React.useEffect(() => {
    let redirectTimer;
    (async () => {
      /* Validate URL params */
      if (urlError) {
        handleError(urlErrorDescription || "Autorizacao cancelada no Discord.");
        return;
      }
      if (!code) {
        handleError("Codigo de autorizacao ausente. Reabra o Discord.");
        return;
      }
      if (!state) {
        handleError("State nao encontrado na URL de retorno.");
        return;
      }
      if (!storedState || storedState !== state) {
        handleError("State invalido ou expirado. Inicie novamente o vinculo.");
        return;
      }

      const authToken = window.localStorage.getItem("authToken");
      if (!authToken) {
        handleError("Necessario estar logado para vincular o Discord.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/discord/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`,
            "X-Discord-State": state,
          },
          credentials: "include",
          redirect: "manual",
          body: JSON.stringify({ code, state }),
        });

        const isOpaqueRedirect = response.type === "opaqueredirect";
        const isRedirect =
          response.status === 303 ||
          response.status === 302 ||
          isOpaqueRedirect;
        const responseData = isOpaqueRedirect
          ? null
          : await response.json().catch(() => null);

        if (!response.ok && !isRedirect) {
          const errorMsg =
            responseData?.message ||
            responseData?.error ||
            "Nao foi possivel vincular seu Discord.";
          throw new Error(errorMsg);
        }

        const discordId =
          responseData?.discordId ||
          responseData?.discord_id ||
          responseData?.user?.discordId ||
          responseData?.user?.discord_id ||
          null;
        const discordUsername =
          responseData?.discordUsername ||
          responseData?.discord_username ||
          responseData?.user?.discordUsername ||
          responseData?.user?.discord_username ||
          null;

        setStatus("success");
        setStatusMessage("Discord vinculado com sucesso.");
        setDetailText(discordUsername || discordId || null);
        broadcastResult({ status: "success", discordId, discordUsername });

        refreshUser().catch(() => {});

        const locationHeader = isOpaqueRedirect
          ? null
          : response.headers.get("Location");
        const performRedirect = (targetUrl) => {
          const url = targetUrl?.trim() || SCANNER_REDIRECT_PATH || "/";
          const isAbsolute = /^https?:\/\//i.test(url);
          if (isAbsolute && currentOrigin && url.startsWith(currentOrigin)) {
            navigate(url.slice(currentOrigin.length) || "/");
            return;
          }
          if (isAbsolute) {
            window.location.assign(url);
            return;
          }
          navigate(url);
        };

        redirectTimer = window.setTimeout(
          () => performRedirect(locationHeader),
          900,
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Nao foi possivel finalizar o vinculo.";
        handleError(errorMsg);
      }
    })();

    return () => {
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [code, state, urlError, urlErrorDescription, storedState]);

  /* Manual navigation button */
  const handleGoBack = () => {
    const path = SCANNER_REDIRECT_PATH;
    if (path?.startsWith("http")) {
      window.location.assign(path);
      return;
    }
    navigate(path);
  };

  /* ---- Render ---- */
  return jsx.jsx("div", {
    className:
      "flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-dark-900",
    children: jsx.jsxs("div", {
      className:
        "w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100 dark:bg-dark-800 dark:ring-white/10",
      children: [
        /* Header */
        jsx.jsxs("div", {
          className: "flex items-center gap-3",
          children: [
            jsx.jsx("div", {
              className:
                "flex size-11 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]",
              children: jsx.jsx(DiscordIcon, { className: "size-5" }),
            }),
            jsx.jsxs("div", {
              children: [
                jsx.jsx("p", {
                  className:
                    "text-lg font-semibold text-gray-900 dark:text-white",
                  children: "Finalizando vinculo com Discord",
                }),
                jsx.jsx("p", {
                  className: "text-sm text-gray-600 dark:text-dark-200",
                  children:
                    "Nao feche esta janela. Estamos sincronizando seus dados.",
                }),
              ],
            }),
          ],
        }),

        /* Status area */
        jsx.jsxs("div", {
          className:
            "mt-5 space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm text-gray-800 shadow-sm dark:border-dark-700 dark:bg-dark-750 dark:text-dark-50",
          children: [
            /* Working state */
            status === "working" &&
              jsx.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  jsx.jsx(Spinner, { className: "h-5 w-5" }),
                  jsx.jsxs("div", {
                    children: [
                      jsx.jsx("p", {
                        className: "font-medium text-gray-900 dark:text-white",
                        children: statusMessage,
                      }),
                      jsx.jsx("p", {
                        className: "text-xs text-gray-500 dark:text-dark-300",
                        children:
                          "Codigo recebido. Validando state e trocando por token no backend.",
                      }),
                    ],
                  }),
                ],
              }),

            /* Success state */
            status === "success" &&
              jsx.jsxs("div", {
                className:
                  "flex items-center gap-3 text-success-600 dark:text-success-400",
                children: [
                  jsx.jsx(CheckCircleSolidIcon, { className: "size-6" }),
                  jsx.jsxs("div", {
                    children: [
                      jsx.jsx("p", {
                        className: "font-semibold",
                        children: statusMessage,
                      }),
                      detailText &&
                        jsx.jsx("p", {
                          className: "text-xs text-gray-600 dark:text-dark-200",
                          children: detailText,
                        }),
                      jsx.jsx("p", {
                        className: "text-xs text-gray-500 dark:text-dark-300",
                        children:
                          "Voce pode fechar esta guia. Estamos atualizando seu perfil.",
                      }),
                    ],
                  }),
                ],
              }),

            /* Error state */
            status === "error" &&
              jsx.jsxs("div", {
                className:
                  "flex items-start gap-3 text-error-600 dark:text-error-400",
                children: [
                  jsx.jsx(ExclamationCircleSolidIcon, {
                    className: "size-6 shrink-0",
                  }),
                  jsx.jsxs("div", {
                    className: "space-y-1",
                    children: [
                      jsx.jsx("p", {
                        className: "font-semibold",
                        children: statusMessage,
                      }),
                      detailText &&
                        jsx.jsx("p", {
                          className: "text-xs text-gray-600 dark:text-dark-200",
                          children: detailText,
                        }),
                      jsx.jsx("p", {
                        className: "text-xs text-gray-500 dark:text-dark-300",
                        children:
                          "Volte para o app e tente novamente. Se o problema persistir, refaca o login.",
                      }),
                    ],
                  }),
                ],
              }),
          ],
        }),

        /* Action button */
        jsx.jsx("div", {
          className: "mt-6 flex justify-end",
          children: jsx.jsx(Button, {
            color: "primary",
            variant: "soft",
            onClick: handleGoBack,
            className: "px-4",
            children: status === "success" ? "Fechar" : "Voltar",
          }),
        }),
      ],
    }),
  });
}

export { DiscordCallback as default };
