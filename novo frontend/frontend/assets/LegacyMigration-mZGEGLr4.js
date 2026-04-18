/* ---- Imports ---- */
import {
  h as he,
  N as ye,
  G as be,
  a4 as ke,
  a as i,
  j as a,
  a6 as we,
  H as ve,
  e as V,
  I as Z,
  B as z,
  L as je,
  E as F,
  aj as Ne,
  a5 as Ee,
} from "./index-Bx06KCE-.js";
import {
  u as Se,
  o as Pe,
  c as Re,
  a as T,
  b as Ie,
} from "./index.esm-B0FtDp2r.js";
import { t as u } from "./index-mwGaaYkF.js";
import { P as q, F as B } from "./PasswordInput-l_GnRAOy.js";
import { P as De } from "./Page-hVEPjFz_.js";
import { F as ee } from "./EnvelopeIcon-CcLEeLlf.js";
import { F as Ce } from "./ArrowPathIcon-Ek2z4Juv.js";
import "./EyeSlashIcon-CsqEf1t-.js";
import "./EyeIcon-CCF3MwDA.js";

/* ---- Password Migration Form Schema ---- */
const migrationSchema = Re().shape({
    oldPassword: T().trim().required("Informe a senha antiga"),
    newPassword: T()
      .trim()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres")
      .required("Informe a nova senha"),
    confirmPassword: T()
      .trim()
      .oneOf([Ie("newPassword")], "As senhas devem ser iguais")
      .required("Confirme a nova senha"),
  }),
  /* ---- Error Message Parser ---- */
  parseErrorMessage = (errorValue, fallbackMessage) => {
    if (typeof errorValue == "string") {
      return errorValue;
    }
    if (
      errorValue &&
      typeof errorValue == "object" &&
      "message" in errorValue &&
      typeof errorValue.message == "string"
    ) {
      return errorValue.message;
    }
    return fallbackMessage;
  },
  /* ---- OTP Configuration Constants ---- */
  OTP_LENGTH = 6,
  OTP_RESEND_COOLDOWN = 30,
  STORAGE_KEY_PREFIX = "teamop.otp.resendAt",
  /* ---- Email Masking Utility ---- */
  maskEmail = (emailAddress) => {
    if (!emailAddress) return "seu email";
    const trimmed = emailAddress.trim(),
      [localPart, domain] = trimmed.split("@");
    if (!localPart || !domain) return trimmed;
    const prefix = localPart.slice(0, 2),
      suffix = localPart.length > 3 ? localPart.slice(-1) : "";
    return `${`${prefix}${localPart.length > 2 ? "***" : ""}${suffix}`}@${domain}`;
  },
  /* ---- Timer Formatting Utility ---- */
  formatSeconds = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60),
      seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  },
  /* ---- LocalStorage Key Builder ---- */
  getStorageKey = (emailAddress) =>
    `${STORAGE_KEY_PREFIX}:${emailAddress.toLowerCase()}`,
  /* ---- Read Stored Resend Timestamp ---- */
  getStoredTimestamp = (emailAddress) => {
    if (typeof window > "u") return null;
    try {
      const raw = window.localStorage.getItem(getStorageKey(emailAddress)),
        parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  /* ---- Save Resend Timestamp to LocalStorage ---- */
  setStoredTimestamp = (emailAddress, timestamp) => {
    if (!(typeof window > "u"))
      try {
        window.localStorage.setItem(
          getStorageKey(emailAddress),
          String(timestamp),
        );
      } catch {}
  },
  /* ---- Compute Remaining Cooldown Seconds ---- */
  getRemainingCooldown = (emailAddress) => {
    const storedTimestamp = getStoredTimestamp(emailAddress);
    if (!storedTimestamp) return 0;
    const remainingSeconds = Math.ceil((storedTimestamp - Date.now()) / 1e3);
    return remainingSeconds > 0 ? remainingSeconds : 0;
  };

/* ---- Legacy Migration Page Component ---- */
function LegacyMigration() {
  const { user: currentUser, refreshUser: refreshUser } = he(),
    [searchParams] = ye(),
    navigate = be(),
    redirectParam = searchParams.get(ke),
    redirectTarget =
      redirectParam && redirectParam !== "null" ? redirectParam : Ee,
    isLegacyUser =
      currentUser?.oldId != null && currentUser?.firstLogin == null,
    /* ---- Email State ---- */
    [email, setEmail] = i.useState(currentUser?.email ?? ""),
    [validatedEmail, setValidatedEmail] = i.useState(null),
    /* ---- Step Navigation State ---- */
    [currentStep, setCurrentStep] = i.useState("email"),
    /* ---- OTP Input State ---- */
    [otpValues, setOtpValues] = i.useState(
      Array.from(
        {
          length: OTP_LENGTH,
        },
        () => "",
      ),
    ),
    [statusError, setStatusError] = i.useState(null),
    [resendTimer, setResendTimer] = i.useState(0),
    [isSendingOtp, setIsSendingOtp] = i.useState(false),
    [isValidatingOtp, setIsValidatingOtp] = i.useState(false),
    /* ---- Refs ---- */
    otpInputRefs = i.useRef([]),
    isRequestPendingRef = i.useRef(false),
    /* ---- React Hook Form Setup ---- */
    {
      register: register,
      handleSubmit: handleSubmit,
      formState: { errors: formErrors, isSubmitting: isSubmitting },
    } = Se({
      resolver: Pe(migrationSchema),
      defaultValues: {
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
    }),
    /* ---- Derived / Memoized Values ---- */
    formattedFirstLogin = i.useMemo(() => {
      if (!currentUser?.firstLogin) return null;
      const dateObj = new Date(currentUser.firstLogin);
      return Number.isNaN(dateObj.getTime())
        ? currentUser.firstLogin
        : dateObj.toLocaleString("pt-BR");
    }, [currentUser?.firstLogin]),
    trimmedEmail = i.useMemo(() => email.trim(), [email]),
    maskedEmail = i.useMemo(
      () => maskEmail(validatedEmail || trimmedEmail),
      [trimmedEmail, validatedEmail],
    ),
    isOtpComplete = otpValues.every((item) => item.length === 1),
    canVerify = !!trimmedEmail && isOtpComplete && !isValidatingOtp,
    isEmailValidated = !!validatedEmail,
    canResend = !!trimmedEmail && resendTimer <= 0 && !isSendingOtp,
    canSubmitMigration = isLegacyUser && isEmailValidated && !isSubmitting;

  /* ---- Resend Countdown Timer Effect ---- */
  i.useEffect(() => {
    if (resendTimer <= 0) return;
    const intervalId = window.setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1e3);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [resendTimer]);

  /* ---- Initialize Timer from LocalStorage ---- */
  i.useEffect(() => {
    const remaining = trimmedEmail ? getRemainingCooldown(trimmedEmail) : 0;
    setResendTimer(remaining);
  }, [trimmedEmail]);

  /* ---- Sync Email from User Profile ---- */
  i.useEffect(() => {
    if (!email && currentUser?.email) {
      setEmail(currentUser.email);
    }
  }, [email, currentUser?.email]);

  /* ---- Auto-advance if Email Already Verified ---- */
  i.useEffect(() => {
    const userEmail = (currentUser?.email || "").trim();
    if (
      userEmail &&
      (currentUser?.emailVerified || currentUser?.emailVerifiedAt) &&
      trimmedEmail &&
      userEmail.toLowerCase() === trimmedEmail.toLowerCase()
    ) {
      (setValidatedEmail(userEmail), setCurrentStep("migrate"));
    }
  }, [
    trimmedEmail,
    currentUser?.email,
    currentUser?.emailVerified,
    currentUser?.emailVerifiedAt,
  ]);

  /* ---- Reset OTP State Handler ---- */
  const resetOtpState = i.useCallback(() => {
      setOtpValues(
        Array.from(
          {
            length: OTP_LENGTH,
          },
          () => "",
        ),
      );
      setStatusError(null);
      setResendTimer(0);
    }, []),
    /* ---- Email Change Handler ---- */
    handleEmailChange = (newEmail) => {
      setEmail(newEmail);
      setValidatedEmail(null);
      setCurrentStep("email");
      resetOtpState();
    },
    /* ---- OTP Update and Focus Helper ---- */
    syncOtpAndFocus = (newOtpValues, focusIndex) => {
      setOtpValues(newOtpValues);
      setStatusError(null);
      if (focusIndex !== undefined) {
        otpInputRefs.current[focusIndex]?.focus();
      }
    },
    /* ---- OTP Single Digit Input Handler ---- */
    handleOtpInputChange = (digitIndex, rawValue) => {
      const digitsOnly = rawValue.replace(/\D/g, "");
      if (!digitsOnly) {
        const updated = [...otpValues];
        updated[digitIndex] = "";
        syncOtpAndFocus(updated);
        return;
      }
      if (digitsOnly.length === 1) {
        const updated = [...otpValues];
        updated[digitIndex] = digitsOnly;
        const nextIndex = Math.min(digitIndex + 1, OTP_LENGTH - 1);
        syncOtpAndFocus(updated, nextIndex);
        return;
      }
      const updated = [...otpValues];
      let cursor = digitIndex;
      digitsOnly.split("").forEach((item) => {
        if (cursor < OTP_LENGTH) {
          ((updated[cursor] = item), (cursor += 1));
        }
      });
      const lastIndex = Math.min(cursor, OTP_LENGTH - 1);
      syncOtpAndFocus(updated, lastIndex);
    },
    /* ---- OTP Paste Handler ---- */
    handleOtpPaste = (startIndex, pasteEvent) => {
      const pastedDigits = pasteEvent.clipboardData
        .getData("text")
        .replace(/\D/g, "");
      if (!pastedDigits) return;
      pasteEvent.preventDefault();
      const updated = [...otpValues];
      let cursor = startIndex;
      pastedDigits.split("").forEach((item) => {
        if (cursor < OTP_LENGTH) {
          ((updated[cursor] = item), (cursor += 1));
        }
      });
      const lastIndex = Math.min(cursor, OTP_LENGTH - 1);
      syncOtpAndFocus(updated, lastIndex);
    },
    /* ---- OTP Keyboard Navigation Handler ---- */
    handleOtpKeyDown = (digitIndex, keyEvent) => {
      if (keyEvent.key === "Backspace") {
        if (otpValues[digitIndex]) {
          const updated = [...otpValues];
          updated[digitIndex] = "";
          syncOtpAndFocus(updated);
          return;
        }
        if (digitIndex > 0) {
          const updated = [...otpValues];
          updated[digitIndex - 1] = "";
          syncOtpAndFocus(updated, digitIndex - 1);
        }
        return;
      }
      if (keyEvent.key === "ArrowLeft" && digitIndex > 0) {
        otpInputRefs.current[digitIndex - 1]?.focus();
      }
      if (keyEvent.key === "ArrowRight" && digitIndex < OTP_LENGTH - 1) {
        otpInputRefs.current[digitIndex + 1]?.focus();
      }
    },
    /* ---- Request OTP Code (API Call) ---- */
    requestOtp = async () => {
      const targetEmail = trimmedEmail;
      if (!targetEmail) {
        setStatusError("Informe um e-mail valido.");
        return;
      }
      const remaining = getRemainingCooldown(targetEmail);
      if (remaining > 0) {
        setResendTimer(remaining);
        return;
      }
      if (!(isRequestPendingRef.current || isSendingOtp)) {
        isRequestPendingRef.current = true;
        setIsSendingOtp(true);
        setStatusError(null);
        try {
          await F.post("/auth/otp/request", {
            email: targetEmail,
          });
          setStoredTimestamp(
            targetEmail,
            Date.now() + OTP_RESEND_COOLDOWN * 1e3,
          );
          setResendTimer(OTP_RESEND_COOLDOWN);
          otpInputRefs.current[0]?.focus();
          u.success(`Codigo enviado para ${maskEmail(targetEmail)}.`);
        } catch (error) {
          const errorMessage =
            error && typeof error == "object" && "message" in error
              ? String(error.message)
              : typeof error == "string"
                ? error
                : "Nao foi possivel enviar o codigo.";
          u.error(errorMessage);
          setStatusError(errorMessage);
        } finally {
          setIsSendingOtp(false);
          isRequestPendingRef.current = false;
        }
      }
    },
    /* ---- Verify OTP Code (API Call) ---- */
    verifyOtp = async () => {
      const targetEmail = trimmedEmail;
      if (!targetEmail) {
        setStatusError("Informe um e-mail valido.");
        return;
      }
      if (!isOtpComplete) {
        setStatusError("Informe o codigo completo.");
        return;
      }
      setIsValidatingOtp(true);
      const otpCode = otpValues.join("");
      try {
        const response = await F.post("/auth/otp/verify", {
            email: targetEmail,
            code: otpCode,
          }),
          authToken =
            response.data?.token ||
            response.data?.jwt ||
            response.data?.accessToken;
        if (authToken && typeof authToken == "string") {
          Ne(authToken);
        }
        const confirmedEmail = (
          (await refreshUser())?.email || targetEmail
        ).trim();
        setValidatedEmail(confirmedEmail);
        setCurrentStep("migrate");
        setStatusError(null);
        u.success("E-mail validado. Voce pode concluir a migracao.");
      } catch (error) {
        const errorMessage =
          error && typeof error == "object" && "message" in error
            ? String(error.message)
            : typeof error == "string"
              ? error
              : "Nao foi possivel validar o codigo.";
        u.error(errorMessage);
        setStatusError(errorMessage);
      } finally {
        setIsValidatingOtp(false);
      }
    },
    /* ---- Perform Legacy Migration (API Call) ---- */
    performMigration = async (formData) => {
      const emailToMigrate = validatedEmail || trimmedEmail;
      if (!emailToMigrate) {
        u.error("Valide seu e-mail para continuar.");
        setCurrentStep("email");
        return;
      }
      if (!isEmailValidated) {
        u.error("Valide seu e-mail para continuar.");
        setCurrentStep("email");
        return;
      }
      if (!isLegacyUser) {
        u.error("Nenhuma migracao pendente para este usuario.");
        return;
      }
      const loadingToastId = u.loading("Migrando dados...");
      try {
        const storedAuthToken =
            typeof window < "u"
              ? window.localStorage.getItem("authToken")
              : null,
          requestPayload = {
            email: emailToMigrate,
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
            firstLogin: currentUser?.firstLogin,
          },
          requestConfig = storedAuthToken
            ? {
                headers: {
                  Authorization: `Bearer ${storedAuthToken}`,
                },
              }
            : undefined;
        await F.post("/auth/login/legacy", requestPayload, requestConfig);
        const refreshedUser = await refreshUser();
        if (refreshedUser?.oldId != null && refreshedUser?.firstLogin == null) {
          u.error("Nao foi possivel concluir a migracao. Tente novamente.", {
            id: loadingToastId,
          });
          return;
        }
        u.success("Dados migrados com sucesso.", {
          id: loadingToastId,
        });
        navigate(redirectTarget, {
          replace: true,
        });
      } catch (error) {
        u.error(
          parseErrorMessage(
            error,
            "Nao foi possivel migrar seus dados. Tente novamente.",
          ),
          {
            id: loadingToastId,
          },
        );
      }
    };

  /* ---- Component Render ---- */
  return a.jsx(De, {
    title: "Migrar dados antigos",
    children: a.jsx("main", {
      className: "min-h-100vh grid w-full grow grid-cols-1 place-items-center",
      children: a.jsxs("div", {
        className: "w-full max-w-[26rem] p-4 sm:px-5",
        children: [
          /* ---- Page Header & Legacy User Info ---- */
          a.jsxs("div", {
            className: "text-center",
            children: [
              a.jsx(we, {
                className: "mx-auto size-16",
              }),
              a.jsxs("div", {
                className: "mt-4",
                children: [
                  a.jsx("h2", {
                    className:
                      "text-2xl font-semibold text-gray-600 dark:text-dark-100",
                    children: "Migrar dados antigos",
                  }),
                  a.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children:
                      "Atualize suas credenciais para continuar no novo sistema.",
                  }),
                ],
              }),
              isLegacyUser
                ? a.jsxs("div", {
                    className:
                      "mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-left text-xs text-gray-500 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-200",
                    children: [
                      a.jsx("p", {
                        children:
                          "Encontramos seu cadastro antigo. Informe os dados abaixo para concluir a migracao.",
                      }),
                      a.jsx("div", {
                        className: "mt-2 space-y-1",
                        children:
                          formattedFirstLogin &&
                          a.jsxs("p", {
                            children: [
                              a.jsx("span", {
                                className:
                                  "font-semibold text-gray-600 dark:text-dark-100",
                                children: "Primeiro login:",
                              }),
                              " ",
                              formattedFirstLogin,
                            ],
                          }),
                      }),
                    ],
                  })
                : a.jsx("p", {
                    className: "mt-4 text-xs text-gray-400 dark:text-dark-300",
                    children:
                      "Nenhuma migracao pendente foi encontrada para este usuario.",
                  }),
            ],
          }),

          /* ---- Card Container with Step Indicator ---- */
          a.jsxs(ve, {
            className: "mt-5 rounded-lg p-5 lg:p-7",
            children: [
              /* ---- Step Indicator (Email / Migrate) ---- */
              a.jsx("div", {
                className: "mb-6 flex items-center justify-between gap-3",
                children: [
                  {
                    key: "email",
                    label: "Validar e-mail",
                  },
                  {
                    key: "migrate",
                    label: "Migrar dados",
                  },
                ].map((stepItem, stepIndex, stepsArray) => {
                  const isActive = currentStep === stepItem.key,
                    isCompleted =
                      stepItem.key === "email" ? isEmailValidated : false;
                  return a.jsxs(
                    "div",
                    {
                      className: "flex flex-1 items-center gap-2",
                      children: [
                        a.jsx("div", {
                          className: V(
                            "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                            isCompleted
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/70 dark:bg-emerald-900/30 dark:text-emerald-100"
                              : isActive
                                ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400/70 dark:bg-primary-900/30 dark:text-primary-100"
                                : "border-gray-200 bg-gray-50 text-gray-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300",
                          ),
                          children: stepIndex + 1,
                        }),
                        a.jsx("div", {
                          className: "flex flex-col",
                          children: a.jsx("span", {
                            className:
                              "text-sm font-semibold text-gray-900 dark:text-dark-50",
                            children: stepItem.label,
                          }),
                        }),
                        stepIndex < stepsArray.length - 1 &&
                          a.jsx("div", {
                            className:
                              "hidden flex-1 border-t border-dashed border-gray-200 last:hidden sm:block dark:border-dark-600",
                          }),
                      ],
                    },
                    stepItem.key,
                  );
                }),
              }),

              /* ---- Step 1: Email Validation with OTP ---- */
              currentStep === "email" &&
                a.jsxs("form", {
                  onSubmit: (event) => {
                    event.preventDefault();
                    verifyOtp();
                  },
                  autoComplete: "off",
                  className: "space-y-5",
                  children: [
                    /* ---- Email Input Field ---- */
                    a.jsx(Z, {
                      label: "E-mail para validar",
                      placeholder: "Digite seu e-mail",
                      type: "email",
                      value: email,
                      onChange: (event) =>
                        handleEmailChange(event.target.value),
                      prefix: a.jsx(ee, {
                        className: "size-5 transition-colors duration-200",
                        strokeWidth: "1",
                      }),
                    }),
                    a.jsxs("p", {
                      className: "text-xs text-gray-500 dark:text-dark-300",
                      children: [
                        "Enviaremos um codigo de 6 digitos para ",
                        maskedEmail,
                        ". Valide antes de concluir a migracao.",
                      ],
                    }),

                    /* ---- OTP Digit Inputs ---- */
                    a.jsx("div", {
                      className: "flex items-center justify-center gap-2",
                      children: otpValues.map((digitValue, digitIndex) =>
                        a.jsx(
                          "input",
                          {
                            ref: (inputElement) => {
                              if (inputElement) {
                                otpInputRefs.current[digitIndex] = inputElement;
                              }
                            },
                            value: digitValue,
                            onChange: (event) =>
                              handleOtpInputChange(
                                digitIndex,
                                event.target.value,
                              ),
                            onKeyDown: (keyEvent) =>
                              handleOtpKeyDown(digitIndex, keyEvent),
                            onPaste: (pasteEvent) =>
                              handleOtpPaste(digitIndex, pasteEvent),
                            inputMode: "numeric",
                            pattern: "[0-9]*",
                            maxLength: 1,
                            "aria-label": `Digito ${digitIndex + 1}`,
                            className: V(
                              "form-input-base form-input h-12 w-11 text-center text-lg font-semibold tracking-wide",
                              statusError
                                ? "border-error dark:border-error-lighter"
                                : "border-gray-300 hover:border-gray-400 focus:border-primary-600 dark:border-dark-450 dark:hover:border-dark-400 dark:focus:border-primary-500",
                            ),
                          },
                          `otp-${digitIndex}`,
                        ),
                      ),
                    }),

                    /* ---- OTP Error Message ---- */
                    statusError &&
                      a.jsx("p", {
                        className:
                          "text-center text-xs text-error-600 dark:text-error-400",
                        children: statusError,
                      }),

                    /* ---- Resend & Verify Buttons ---- */
                    a.jsxs("div", {
                      className: "mt-4 flex w-full items-center gap-3",
                      children: [
                        a.jsx(z, {
                          type: "button",
                          variant: "soft",
                          color: "neutral",
                          isIcon: true,
                          onClick: () => {
                            requestOtp();
                          },
                          disabled: !canResend,
                          className: "size-9 shrink-0 rounded-lg",
                          title:
                            resendTimer > 0
                              ? `Aguarde ${formatSeconds(resendTimer)}`
                              : "Enviar código",
                          children: a.jsx(Ce, {
                            className: V(
                              "size-5",
                              isSendingOtp && "animate-spin",
                            ),
                          }),
                        }),
                        a.jsx(z, {
                          type: "submit",
                          color: "primary",
                          disabled: !canVerify,
                          className: "flex-1 whitespace-nowrap",
                          children: isValidatingOtp
                            ? "Validando..."
                            : "Validar e Continuar",
                        }),
                      ],
                    }),

                    /* ---- Resend Cooldown Message ---- */
                    a.jsx("div", {
                      className:
                        "mt-2 text-center text-xs text-gray-500 dark:text-dark-300",
                      children:
                        resendTimer > 0
                          ? `Aguarde ${formatSeconds(resendTimer)} para reenviar.`
                          : "Caso não tenha recebido, clique no botão para reenviar.",
                    }),
                  ],
                }),

              /* ---- Step 2: Password Migration Form ---- */
              currentStep === "migrate" &&
                a.jsxs("form", {
                  onSubmit: handleSubmit(performMigration),
                  autoComplete: "off",
                  children: [
                    a.jsxs("div", {
                      className: "space-y-4",
                      children: [
                        /* ---- Validated Email Confirmation Banner ---- */
                        a.jsxs("div", {
                          className:
                            "flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-100",
                          children: [
                            a.jsxs("span", {
                              children: [
                                "E-mail validado:",
                                " ",
                                a.jsx("span", {
                                  className: "font-semibold",
                                  children: maskedEmail,
                                }),
                              ],
                            }),
                            a.jsx("button", {
                              type: "button",
                              onClick: () => {
                                setValidatedEmail(null);
                                setCurrentStep("email");
                                resetOtpState();
                              },
                              className:
                                "font-semibold text-primary-700 hover:underline dark:text-primary-200",
                              children: "Alterar",
                            }),
                          ],
                        }),

                        /* ---- Read-Only Email Display ---- */
                        a.jsx(Z, {
                          label: "E-mail validado",
                          placeholder: "E-mail validado",
                          type: "email",
                          value: validatedEmail || trimmedEmail,
                          readOnly: true,
                          disabled: true,
                          prefix: a.jsx(ee, {
                            className: "size-5 transition-colors duration-200",
                            strokeWidth: "1",
                          }),
                        }),

                        /* ---- Old Password Field ---- */
                        a.jsx(q, {
                          label: "Senha antiga",
                          placeholder: "Digite sua senha antiga",
                          prefix: a.jsx(B, {
                            className: "size-5 transition-colors duration-200",
                            strokeWidth: "1",
                          }),
                          ...register("oldPassword"),
                          error: formErrors?.oldPassword?.message,
                        }),

                        /* ---- New Password Field ---- */
                        a.jsx(q, {
                          label: "Nova senha",
                          placeholder: "Digite a nova senha",
                          prefix: a.jsx(B, {
                            className: "size-5 transition-colors duration-200",
                            strokeWidth: "1",
                          }),
                          ...register("newPassword"),
                          error: formErrors?.newPassword?.message,
                        }),

                        /* ---- Confirm New Password Field ---- */
                        a.jsx(q, {
                          label: "Confirmar nova senha",
                          placeholder: "Repita a nova senha",
                          prefix: a.jsx(B, {
                            className: "size-5 transition-colors duration-200",
                            strokeWidth: "1",
                          }),
                          ...register("confirmPassword"),
                          error: formErrors?.confirmPassword?.message,
                        }),
                      ],
                    }),

                    /* ---- Submit Migration Button ---- */
                    a.jsx(z, {
                      type: "submit",
                      className: "mt-5 w-full",
                      color: "primary",
                      disabled: !canSubmitMigration,
                      children: isSubmitting ? "Migrando..." : "Migrar dados",
                    }),
                  ],
                }),

              /* ---- Footer Help Link ---- */
              a.jsx("div", {
                className: "mt-4 text-center text-xs-plus",
                children: a.jsxs("p", {
                  className: "line-clamp-1",
                  children: [
                    a.jsx("span", {
                      children: "Precisa de ajuda?",
                    }),
                    " ",
                    a.jsx(je, {
                      className:
                        "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      to: "/login",
                      children: "Voltar para login",
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

/* ---- Module Export ---- */
export { LegacyMigration as default };
