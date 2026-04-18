/* ========================================
 * ForgotPassword Page
 * Formulario para solicitar redefinicao de senha
 * ======================================== */

import {
  j as jsx,
  a6 as LogoComponent,
  H as Card,
  I as InputField,
  B as Button,
  L as Link,
  E as axiosInstance,
} from "./index-Bx06KCE-.js";
import {
  u as useForm,
  o as yupResolver,
  c as yupObject,
  a as yupString,
} from "./index.esm-B0FtDp2r.js";
import { t as toast } from "./index-mwGaaYkF.js";
import { P as Page } from "./Page-hVEPjFz_.js";
import { F as EnvelopeIcon } from "./EnvelopeIcon-CcLEeLlf.js";

/* ---- Validation Schema ---- */
const forgotPasswordSchema = yupObject().shape({
  email: yupString()
    .trim()
    .email("E-mail invalido")
    .required("Informe o e-mail cadastrado"),
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

/* ---- ForgotPassword Component ---- */
function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (formData) => {
    const toastId = toast.loading("Enviando solicitacao...");
    try {
      const response = await axiosInstance.post("/auth/forgot", {
        email: formData.email,
      });
      const status = response.data?.status?.toLowerCase() ?? "error";
      const message =
        response.data?.message ??
        "Recebemos sua solicitacao. Se o e-mail existir, enviaremos instrucoes em breve.";

      status === "ok"
        ? toast.success(message, { id: toastId })
        : toast.error(message, { id: toastId });
    } catch (err) {
      toast.error(
        extractErrorMessage(
          err,
          "Nao foi possivel processar sua solicitacao. Tente novamente.",
        ),
        { id: toastId },
      );
    }
  };

  return jsx.jsx(Page, {
    title: "Esqueceu a senha",
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
                    children: "Recuperar senha",
                  }),
                  jsx.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children:
                      "Informe seu e-mail para enviarmos o link de redefinicao.",
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
                  jsx.jsx("div", {
                    className: "space-y-4",
                    children: jsx.jsx(InputField, {
                      label: "E-mail",
                      placeholder: "Digite seu e-mail",
                      type: "email",
                      prefix: jsx.jsx(EnvelopeIcon, {
                        className: "size-5 transition-colors duration-200",
                        strokeWidth: "1",
                      }),
                      ...register("email"),
                      error: errors?.email?.message,
                    }),
                  }),
                  jsx.jsx(Button, {
                    type: "submit",
                    className: "mt-5 w-full",
                    color: "primary",
                    disabled: isSubmitting,
                    children: isSubmitting
                      ? "Enviando..."
                      : "Enviar instrucoes",
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

export { ForgotPassword as default };
