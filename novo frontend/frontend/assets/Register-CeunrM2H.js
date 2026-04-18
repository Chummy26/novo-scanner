/* ================================================================
 * Register Page — New User Registration
 *
 * Renders a registration form for the Team OP Scanner crypto
 * trading application.  Validates input with Yup, submits via
 * the auth context's `register` function, and navigates to the
 * default authenticated route on success.
 * ================================================================ */

/* ---- Framework & App Imports ---- */
import {
  a as w,           // React
  h as N,           // useAuth (authentication context hook)
  G as v,           // useNavigate (router navigation)
  j as e,           // JSX runtime (jsx / jsxs helpers)
  a6 as b,          // AppLogo component (branding icon)
  H as y,           // Card component (container with shadow/border)
  I as o,           // TextInput component
  B as k,           // Button component
  L as P,           // Link component (router-aware <a>)
  a5 as S,          // DEFAULT_ROUTE constant (post-register redirect)
} from "./index-Bx06KCE-.js";

/* ---- Yup Schema Helpers ---- */
import {
  c as C,           // yup.object
  a as t,           // yup.string
  b as z,           // yup.ref
  u as E,           // useForm (react-hook-form)
  o as I,           // yupResolver
} from "./index.esm-B0FtDp2r.js";

/* ---- Toast Notifications ---- */
import { t as l } from "./index-mwGaaYkF.js";

/* ---- Password Input & Icon ---- */
import { P as c, F as d } from "./PasswordInput-l_GnRAOy.js";

/* ---- Page Layout Wrapper ---- */
import { P as F } from "./Page-hVEPjFz_.js";

/* ---- Icons ---- */
import { F as u } from "./UserIcon-B-URsuU3.js";
import { F as R } from "./EnvelopeIcon-CcLEeLlf.js";
import "./EyeSlashIcon-CsqEf1t-.js";
import "./EyeIcon-CCF3MwDA.js";

/* ================================================================
 * Registration Form Validation Schema (Yup)
 * ================================================================ */

/** Yup validation schema for the registration form fields. */
const registrationSchema = C().shape({
  name: t().trim().required("Informe seu nome."),
  username: t().trim().required("Informe um nome de usuario."),
  email: t()
    .trim()
    .email("Digite um e-mail valido.")
    .required("Informe um e-mail."),
  password: t()
    .trim()
    .min(6, "A senha deve ter ao menos 6 caracteres.")
    .required("Informe uma senha."),
  confirmPassword: t()
    .oneOf([z("password")], "As senhas devem ser iguais.")
    .required("Confirme a senha."),
});

/* ================================================================
 * RegisterPage Component
 * ================================================================ */

/**
 * Registration page component.
 * Renders a form for new user sign-up with name, username,
 * email, password, and password confirmation fields.
 */
function RegisterPage() {
  /* ---- React-Hook-Form Setup ---- */
  const {
      register: registerField,
      handleSubmit: handleFormSubmit,
      formState: { errors: formErrors },
      reset: resetForm,
    } = E({
      resolver: I(registrationSchema),
      defaultValues: {
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      },
    }),
    /* ---- Local State ---- */
    [isSubmitting, setIsSubmitting] = w.useState(false),

    /* ---- Auth & Navigation ---- */
    { register: registerUser } = N(),
    navigate = v(),

    /* ---- Helper Functions ---- */

    /**
     * Extracts a user-friendly error message from an unknown error value.
     * Handles plain strings, Error instances, and objects with a `message` property.
     * @param {unknown} error - The caught error value.
     * @returns {string} A displayable error message string.
     */
    extractErrorMessage = (error) => {
      if (typeof error == "string") return error;
      if (error instanceof Error && error.message) return error.message;
      if (error && typeof error == "object" && "message" in error) {
        const messageValue = error.message;
        if (typeof messageValue == "string") return messageValue;
      }
      return "Nao foi possivel concluir o cadastro.";
    },

    /**
     * Handles form submission: calls the register API, shows feedback
     * via toast notifications, resets the form on success, and navigates
     * to the default authenticated route.
     * @param {object} formData - Validated form data from react-hook-form.
     */
    handleRegistration = async (formData) => {
      setIsSubmitting(true);
      try {
        await registerUser({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });
        l.success("Cadastro realizado! Voce ja pode fazer login.");
        resetForm();
        navigate(S, {
          replace: true,
        });
      } catch (error) {
        l.error(extractErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    };

  /* ---- Render ---- */
  return e.jsx(F, {
    title: "Cadastro",
    children: e.jsx("main", {
      className: "min-h-100vh grid w-full grow grid-cols-1 place-items-center",
      children: e.jsxs("div", {
        className: "w-full max-w-[26rem] p-4 sm:px-5",
        children: [
          /* ---------- Header / Branding ---------- */
          e.jsxs("div", {
            className: "text-center",
            children: [
              e.jsx(b, {
                className:
                  "mx-auto size-16 text-primary-600 dark:text-primary-400",
              }),
              e.jsxs("div", {
                className: "mt-4",
                children: [
                  e.jsx("h2", {
                    className:
                      "text-2xl font-semibold text-gray-600 dark:text-dark-100",
                    children: "Bem vindo ao Team OP Scanner",
                  }),
                  e.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children:
                      "Por favor, preencha os campos abaixo para criar sua conta.",
                  }),
                ],
              }),
            ],
          }),

          /* ---------- Card with Registration Form ---------- */
          e.jsxs(y, {
            className: "mt-5 rounded-lg p-5 lg:p-7",
            children: [
              e.jsxs("form", {
                onSubmit: handleFormSubmit(handleRegistration),
                autoComplete: "off",
                children: [
                  /* -- Form Fields -- */
                  e.jsxs("div", {
                    className: "space-y-4",
                    children: [
                      /* Name input */
                      e.jsx(o, {
                        label: "Nome",
                        placeholder: "Digite seu nome",
                        prefix: e.jsx(u, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...registerField("name"),
                        error: formErrors?.name?.message,
                      }),
                      /* Username input */
                      e.jsx(o, {
                        label: "Usuario",
                        placeholder: "Nome de usuario",
                        prefix: e.jsx(u, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...registerField("username"),
                        error: formErrors?.username?.message,
                      }),
                      /* Email input */
                      e.jsx(o, {
                        label: "E-mail",
                        placeholder: "Digite seu e-mail",
                        type: "email",
                        prefix: e.jsx(R, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...registerField("email"),
                        error: formErrors?.email?.message,
                      }),
                      /* Password input */
                      e.jsx(c, {
                        label: "Senha",
                        placeholder: "Crie uma senha",
                        prefix: e.jsx(d, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...registerField("password"),
                        error: formErrors?.password?.message,
                      }),
                      /* Confirm password input */
                      e.jsx(c, {
                        label: "Confirme a senha",
                        placeholder: "Repita a senha",
                        prefix: e.jsx(d, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...registerField("confirmPassword"),
                        error: formErrors?.confirmPassword?.message,
                      }),
                    ],
                  }),

                  /* -- Submit Button -- */
                  e.jsx(k, {
                    type: "submit",
                    className: "mt-6 w-full",
                    color: "primary",
                    disabled: isSubmitting,
                    children: isSubmitting ? "Enviando..." : "Criar conta",
                  }),
                ],
              }),

              /* ---------- Login Link ---------- */
              e.jsx("div", {
                className: "mt-6 text-center text-xs-plus",
                children: e.jsxs("p", {
                  children: [
                    "Ja tem uma conta?",
                    " ",
                    e.jsx(P, {
                      className:
                        "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      to: "/login",
                      children: "Entrar",
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
export { RegisterPage as default };
