/* ========================================
 * VerifyOtp Page
 * Verificacao de e-mail via codigo OTP de 6 digitos
 * ======================================== */

import {
  N as useSearchParams,
  a4 as REDIRECT_PARAM,
  G as useNavigate,
  h as useAuthStore,
  a as React,
  a5 as DEFAULT_REDIRECT_PATH,
  j as jsx,
  a6 as LogoComponent,
  H as Card,
  e as clsx,
  B as Button,
  L as Link,
  E as axiosInstance,
  aj as setAuthToken,
} from "./index-Bx06KCE-.js";
import { t as toast } from "./index-mwGaaYkF.js";
import { P as Page } from "./Page-hVEPjFz_.js";

/* ---- Constants ---- */
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
const RESEND_STORAGE_PREFIX = "teamop.otp.resendAt";

/* ---- Helpers ---- */

/**
 * Mask an email for display (e.g. "ni***s@gmail.com").
 */
const maskEmail = (email) => {
  if (!email) return "seu email";
  const trimmed = email.trim();
  const [localPart, domain] = trimmed.split("@");
  if (!localPart || !domain) return trimmed;
  const prefix = localPart.slice(0, 2);
  const suffix = localPart.length > 3 ? localPart.slice(-1) : "";
  return `${`${prefix}${localPart.length > 2 ? "***" : ""}${suffix}`}@${domain}`;
};

/**
 * Format seconds as "m:ss".
 */
const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Get the localStorage key for the resend cooldown for a specific email.
 */
const getResendStorageKey = (email) =>
  `${RESEND_STORAGE_PREFIX}:${email.toLowerCase()}`;

/**
 * Get the stored resend-at timestamp from localStorage.
 */
