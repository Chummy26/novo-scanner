/* ========================================
 * Login Page
 * Formulario de autenticacao (usuario + senha)
 * ======================================== */

import {
  h as useAuthStore,
  u as useThemeStore,
  N as useSearchParams,
  G as useNavigate,
  a4 as REDIRECT_PARAM,
  a as React,
  a5 as DEFAULT_REDIRECT_PATH,
  j as jsx,
  a6 as LogoDark,
  H as Card,
  I as InputField,
  D as Checkbox,
  L as Link,
  B as Button,
} from "./index-Bx06KCE-.js";
import {
  c as yupObject,
  a as yupString,
  u as useForm,
  o as yupResolver,
} from "./index.esm-B0FtDp2r.js";
import { t as toast } from "./index-mwGaaYkF.js";
import { S as LogoLight } from "./teamopLogoBlack-DzW8yP3A.js";
import {
  P as PasswordInput,
  F as LockClosedIcon,
} from "./PasswordInput-l_GnRAOy.js";
import { P as Page } from "./Page-hVEPjFz_.js";
import { F as EnvelopeIcon } from "./EnvelopeIcon-CcLEeLlf.js";
import "./EyeSlashIcon-CsqEf1t-.js";
import "./EyeIcon-CCF3MwDA.js";

/* ---- Validation Schema ---- */
const loginSchema = yupObject().shape({
  username: yupString().trim().required("Usuário é obrigatório"),
  password: yupString().trim().required("Senha é obrigatória"),
});

/* ---- Login Page Component ---- */
function LoginPage() {
  const { login, errorMessage, isAuthenticated, user } = useAuthStore();
  const { isDark } = useThemeStore();
  const Logo = isDark ? LogoDark : LogoLight;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectParam = searchParams.get(REDIRECT_PARAM);
  const redirectPath =
    redirectParam && redirectParam !== "null"
      ? redirectParam
      : DEFAULT_REDIRECT_PATH;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const [hasAttemptedLogin, setHasAttemptedLogin] = React.useState(false);

  const onSubmit = (formData) => {
    setHasAttemptedLogin(true);
    login({
      username: formData.username,
      password: formData.password,
    });
  };

  /* Show error toast */
  React.useEffect(() => {
    if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage]);

  /* Handle post-login redirect */
  React.useEffect(() => {
    if (!hasAttemptedLogin || !isAuthenticated) return;

    /* Legacy user migration */
    if (user?.oldId != null && user?.firstLogin == null) {
      const params = new URLSearchParams();
      if (redirectParam) params.set(REDIRECT_PARAM, redirectParam);
      const qs = params.toString();
      navigate(`/legacy-migration${qs ? `?${qs}` : ""}`, { replace: true });
      return;
    }

    /* Email verification check */
    if (user?.emailVerified === true || !!user?.emailVerifiedAt) {
      navigate(redirectPath, { replace: true });
      return;
    }

    /* Redirect to OTP verification */
    const params = new URLSearchParams();
    if (redirectParam) params.set(REDIRECT_PARAM, redirectParam);
    const qs = params.toString();
    navigate(`/verify-otp${qs ? `?${qs}` : ""}`, { replace: true });
  }, [
    hasAttemptedLogin,
    isAuthenticated,
    navigate,
    redirectParam,
    redirectPath,
    user,
  ]);

  return jsx.jsx(Page, {
    title: "Login",
    children: jsx.jsx("main", {
      className: "min-h-100vh grid w-full grow grid-cols-1 place-items-center",
      children: jsx.jsxs("div", {
        className: "w-full max-w-[26rem] p-4 sm:px-5",
        children: [
          /* Header */
          jsx.jsxs("div", {
            className: "text-center",
            children: [
              jsx.jsx(Logo, { className: "mx-auto size-16" }),
              jsx.jsxs("div", {
                className: "mt-4",
                children: [
                  jsx.jsx("h2", {
                    className:
                      "text-2xl font-semibold text-gray-600 dark:text-dark-100",
                    children: "Bem vindo de volta",
                  }),
                  jsx.jsx("p", {
                    className: "text-gray-400 dark:text-dark-300",
                    children: "Por favor, faça login para continuar",
                  }),
                ],
              }),
            ],
          }),

          /* Login Form Card */
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
                      jsx.jsx(InputField, {
                        label: "Usuário",
                        placeholder: "Digite o usuário",
                        prefix: jsx.jsx(EnvelopeIcon, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...register("username"),
                        error: errors?.username?.message,
                      }),
                      jsx.jsx(PasswordInput, {
                        label: "Senha",
                        placeholder: "Digite a senha",
                        prefix: jsx.jsx(LockClosedIcon, {
                          className: "size-5 transition-colors duration-200",
                          strokeWidth: "1",
                        }),
                        ...register("password"),
                        error: errors?.password?.message,
                      }),
                    ],
                  }),
                  jsx.jsxs("div", {
                    className:
                      "mt-4 flex items-center justify-between space-x-2",
                    children: [
                      jsx.jsx(Checkbox, { label: "Lembrar-me" }),
                      jsx.jsx(Link, {
                        to: "/forgot-password",
                        className:
                          "text-xs text-gray-400 transition-colors hover:text-gray-800 focus:text-gray-800 dark:text-dark-300 dark:hover:text-dark-100 dark:focus:text-dark-100",
                        children: "Esqueceu a senha?",
                      }),
                    ],
                  }),
                  jsx.jsx(Button, {
                    type: "submit",
                    className: "mt-5 w-full",
                    color: "primary",
                    children: "Entrar",
                  }),
                ],
              }),

              /* Register link */
              jsx.jsx("div", {
                className: "mt-4 text-center text-xs-plus",
                children: jsx.jsxs("p", {
                  className: "line-clamp-1",
                  children: [
                    jsx.jsx("span", { children: "Não tem uma conta?" }),
                    " ",
                    jsx.jsx(Link, {
                      className:
                        "text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600",
                      to: "/register",
                      children: "Cadastre-se",
                    }),
                  ],
                }),
              }),
            ],
          }),

          /* Footer links */
          jsx.jsxs("div", {
            className:
              "mt-8 flex justify-center text-xs text-gray-400 dark:text-dark-300",
            children: [
              jsx.jsx("a", { href: "##", children: "Privacidade" }),
              jsx.jsx("div", {
                className: "mx-2.5 my-0.5 w-px bg-gray-200 dark:bg-dark-500",
              }),
              jsx.jsx("a", { href: "##", children: "Termos de serviço" }),
            ],
          }),
        ],
      }),
    }),
  });
}

export { LoginPage as default };
