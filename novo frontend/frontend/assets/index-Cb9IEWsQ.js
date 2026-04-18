/* ==== External Imports (Vite bundle references - DO NOT rename) ==== */
import {
  a as s,
  N as ke,
  j as e,
  B as i,
  S as l,
  x as ve,
  y as Ne,
  v as S,
  A as we,
  z as Re,
  w as D,
  I as J,
  s as X,
} from "./index-Bx06KCE-.js";
import {
  c as Fe,
  u as Ce,
  f as Y,
  P as Pe,
  b as Se,
  d as ze,
  g as Ee,
  a as Te,
} from "./PaginationSection-uLCLiG5r.js";
import { t as d } from "./index-mwGaaYkF.js";
import { P as Me } from "./Page-hVEPjFz_.js";
import {
  f as $e,
  a as Ae,
  u as De,
  c as Le,
  d as Oe,
  b as Ge,
  e as He,
  g as Ie,
  h as Be,
  i as qe,
  l as Ve,
} from "./authApi-ObFgLF0e.js";
import { F as ee } from "./KeyIcon-CgJXeIvo.js";
import { F as re } from "./PencilSquareIcon-4O8tAZey.js";
import { a as ae, F as Ze } from "./TrashIcon-DZPNpgRn.js";
import { F as se } from "./MagnifyingGlassIcon-DA0XI0aS.js";
import { F as _e } from "./ShieldCheckIcon-BsJEEeR_.js";
import { F as Ke, a as Qe } from "./BarsArrowUpIcon-DltkYWyW.js";
import { F as L } from "./XMarkIcon-mqVC0SZA.js";
import { F as Ue } from "./CheckIcon-BhaIjZ56.js";
import { K as O, O as u } from "./transition-Cxix63ts.js";
import { h as G, z as H, Q as I } from "./dialog-DOjFQwF9.js";
import "./use-is-mounted-D7iMJT5-.js";

/* ==== UsersGroup SVG Icon Component ==== */
function We({ title: svgTitle, titleId: svgTitleId, ...restProps }, ref) {
  return s.createElement(
    "svg",
    Object.assign(
      {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
        "aria-hidden": "true",
        "data-slot": "icon",
        ref: ref,
        "aria-labelledby": svgTitleId,
      },
      restProps,
    ),
    svgTitle
      ? s.createElement(
          "title",
          {
            id: svgTitleId,
          },
          svgTitle,
        )
      : null,
    s.createElement("path", {
      strokeLinecap: "round",
      strokeLinejoin: "round",
      d: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
    }),
  );
}
const te = s.forwardRef(We);

