/* ========================================
 * ResetPassword Page
 * Formulario para redefinir a senha (via token do e-mail)
 * ======================================== */

import {
  N as useSearchParams,
  G as useNavigate,
  j as jsx,
  a6 as LogoComponent,
  H as Card,
  B as Button,
  L as Link,
  E as axiosInstance,
} from "./index-Bx06KCE-.js";
import {
  u as useForm,
  o as yupResolver,
  c as yupObject,
  a as yupString,
  b as yupRef,
} from "./index.esm-B0FtDp2r.js";
import { t as toast } from "./index-mwGaaYkF.js";
import {
  P as PasswordInput,
  F as LockClosedIcon,
} from "./PasswordInput-l_GnRAOy.js";
import { P as Page } from "./Page-hVEPjFz_.js";
import "./EyeSlashIcon-CsqEf1t-.js";
import "./EyeIcon-CCF3MwDA.js";

/* ---- Validation Schema ---- */
const resetPasswordSchema = yupObject().shape({
  password: yupString()
    .trim()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .required("Informe a nova senha"),
  confirmPassword: yupString()
    .trim()
    .oneOf([yupRef("password")], "As senhas devem ser iguais")
    .required("Confirme a nova senha"),
});

/**
 * Extract error message from an unknown error value.
 */
const extractErrorMessage = (error, fallback) => {
  if (typeof error == "string") return error;
  if (
    error &&
    typeof error == "object" &&
    "message" in error &&
    typeof error.message == "string"
  )
    return error.message;
  return fallback;
};

/* ---- ResetPassword Component ---- */
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (formData) => {
    if (!token) {
      toast.error("Token invalido ou ausente. Use o link do seu e-mail.");
      return;
    }

    const toastId = toast.loading("Atualizando senha...");
    try {
      const response = await axiosInstance.post("/auth/reset", {
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      const status = response.data?.status?.toLowerCase() ?? "error";
      const message =
        response.data?.message ??
        "Senha atualizada. Agora voce ja pode fazer login.";

      status === "ok"
        ? (toast.success(message, { id: toastId }),
          navigate("/login", { replace: true }))
        : toast.error(message, { id: toastId });
    } catch (err) {
      toast.error(
        extractErrorMessage(
          err,
          "Nao foi possivel redefinir a senha. Tente novamente.",
        ),
        { id: toastId },
      );
    }
  };

  return jsx.jsx(Page, {
    title: "Redefinir senha",
    children: jsx.jsx("main", {
      className: "min-h-100vh grid w-full grow grid-cols-1 place-items-center",
      children: jsx.jsxs("div", {
        className: "w-full max-w-[26rem] p-4 sm:px-5",
        children: [
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
                    children: "Redefinir senha",
                  }),
                  jsx.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children: "Crie uma nova senha para sua conta.",
                  }),
                ],
              }),
            ],
          }),
          jsx.jsxs(Card, {
            className: "mt-5 rounded-lg p-5 lg:p-7",
            children: [
              jsx.jsxs("form", {
                onSubmit: handleSubmit(onSubmit),
                autoComplete: "off",
                children: [
                  jsx.jsxs("div", {
                    className: "space-y-4",
                    children: [
                      jsx.jsx(PasswordInput, {
                        label: "Nova senha",
                        placeholder: "Digite a nova senha",
                        prefix: jsx.jsx(LockClosedIcon, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...register("password"),
                        error: errors?.password?.message,
                      }),
                      jsx.jsx(PasswordInput, {
                        label: "Confirmar nova senha",
                        placeholder: "Repita a nova senha",
                        prefix: jsx.jsx(LockClosedIcon, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...register("confirmPassword"),
                        error: errors?.confirmPassword?.message,
                      }),
                    ],
                  }),
                  jsx.jsx(Button, {
                    type: "submit",
                    className: "mt-5 w-full",
                    color: "primary",
                    disabled: isSubmitting,
                    children: isSubmitting
                      ? "Atualizando..."
                      : "Redefinir senha",
                  }),
                ],
              }),
              jsx.jsx("div", {
                className: "mt-4 text-center text-xs-plus",
                children: jsx.jsxs("p", {
                  className: "line-clamp-1",
                  children: [
                    jsx.jsx("span", { children: "Lembrou a senha?" }),
                    " ",
                    jsx.jsx(Link, {
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

export { ResetPassword as default };
