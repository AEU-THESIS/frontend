import type { RoleType } from '@/constants/roles'

/** A named route target as declared in `APP_ROUTES`. */
export interface SidebarRoute {
  path: string
  name: string
}

/** Non-navigating entries: the sidebar handles these itself. */
export type SidebarAction = 'exportExcel'

/**
 * A single clickable row. It either navigates (`route`) or runs a sidebar-owned
 * action (`action`) — never both.
 */
export interface SidebarNavLeaf {
  nameKey: string
  icon: string
  route?: SidebarRoute
  action?: SidebarAction
  /** Restricts the row; omitted means "whoever can see the parent/section". */
  roles?: RoleType[]
  /**
   * Extra route names that keep this row highlighted, for detail pages that
   * belong to it (e.g. an ingredient's Stock History under Inventory).
   */
  childRoutes?: string[]
}

/** A row that may instead open a submenu of its own. */
export interface SidebarNavItem extends SidebarNavLeaf {
  children?: SidebarNavLeaf[]
}

/** A titled group of rows. Groups holding a single submenu omit the title. */
export interface SidebarSection {
  titleKey?: string
  roles?: RoleType[]
  items: SidebarNavItem[]
}
