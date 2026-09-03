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
export interface SidebarNavItem {
  nameKey: string
  icon: string
  route?: SidebarRoute
  action?: SidebarAction
  /** Restricts the row; omitted means "whoever can see the section". */
  roles?: RoleType[]
  /**
   * Extra route names that keep this row highlighted, for detail pages that
   * belong to it (e.g. an ingredient's Stock History under Inventory).
   */
  childRoutes?: string[]
}

/** A titled group of rows. */
export interface SidebarSection {
  titleKey: string
  roles?: RoleType[]
  items: SidebarNavItem[]
}