/* ==== Main Access Management Page Component ==== */
function gr() {
  /* ---- URL Search Params & Active Tab ---- */
  const [searchParams, setSearchParams] = ke(),
    activeTab = searchParams.get("tab") || "roles",

    /* ---- Data State: Roles & Permissions ---- */
    [rolesList, setRolesList] = s.useState([]),
    [permissionsList, setPermissionsList] = s.useState([]),
    [isLoading, setIsLoading] = s.useState(!0),
    [searchFilter, setSearchFilter] = s.useState(""),
    [tableSorting, setTableSorting] = s.useState([]),

    /* ---- Modal Visibility State ---- */
    [isRoleModalOpen, setIsRoleModalOpen] = s.useState(!1),
    [isPermissionModalOpen, setIsPermissionModalOpen] = s.useState(!1),
    [isPermissionsDrawerOpen, setIsPermissionsDrawerOpen] = s.useState(!1),

    /* ---- Currently Editing Items ---- */
    [editingRole, setEditingRole] = s.useState(null),
    [editingPermission, setEditingPermission] = s.useState(null),

    /* ---- Role Form Fields ---- */
    [roleFormData, setRoleFormData] = s.useState({
      name: "",
      description: "",
    }),

    /* ---- Permission Form Fields ---- */
    [permissionFormData, setPermissionFormData] = s.useState({
      code: "",
      description: "",
    }),

    /* ---- Role-Permission Linking State ---- */
    [selectedRoleForPermissions, setSelectedRoleForPermissions] = s.useState(null),
    [linkedPermissionIds, setLinkedPermissionIds] = s.useState([]),
    [isLoadingPermissionLinks, setIsLoadingPermissionLinks] = s.useState(!1),

    /* ---- Fetch All Roles & Permissions ---- */
    fetchAllData = async () => {
      setIsLoading(!0);
      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([$e(), Ae()]);
        setRolesList(rolesResponse);
        setPermissionsList(permissionsResponse);
      } catch (error) {
        console.error(error);
        d.error("Erro ao carregar dados de acesso.");
      } finally {
        setIsLoading(!1);
      }
    };

  s.useEffect(() => {
    fetchAllData();
  }, []);

  /* ==== Tab Navigation ==== */
  const switchTab = (tabName) => {
      setSearchParams((params) => (params.set("tab", tabName), params));
    },

    /* ==== Role CRUD Handlers ==== */
    openCreateRoleModal = () => {
      setEditingRole(null);
      setRoleFormData({
        name: "",
        description: "",
      });
      setIsRoleModalOpen(!0);
    },
    openEditRoleModal = (role) => {
      setEditingRole(role);
      setRoleFormData({
        name: role.name,
        description: role.description || "",
      });
      setIsRoleModalOpen(!0);
    },
    handleRoleFormSubmit = async (event) => {
      if ((event.preventDefault(), !roleFormData.name.trim())) {
        d.error("O nome da role é obrigatório.");
        return;
      }
      const apiCall = editingRole ? De(editingRole.id, roleFormData) : Le(roleFormData);
      d.promise(apiCall, {
        loading: editingRole ? "Atualizando role..." : "Criando role...",
        success: (createdRole) => (
          editingRole
            ? setRolesList((prevRoles) =>
                prevRoles.map((role) =>
                  role.id === editingRole.id
                    ? {
                        ...role,
                        ...roleFormData,
                      }
                    : role,
                ),
              )
            : (setRolesList((prevRoles) => [...prevRoles, createdRole]), fetchAllData()),
          setIsRoleModalOpen(!1),
          editingRole ? "Role atualizada!" : "Role criada com sucesso!"
        ),
        error: "Erro ao salvar role.",
      });
    },
    handleDeleteRole = async (roleId) => {
      if (confirm("Tem certeza que deseja excluir esta role?")) {
        d.promise(Oe(roleId), {
          loading: "Excluindo...",
          success: () => (
            setRolesList((prevRoles) => prevRoles.filter((role) => role.id !== roleId)),
            "Role excluída."
          ),
          error: "Erro ao excluir role.",
        });
      }
    },

    /* ==== Permission CRUD Handlers ==== */
    openCreatePermissionModal = () => {
      setEditingPermission(null);
      setPermissionFormData({
        code: "",
        description: "",
      });
      setIsPermissionModalOpen(!0);
    },
    openEditPermissionModal = (permission) => {
      setEditingPermission(permission);
      setPermissionFormData({
        code: permission.code,
        description: permission.description || "",
      });
      setIsPermissionModalOpen(!0);
    },
    handlePermissionFormSubmit = async (event) => {
      if ((event.preventDefault(), !permissionFormData.code.trim())) {
        d.error("O código da permissão é obrigatório.");
        return;
      }
      const apiCall = editingPermission ? Ge(editingPermission.id, permissionFormData) : He(permissionFormData);
      d.promise(apiCall, {
        loading: editingPermission ? "Atualizando permissão..." : "Criando permissão...",
        success: () => (
          editingPermission
            ? setPermissionsList((prevPerms) =>
                prevPerms.map((perm) =>
                  perm.id === editingPermission.id
                    ? {
                        ...perm,
                        ...permissionFormData,
                      }
                    : perm,
                ),
              )
            : fetchAllData(),
          setIsPermissionModalOpen(!1),
          editingPermission ? "Permissão atualizada!" : "Permissão criada com sucesso!"
        ),
        error: "Erro ao salvar permissão.",
      });
    },
    handleDeletePermission = async (permissionId) => {
      if (
        confirm("Tem certeza? Isso removerá a permissão de todas as roles.")
      ) {
        d.promise(Ie(permissionId), {
          loading: "Excluindo...",
          success: () => (
            setPermissionsList((prevPerms) => prevPerms.filter((perm) => perm.id !== permissionId)),
            "Permissão excluída."
          ),
          error: "Erro ao excluir permissão.",
        });
      }
    },

    /* ==== Role-Permission Linking Handlers ==== */
    openPermissionsDrawer = async (role) => {
      setSelectedRoleForPermissions(role);
      setIsPermissionsDrawerOpen(!0);
      setIsLoadingPermissionLinks(!0);
      setLinkedPermissionIds([]);
      try {
        const rolePermissions = await Be(role.id);
        setLinkedPermissionIds(rolePermissions.map((perm) => perm.id));
      } catch (error) {
        console.error(error);
        d.error("Erro ao carregar permissões da role.");
      } finally {
        setIsLoadingPermissionLinks(!1);
      }
    },
    togglePermissionLink = async (permissionId) => {
      if (!selectedRoleForPermissions) return;
      const isCurrentlyLinked = linkedPermissionIds.includes(permissionId),
        previousIds = [...linkedPermissionIds];
      setLinkedPermissionIds(isCurrentlyLinked ? (ids) => ids.filter((id) => id !== permissionId) : (ids) => [...ids, permissionId]);
      try {
        isCurrentlyLinked ? await qe(selectedRoleForPermissions.id, permissionId) : await Ve(selectedRoleForPermissions.id, permissionId);
      } catch {
        setLinkedPermissionIds(previousIds);
        d.error("Erro ao atualizar vínculo.");
      }
    },

    /* ==== Permissions Table Configuration ==== */
    columnHelper = Fe(),
    permissionColumns = s.useMemo(
      () => [
        columnHelper.accessor("code", {
          header: "Código",
          cell: (cellContext) =>
            e.jsxs("div", {
              className: "flex items-center gap-3",
              children: [
                e.jsx("div", {
                  className:
                    "flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
                  children: e.jsx(ee, {
                    className: "size-4",
                  }),
                }),
                e.jsx("span", {
                  className:
                    "font-mono font-medium text-gray-700 dark:text-dark-200",
                  children: cellContext.getValue(),
                }),
              ],
            }),
        }),
        columnHelper.accessor("description", {
          header: "Descrição",
          cell: (cellContext) =>
            e.jsx("span", {
              className: "text-gray-500 dark:text-dark-300",
              children: cellContext.getValue() || "—",
            }),
        }),
        columnHelper.display({
          id: "actions",
          header: () =>
            e.jsx("div", {
              className: "text-center",
              children: "Ações",
            }),
          cell: (cellContext) =>
            e.jsxs("div", {
              className: "flex justify-center gap-2",
              children: [
                e.jsx("button", {
                  onClick: () => openEditPermissionModal(cellContext.row.original),
                  className:
                    "rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400",
                  title: "Editar",
                  children: e.jsx(re, {
                    className: "size-4",
                  }),
                }),
                e.jsx("button", {
                  onClick: () => handleDeletePermission(cellContext.row.original.id),
                  className:
                    "rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400",
                  title: "Excluir",
                  children: e.jsx(ae, {
                    className: "size-4",
                  }),
                }),
              ],
            }),
        }),
      ],
      [],
    ),
    permissionsTable = Ce({
      data: permissionsList,
      columns: permissionColumns,
      state: {
        sorting: tableSorting,
        globalFilter: searchFilter,
      },
      onSortingChange: setTableSorting,
      getCoreRowModel: Te(),
      getSortedRowModel: Ee(),
      getPaginationRowModel: ze(),
      getFilteredRowModel: Se(),
      onGlobalFilterChange: setSearchFilter,
    }),

    /* ---- Filtered Roles for Card Grid ---- */
    filteredRoles = s.useMemo(
      () =>
        rolesList.filter(
          (role) =>
            role.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
            (role.description &&
              role.description.toLowerCase().includes(searchFilter.toLowerCase())),
        ),
      [rolesList, searchFilter],
    );

  /* ==== Render ==== */
  return e.jsxs(Me, {
    title: "Gestão de Acesso",
    children: [
      /* ---- Page Content Area ---- */
      e.jsxs("div", {
        className:
          "transition-content w-full px-(--margin-x) pb-10 pt-5 lg:pt-6",
        children: [
          /* ---- Page Header with Search & Create Button ---- */
          e.jsxs("div", {
            className:
              "mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("h1", {
                    className:
                      "text-2xl font-bold text-gray-900 dark:text-dark-50",
                    children: "Controle de Acesso",
                  }),
                  e.jsx("p", {
                    className: "mt-1 text-sm text-gray-500 dark:text-dark-300",
                    children:
                      "Gerencie funções (roles) e suas permissões de sistema.",
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  e.jsxs("div", {
                    className: "relative",
                    children: [
                      e.jsx(se, {
                        className:
                          "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                      }),
                      e.jsx("input", {
                        type: "text",
                        placeholder: "Pesquisar...",
                        value: searchFilter,
                        onChange: (event) => setSearchFilter(event.target.value),
                        className:
                          "h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-50 sm:w-64",
                      }),
                    ],
                  }),
                  e.jsxs(i, {
                    variant: "soft",
                    color: "primary",
                    className: "gap-2 h-9 px-4 text-sm font-medium",
                    onClick: () => (activeTab === "roles" ? openCreateRoleModal() : openCreatePermissionModal()),
                    children: [
                      e.jsx(Ze, {
                        className: "size-5",
                      }),
                      e.jsxs("span", {
                        className: "hidden sm:inline",
                        children: [
                          "Nova ",
                          activeTab === "roles" ? "Role" : "Permissão",
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          /* ---- Tab Switcher (Roles / Permissions) ---- */
          e.jsxs("div", {
            className:
              "mb-6 flex w-full items-center gap-1 rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm dark:border-dark-700 dark:bg-dark-800/50 sm:w-fit",
            children: [
              e.jsxs("button", {
                onClick: () => switchTab("roles"),
                className: `flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${activeTab === "roles" ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:ring-primary-700/50" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-50"}`,
                children: [
                  e.jsx(te, {
                    className: "size-4",
                  }),
                  "Funções (Roles)",
                ],
              }),
              e.jsxs("button", {
                onClick: () => switchTab("permissions"),
                className: `flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${activeTab === "permissions" ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:ring-primary-700/50" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-50"}`,
                children: [
                  e.jsx(ee, {
                    className: "size-4",
                  }),
                  "Permissões",
                ],
              }),
            ],
          }),

          /* ---- Tab Content Area ---- */
          e.jsxs("div", {
            className: "min-h-[400px]",
            children: [
              /* ---- Roles Tab: Card Grid ---- */
              activeTab === "roles" &&
                e.jsxs("div", {
                  className: "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
                  children: [
                    isLoading
                      ? Array.from({
                          length: 6,
                        }).map((_unused, skeletonIndex) =>
                          e.jsxs(
                            "div",
                            {
                              className:
                                "flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-700 dark:bg-dark-800",
                              children: [
                                e.jsxs("div", {
                                  className: "mb-4",
                                  children: [
                                    e.jsxs("div", {
                                      className: "mb-3 flex items-center gap-3",
                                      children: [
                                        e.jsx(l, {
                                          className: "h-10 w-10 rounded-full",
                                        }),
                                        e.jsxs("div", {
                                          className: "space-y-2",
                                          children: [
                                            e.jsx(l, {
                                              className: "h-4 w-24",
                                            }),
                                            e.jsx(l, {
                                              className: "h-3 w-20",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                    e.jsxs("div", {
                                      className: "space-y-2",
                                      children: [
                                        e.jsx(l, {
                                          className: "h-3 w-full",
                                        }),
                                        e.jsx(l, {
                                          className: "h-3 w-5/6",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className: "mt-auto flex flex-col gap-3 pt-4",
                                  children: [
                                    e.jsx(l, {
                                      className: "h-9 w-full rounded-lg",
                                    }),
                                    e.jsxs("div", {
                                      className: "flex items-center gap-2",
                                      children: [
                                        e.jsx(l, {
                                          className: "h-8 w-full rounded-lg",
                                        }),
                                        e.jsx(l, {
                                          className: "h-8 w-8 rounded-lg",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            },
                            `role-skeleton-${skeletonIndex}`,
                          ),
                        )
                      : filteredRoles.map((role) =>
                          e.jsxs(
                            "div",
                            {
                              className:
                                "group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary-200 hover:shadow-md dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-500/30",
                              children: [
                                e.jsxs("div", {
                                  className: "mb-4",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "mb-3 flex items-center justify-between",
                                      children: e.jsxs("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "flex size-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400",
                                            children: e.jsx(_e, {
                                              className: "size-5",
                                            }),
                                          }),
                                          e.jsxs("div", {
                                            children: [
                                              e.jsx("h3", {
                                                className:
                                                  "font-bold text-gray-900 dark:text-dark-50",
                                                children: role.name,
                                              }),
                                              e.jsxs("span", {
                                                className:
                                                  "text-[11px] font-medium uppercase tracking-wider text-gray-400",
                                                children: [
                                                  "Role ID: ",
                                                  role.id.slice(0, 8),
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                    }),
                                    e.jsx("p", {
                                      className:
                                        "line-clamp-2 text-sm text-gray-500 dark:text-dark-300",
                                      children:
                                        role.description ||
                                        "Sem descrição definida.",
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className: "mt-auto flex flex-col gap-3 pt-4",
                                  children: [
                                    e.jsxs("div", {
                                      className:
                                        "flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-700/50",
                                      children: [
                                        e.jsx("span", {
                                          className:
                                            "text-xs font-medium text-gray-500 dark:text-dark-400",
                                          children: "Acesso ao Sistema",
                                        }),
                                        e.jsx(i, {
                                          variant: "flat",
                                          color: "primary",
                                          className:
                                            "h-6 px-2 text-xs hover:bg-white dark:hover:bg-dark-700",
                                          onClick: () => openPermissionsDrawer(role),
                                          children: "Gerenciar Permissões",
                                        }),
                                      ],
                                    }),
                                    e.jsxs("div", {
                                      className:
                                        "flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-dark-700",
                                      children: [
                                        e.jsxs(i, {
                                          variant: "soft",
                                          color: "neutral",
                                          className: "h-8 flex-1 text-xs",
                                          onClick: () => openEditRoleModal(role),
                                          children: [
                                            e.jsx(re, {
                                              className: "mr-1.5 size-3.5",
                                            }),
                                            "Editar",
                                          ],
                                        }),
                                        e.jsx(i, {
                                          variant: "soft",
                                          color: "error",
                                          className: "size-8 shrink-0 p-0",
                                          onClick: () => handleDeleteRole(role.id),
                                          title: "Excluir Role",
                                          children: e.jsx(ae, {
                                            className: "size-3.5",
                                          }),
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            },
                            role.id,
                          ),
                        ),

                    /* ---- Empty State for Roles ---- */
                    filteredRoles.length === 0 &&
                      !isLoading &&
                      e.jsxs("div", {
                        className:
                          "col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-20 dark:border-dark-700 dark:bg-dark-800/20",
                        children: [
                          e.jsx("div", {
                            className:
                              "mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-dark-700",
                            children: e.jsx(te, {
                              className: "size-6 text-gray-400",
                            }),
                          }),
                          e.jsx("p", {
                            className: "text-gray-500 dark:text-dark-400",
                            children: "Nenhuma role encontrada.",
                          }),
                          e.jsx(i, {
                            variant: "flat",
                            className: "mt-2",
                            onClick: openCreateRoleModal,
                            children: "Criar nova role",
                          }),
                        ],
                      }),
                  ],
                }),

              /* ---- Permissions Tab: Data Table ---- */
              activeTab === "permissions" &&
                e.jsxs("div", {
                  className:
                    "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800",
                  children: [
                    e.jsxs(ve, {
                      className: "w-full",
                      children: [
                        /* ---- Table Header ---- */
                        e.jsx(Ne, {
                          children: permissionsTable.getHeaderGroups().map((headerGroup) =>
                            e.jsx(
                              S,
                              {
                                children: headerGroup.headers.map((header) =>
                                  e.jsx(
                                    we,
                                    {
                                      className: `cursor-pointer select-none px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200 ${header.id === "actions" ? "w-[1%] whitespace-nowrap" : ""}`,
                                      onClick:
                                        header.column.getToggleSortingHandler(),
                                      children: e.jsxs("div", {
                                        className: `flex items-center gap-2 ${header.id === "actions" ? "justify-center" : ""}`,
                                        children: [
                                          Y(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                          ),
                                          {
                                            asc: e.jsx(Qe, {
                                              className: "size-3",
                                            }),
                                            desc: e.jsx(Ke, {
                                              className: "size-3",
                                            }),
                                          }[header.column.getIsSorted()] ?? null,
                                        ],
                                      }),
                                    },
                                    header.id,
                                  ),
                                ),
                              },
                              headerGroup.id,
                            ),
                          ),
                        }),

                        /* ---- Table Body ---- */
                        e.jsx(Re, {
                          children: isLoading
                            ? Array.from({
                                length: 6,
                              }).map((_unused, rowIndex) =>
                                e.jsx(
                                  S,
                                  {
                                    className:
                                      "border-b border-gray-100 dark:border-dark-700",
                                    children: Array.from({
                                      length: permissionColumns.length,
                                    }).map((_unused, colIndex) =>
                                      e.jsx(
                                        D,
                                        {
                                          className: "px-6 py-4",
                                          children: e.jsx(l, {
                                            className:
                                              "h-4 w-full max-w-[180px]",
                                          }),
                                        },
                                        `permission-skeleton-cell-${rowIndex}-${colIndex}`,
                                      ),
                                    ),
                                  },
                                  `permission-skeleton-${rowIndex}`,
                                ),
                              )
                            : permissionsTable.getRowModel().rows.length === 0
                              ? e.jsx(S, {
                                  children: e.jsx(D, {
                                    colSpan: permissionColumns.length,
                                    className:
                                      "py-12 text-center text-gray-500 dark:text-dark-400",
                                    children: "Nenhuma permissão encontrada.",
                                  }),
                                })
                              : permissionsTable.getRowModel().rows.map((row) =>
                                  e.jsx(
                                    S,
                                    {
                                      className:
                                        "group border-b border-gray-100 hover:bg-gray-50/50 dark:border-dark-700 dark:hover:bg-dark-700/30",
                                      children: row
                                        .getVisibleCells()
                                        .map((cell) =>
                                          e.jsx(
                                            D,
                                            {
                                              className: `px-6 py-4 ${cell.column.id === "actions" ? "w-[1%] whitespace-nowrap" : ""}`,
                                              children: Y(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                              ),
                                            },
                                            cell.id,
                                          ),
                                        ),
                                    },
                                    row.id,
                                  ),
                                ),
                        }),
                      ],
                    }),

                    /* ---- Table Pagination ---- */
                    e.jsx("div", {
                      className:
                        "border-t border-gray-100 p-4 dark:border-dark-700",
                      children: e.jsx(Pe, {
                        table: permissionsTable,
                      }),
                    }),
                  ],
                }),
            ],
          }),
        ],
      }),

      /* ==== Role Create/Edit Modal ==== */
      e.jsx(O, {
        appear: !0,
        show: isRoleModalOpen,
        as: s.Fragment,
        children: e.jsxs(G, {
          as: "div",
          className: "relative z-50",
          onClose: () => setIsRoleModalOpen(!1),
          children: [
            e.jsx(u, {
              as: s.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className:
                  "flex min-h-full items-center justify-center p-4 text-center",
                children: e.jsx(u, {
                  as: s.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(H, {
                    className:
                      "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      e.jsxs("div", {
                        className: "mb-6 flex items-start justify-between",
                        children: [
                          e.jsx(I, {
                            as: "h3",
                            className:
                              "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                            children: editingRole ? "Editar Role" : "Nova Role",
                          }),
                          e.jsx("button", {
                            onClick: () => setIsRoleModalOpen(!1),
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            children: e.jsx(L, {
                              className: "size-5",
                            }),
                          }),
                        ],
                      }),
                      e.jsxs("form", {
                        onSubmit: handleRoleFormSubmit,
                        className: "space-y-4",
                        children: [
                          e.jsx(J, {
                            label: "Nome da Role",
                            placeholder: "Ex: Administrator",
                            value: roleFormData.name,
                            onChange: (event) =>
                              setRoleFormData({
                                ...roleFormData,
                                name: event.target.value,
                              }),
                          }),
                          e.jsx(X, {
                            label: "Descrição",
                            placeholder: "Descreva o propósito desta função...",
                            value: roleFormData.description,
                            rows: 3,
                            onChange: (event) =>
                              setRoleFormData({
                                ...roleFormData,
                                description: event.target.value,
                              }),
                          }),
                          e.jsxs("div", {
                            className: "mt-6 flex justify-end gap-3",
                            children: [
                              e.jsx(i, {
                                type: "button",
                                variant: "soft",
                                color: "neutral",
                                onClick: () => setIsRoleModalOpen(!1),
                                children: "Cancelar",
                              }),
                              e.jsx(i, {
                                type: "submit",
                                color: "primary",
                                children: editingRole
                                  ? "Salvar Alterações"
                                  : "Criar Role",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                }),
              }),
            }),
          ],
        }),
      }),

      /* ==== Permission Create/Edit Modal ==== */
      e.jsx(O, {
        appear: !0,
        show: isPermissionModalOpen,
        as: s.Fragment,
        children: e.jsxs(G, {
          as: "div",
          className: "relative z-50",
          onClose: () => setIsPermissionModalOpen(!1),
          children: [
            e.jsx(u, {
              as: s.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className:
                  "flex min-h-full items-center justify-center p-4 text-center",
                children: e.jsx(u, {
                  as: s.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(H, {
                    className:
                      "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      e.jsxs("div", {
                        className: "mb-6 flex items-start justify-between",
                        children: [
                          e.jsx(I, {
                            as: "h3",
                            className:
                              "text-lg font-bold leading-6 text-gray-900 dark:text-white",
                            children: editingPermission ? "Editar Permissão" : "Nova Permissão",
                          }),
                          e.jsx("button", {
                            onClick: () => setIsPermissionModalOpen(!1),
                            className:
                              "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                            children: e.jsx(L, {
                              className: "size-5",
                            }),
                          }),
                        ],
                      }),
                      e.jsxs("form", {
                        onSubmit: handlePermissionFormSubmit,
                        className: "space-y-4",
                        children: [
                          e.jsx(J, {
                            label: "Código (Slug)",
                            placeholder: "Ex: users:read",
                            value: permissionFormData.code,
                            onChange: (event) =>
                              setPermissionFormData({
                                ...permissionFormData,
                                code: event.target.value,
                              }),
                          }),
                          e.jsx(X, {
                            label: "Descrição",
                            placeholder: "Para que serve esta permissão...",
                            value: permissionFormData.description,
                            rows: 3,
                            onChange: (event) =>
                              setPermissionFormData({
                                ...permissionFormData,
                                description: event.target.value,
                              }),
                          }),
                          e.jsxs("div", {
                            className: "mt-6 flex justify-end gap-3",
                            children: [
                              e.jsx(i, {
                                type: "button",
                                variant: "soft",
                                color: "neutral",
                                onClick: () => setIsPermissionModalOpen(!1),
                                children: "Cancelar",
                              }),
                              e.jsx(i, {
                                type: "submit",
                                color: "primary",
                                children: editingPermission ? "Salvar" : "Criar",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                }),
              }),
            }),
          ],
        }),
      }),

      /* ==== Role Permissions Drawer (Link/Unlink) ==== */
      e.jsx(O, {
        appear: !0,
        show: isPermissionsDrawerOpen,
        as: s.Fragment,
        children: e.jsxs(G, {
          as: "div",
          className: "relative z-50",
          onClose: () => setIsPermissionsDrawerOpen(!1),
          children: [
            e.jsx(u, {
              as: s.Fragment,
              enter: "ease-out duration-300",
              enterFrom: "opacity-0",
              enterTo: "opacity-100",
              leave: "ease-in duration-200",
              leaveFrom: "opacity-100",
              leaveTo: "opacity-0",
              children: e.jsx("div", {
                className: "fixed inset-0 bg-gray-900/60 backdrop-blur-sm",
              }),
            }),
            e.jsx("div", {
              className: "fixed inset-0 overflow-y-auto",
              children: e.jsx("div", {
                className:
                  "flex min-h-full items-center justify-center p-4 text-center",
                children: e.jsx(u, {
                  as: s.Fragment,
                  enter: "ease-out duration-300",
                  enterFrom: "opacity-0 scale-95",
                  enterTo: "opacity-100 scale-100",
                  leave: "ease-in duration-200",
                  leaveFrom: "opacity-100 scale-100",
                  leaveTo: "opacity-0 scale-95",
                  children: e.jsxs(H, {
                    className:
                      "flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-dark-800 dark:ring-1 dark:ring-white/10",
                    children: [
                      /* ---- Drawer Header ---- */
                      e.jsx("div", {
                        className:
                          "border-b border-gray-100 px-6 py-4 dark:border-dark-700",
                        children: e.jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [
                            e.jsxs("div", {
                              children: [
                                e.jsx(I, {
                                  as: "h3",
                                  className:
                                    "text-lg font-bold text-gray-900 dark:text-white",
                                  children: "Permissões da Role",
                                }),
                                e.jsxs("p", {
                                  className:
                                    "text-sm text-gray-500 dark:text-dark-300",
                                  children: [
                                    "Editando:",
                                    " ",
                                    e.jsx("span", {
                                      className:
                                        "font-semibold text-primary-600 dark:text-primary-400",
                                      children: selectedRoleForPermissions?.name,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsx("button", {
                              onClick: () => setIsPermissionsDrawerOpen(!1),
                              className:
                                "rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-700 dark:hover:text-gray-300",
                              children: e.jsx(L, {
                                className: "size-5",
                              }),
                            }),
                          ],
                        }),
                      }),

                      /* ---- Drawer Body: Permission Checklist ---- */
                      e.jsxs("div", {
                        className: "flex flex-1 flex-col overflow-hidden p-6",
                        children: [
                          e.jsxs("div", {
                            className: "mb-4 relative",
                            children: [
                              e.jsx(se, {
                                className:
                                  "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400",
                              }),
                              e.jsx("input", {
                                type: "text",
                                placeholder: "Filtrar permissões...",
                                className:
                                  "h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700/50 dark:text-dark-50",
                              }),
                            ],
                          }),
                          e.jsx("div", {
                            className:
                              "custom-scrollbar flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2 dark:border-dark-700 dark:bg-dark-800/50",
                            children: isLoadingPermissionLinks
                              ? e.jsx("div", {
                                  className:
                                    "flex h-40 items-center justify-center",
                                  children: e.jsx("div", {
                                    className:
                                      "size-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent",
                                  }),
                                })
                              : e.jsx("div", {
                                  className: "space-y-1",
                                  children: permissionsList.map((permission) => {
                                    const isLinked = linkedPermissionIds.includes(permission.id);
                                    return e.jsxs(
                                      "label",
                                      {
                                        className: `flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition ${isLinked ? "bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100" : "hover:bg-white hover:shadow-sm dark:hover:bg-dark-700"}`,
                                        children: [
                                          e.jsxs("div", {
                                            className:
                                              "flex items-center gap-3 overflow-hidden",
                                            children: [
                                              e.jsx("div", {
                                                className: `flex size-5 shrink-0 items-center justify-center rounded border ${isLinked ? "border-primary-500 bg-primary-500 text-white" : "border-gray-300 bg-white dark:border-dark-500 dark:bg-dark-800"}`,
                                                children:
                                                  isLinked &&
                                                  e.jsx(Ue, {
                                                    className:
                                                      "size-3.5 stroke-[3]",
                                                  }),
                                              }),
                                              e.jsxs("div", {
                                                className:
                                                  "flex flex-col truncate",
                                                children: [
                                                  e.jsx("span", {
                                                    className:
                                                      "truncate font-mono text-xs font-medium",
                                                    children: permission.code,
                                                  }),
                                                  e.jsx("span", {
                                                    className:
                                                      "truncate text-[11px] text-gray-500 dark:text-dark-400",
                                                    children: permission.description,
                                                  }),
                                                ],
                                              }),
                                            ],
                                          }),
                                          e.jsx("input", {
                                            type: "checkbox",
                                            className: "hidden",
                                            checked: isLinked,
                                            onChange: () => togglePermissionLink(permission.id),
                                          }),
                                        ],
                                      },
                                      permission.id,
                                    );
                                  }),
                                }),
                          }),
                          e.jsx("p", {
                            className:
                              "mt-2 text-center text-xs text-gray-400 dark:text-dark-500",
                            children:
                              "As alterações são salvas automaticamente ao clicar.",
                          }),
                        ],
                      }),

                      /* ---- Drawer Footer ---- */
                      e.jsx("div", {
                        className:
                          "border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-dark-700 dark:bg-dark-800/50",
                        children: e.jsx("div", {
                          className: "flex justify-end",
                          children: e.jsx(i, {
                            color: "primary",
                            onClick: () => setIsPermissionsDrawerOpen(!1),
                            className: "w-full sm:w-auto",
                            children: "Concluir",
                          }),
                        }),
                      }),
                    ],
                  }),
                }),
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
export { gr as default };