const getStoredResendAt = (email) => {
  if (typeof window > "u") return null;
  try {
    const raw = window.localStorage.getItem(getResendStorageKey(email));
    const timestamp = Number(raw);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
};

/**
 * Store the resend-at timestamp in localStorage.
 */
const storeResendAt = (email, timestamp) => {
  if (typeof window > "u") return;
  try {
    window.localStorage.setItem(getResendStorageKey(email), String(timestamp));
  } catch {}
};

/**
 * Get the remaining cooldown seconds for an email (0 if expired).
 */
const getRemainingCooldown = (email) => {
  const resendAt = getStoredResendAt(email);
  if (!resendAt) return 0;
  const remaining = Math.ceil((resendAt - Date.now()) / 1e3);
  return remaining > 0 ? remaining : 0;
};

/* ---- VerifyOtp Component ---- */
function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get(REDIRECT_PARAM);
  const cleanRedirect =
    redirectParam && redirectParam !== "null" ? redirectParam : null;
  const redirectPath = cleanRedirect ?? DEFAULT_REDIRECT_PATH;
  const navigate = useNavigate();
  const { refreshUser, user, isAuthenticated, isInitialized } = useAuthStore();

  const userEmail = React.useMemo(
    () => (user?.email || "").trim(),
    [user?.email],
  );
  const queryString = React.useMemo(() => {
    const params = new URLSearchParams();
    if (cleanRedirect) params.set(REDIRECT_PARAM, cleanRedirect);
    return params.toString();
  }, [cleanRedirect]);
  const maskedEmail = React.useMemo(() => maskEmail(userEmail), [userEmail]);

  const [otpDigits, setOtpDigits] = React.useState(
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const inputRefs = React.useRef([]);
  const lastEmailRef = React.useRef(null);
  const resendLockRef = React.useRef(false);

  /* Redirect if not authenticated or already verified */
  React.useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      navigate(`/login${queryString ? `?${queryString}` : ""}`, {
        replace: true,
      });
      return;
    }
    if (user?.emailVerified || user?.emailVerifiedAt) {
      navigate(redirectPath, { replace: true });
    }
  }, [
    isAuthenticated,
    isInitialized,
    navigate,
    queryString,
    user?.emailVerified,
    user?.emailVerifiedAt,
    redirectPath,
  ]);

  /* Auto-focus first input */
  React.useEffect(() => {
    if (userEmail) inputRefs.current[0]?.focus();
  }, [userEmail]);

  /* Countdown timer */
  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1e3);
    return () => window.clearInterval(interval);
  }, [cooldownSeconds]);

  const isOtpComplete = otpDigits.every((digit) => digit.length === 1);
  const canSubmit =
    !!userEmail && isOtpComplete && !isVerifying && isAuthenticated;

  /* Update OTP digits and optionally focus a specific input */
  const updateDigits = (newDigits, focusIndex) => {
    setOtpDigits(newDigits);
    setErrorMessage(null);
    if (focusIndex !== undefined) inputRefs.current[focusIndex]?.focus();
  };

  /* Handle digit input */
  const handleInput = (index, rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) {
      const updated = [...otpDigits];
      updated[index] = "";
      updateDigits(updated);
      return;
    }
    if (digitsOnly.length === 1) {
      const updated = [...otpDigits];
      updated[index] = digitsOnly;
      updateDigits(updated, Math.min(index + 1, OTP_LENGTH - 1));
      return;
    }
    /* Multi-digit paste into single field */
    const updated = [...otpDigits];
    let cursorPosition = index;
    digitsOnly.split("").forEach((char) => {
      if (cursorPosition < OTP_LENGTH) {
        updated[cursorPosition] = char;
        cursorPosition += 1;
      }
    });
    updateDigits(updated, Math.min(cursorPosition, OTP_LENGTH - 1));
  };

  /* Handle paste */
  const handlePaste = (index, event) => {
    const pastedText = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pastedText) return;
    event.preventDefault();
    const updated = [...otpDigits];
    let cursorPosition = index;
    pastedText.split("").forEach((char) => {
      if (cursorPosition < OTP_LENGTH) {
        updated[cursorPosition] = char;
        cursorPosition += 1;
      }
    });
    updateDigits(updated, Math.min(cursorPosition, OTP_LENGTH - 1));
  };

  /* Handle keyboard navigation */
  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      if (otpDigits[index]) {
        const updated = [...otpDigits];
        updated[index] = "";
        updateDigits(updated);
        return;
      }
      if (index > 0) {
        const updated = [...otpDigits];
        updated[index - 1] = "";
        updateDigits(updated, index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1)
      inputRefs.current[index + 1]?.focus();
  };

  /* Submit OTP for verification */
  const handleVerify = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setErrorMessage("Sessao expirada. Faca login novamente.");
      navigate(`/login${queryString ? `?${queryString}` : ""}`, {
        replace: true,
      });
      return;
    }
    if (!userEmail) {
      setErrorMessage("E-mail nao informado.");
      return;
    }
    if (!isOtpComplete) {
      setErrorMessage("Informe o codigo completo.");
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);
    const code = otpDigits.join("");

    try {
      const response = await axiosInstance.post("/auth/otp/verify", {
        email: userEmail,
        code,
      });
      const token =
        response.data?.token ||
        response.data?.jwt ||
        response.data?.accessToken;
      if (!token || typeof token != "string") throw new Error("Token ausente.");
      setAuthToken(token);
      await refreshUser();
      toast.success("Email verificado com sucesso.");
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const errorText =
        error && typeof error == "object" && "message" in error
          ? String(error.message)
          : typeof error == "string"
            ? error
            : "Nao foi possivel validar o codigo.";
      toast.error(errorText);
      setErrorMessage(errorText);
    } finally {
      setIsVerifying(false);
    }
  };

  /* Request a new OTP code */
  const requestNewCode = async (options) => {
    if (!isAuthenticated) {
      setErrorMessage("Sessao expirada. Faca login novamente.");
      navigate(`/login${queryString ? `?${queryString}` : ""}`, {
        replace: true,
      });
      return;
    }
    if (!userEmail) {
      setErrorMessage("E-mail nao informado.");
      return;
    }

    const remaining = getRemainingCooldown(userEmail);
    if (remaining > 0) {
      setCooldownSeconds(remaining);
      return;
    }
    if (resendLockRef.current || isResending) return;

    resendLockRef.current = true;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await axiosInstance.post("/auth/otp/request", { email: userEmail });
      storeResendAt(userEmail, Date.now() + RESEND_COOLDOWN_SECONDS * 1e3);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      if (!options?.silent) toast.success("Novo codigo enviado.");
    } catch (error) {
      const errorText =
        error && typeof error == "object" && "message" in error
          ? String(error.message)
          : typeof error == "string"
            ? error
            : "Nao foi possivel enviar o codigo.";
      if (!options?.silent) toast.error(errorText);
      setErrorMessage(errorText);
    } finally {
      setIsResending(false);
      resendLockRef.current = false;
    }
  };

  /* Auto-send OTP on mount (if no active cooldown) */
  React.useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    if (!userEmail) {
      setCooldownSeconds(0);
      return;
    }
    const remaining = getRemainingCooldown(userEmail);
    if (remaining > 0) {
      setCooldownSeconds(remaining);
      return;
    }
    if (lastEmailRef.current !== userEmail) {
      lastEmailRef.current = userEmail;
      requestNewCode({ silent: true });
    }
  }, [userEmail, isAuthenticated, isInitialized]);

  const handleResendClick = async () => {
    await requestNewCode();
  };

  /* ---- Render ---- */
  return jsx.jsx(Page, {
    title: "Verificar codigo",
    children: jsx.jsx("main", {
      className: "min-h-100vh grid w-full grow grid-cols-1 place-items-center",
      children: jsx.jsxs("div", {
        className: "w-full max-w-[28rem] p-4 sm:px-5",
        children: [
          /* Header */
          jsx.jsxs("div", {
            className: "text-center",
            children: [
              jsx.jsx(LogoComponent, { className: "mx-auto size-16" }),
              jsx.jsxs("div", {
                className: "mt-4",
                children: [
                  jsx.jsx("h2", {
                    className:
                      "text-2xl font-semibold text-gray-600 dark:text-dark-100",
                    children: "Verifique seu email",
                  }),
                  jsx.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children: userEmail
                      ? `Enviamos um codigo de 6 digitos para ${maskedEmail}.`
                      : "Nao encontramos um e-mail para validar o codigo.",
                  }),
                ],
              }),
            ],
          }),

          /* OTP Form Card */
          jsx.jsxs(Card, {
            className: "mt-5 rounded-lg p-5 lg:p-7",
            children: [
              jsx.jsxs("form", {
                onSubmit: handleVerify,
                autoComplete: "off",
                children: [
                  /* OTP digit inputs */
                  jsx.jsx("div", {
                    className: "flex items-center justify-center gap-2",
                    children: otpDigits.map((digit, index) =>
                      jsx.jsx(
                        "input",
                        {
                          ref: (inputElement) => {
                            if (inputElement) inputRefs.current[index] = inputElement;
                          },
                          value: digit,
                          onChange: (event) =>
                            handleInput(index, event.target.value),
                          onKeyDown: (event) => handleKeyDown(index, event),
                          onPaste: (event) => handlePaste(index, event),
                          inputMode: "numeric",
                          pattern: "[0-9]*",
                          maxLength: 1,
                          autoComplete: index === 0 ? "one-time-code" : "off",
                          "aria-label": `Digito ${index + 1}`,
                          disabled: !userEmail || isVerifying,
                          className: clsx(
                            "form-input-base form-input h-12 w-11 text-center text-lg font-semibold tracking-wide",
                            errorMessage
                              ? "border-error dark:border-error-lighter"
                              : "border-gray-300 hover:border-gray-400 focus:border-primary-600 dark:border-dark-450 dark:hover:border-dark-400 dark:focus:border-primary-500",
                            (!userEmail || isVerifying) &&
                              "opacity-60 cursor-not-allowed",
                          ),
                        },
                        `otp-${index}`,
                      ),
                    ),
                  }),

                  /* Info / Error messages */
                  !userEmail &&
                    jsx.jsx("p", {
                      className:
                        "mt-3 text-center text-xs text-gray-500 dark:text-dark-300",
                      children: "Solicite um novo codigo para continuar.",
                    }),
                  errorMessage &&
                    jsx.jsx("p", {
                      className:
                        "mt-3 text-center text-xs text-error-600 dark:text-error-400",
                      children: errorMessage,
                    }),

                  /* Submit button */
                  jsx.jsx(Button, {
                    type: "submit",
                    className: "mt-6 w-full",
                    color: "primary",
                    disabled: !canSubmit,
                    children: isVerifying ? "Validando..." : "Confirmar codigo",
                  }),
                ],
              }),

              /* Resend section */
              jsx.jsxs("div", {
                className:
                  "mt-4 flex flex-col items-center gap-2 text-xs-plus text-gray-400 dark:text-dark-300",
                children: [
                  jsx.jsx("p", {
                    className: "text-center",
                    children: "Nao recebeu? Verifique sua caixa de spam.",
                  }),
                  jsx.jsx("button", {
                    type: "button",
                    onClick: handleResendClick,
                    disabled: !userEmail || cooldownSeconds > 0 || isResending,
                    className: clsx(
                      "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      (cooldownSeconds > 0 || !userEmail || isResending) &&
                        "cursor-not-allowed opacity-60",
                    ),
                    children:
                      cooldownSeconds > 0
                        ? `Reenviar codigo em ${formatCountdown(cooldownSeconds)}`
                        : isResending
                          ? "Enviando..."
                          : "Reenviar codigo",
                  }),
                ],
              }),

              /* Navigation links */
              jsx.jsx("div", {
                className: "mt-4 text-center text-xs-plus",
                children: jsx.jsxs("p", {
                  className: "line-clamp-1",
                  children: [
                    jsx.jsx(Link, {
                      className:
                        "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      to: "/login",
                      children: "Voltar para login",
                    }),
                    jsx.jsx("span", {
                      className: "px-2 text-gray-300 dark:text-dark-500",
                      children: "•",
                    }),
                    jsx.jsx(Link, {
                      className:
                        "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      to: "/register",
                      children: "Criar conta",
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      }),
    }),
  });
}

export { VerifyOtp as default };
