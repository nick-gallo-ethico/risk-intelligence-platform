import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the User Management page (/settings/users)
 * Admin-only page for managing user accounts
 */
export class UsersPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly addUserButton: Locator;
  readonly searchInput: Locator;
  readonly roleFilter: Locator;
  readonly statusFilter: Locator;
  readonly usersTable: Locator;
  readonly emptyState: Locator;
  readonly loadingIndicator: Locator;
  readonly totalCount: Locator;
  readonly accessDeniedMessage: Locator;

  // Create User Dialog
  readonly createDialog: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Edit User Dialog
  readonly editDialog: Locator;

  // Deactivate User Dialog
  readonly deactivateDialog: Locator;
  readonly deactivateConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: /user management/i });
    this.addUserButton = page.getByRole('button', { name: /add user/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.roleFilter = page.getByTestId('role-filter').or(
      page.getByLabel(/role/i).first()
    );
    this.statusFilter = page.getByTestId('status-filter').or(
      page.getByLabel(/status/i)
    );
    this.usersTable = page.getByRole('table');
    this.emptyState = page.locator('text=No users found');
    this.loadingIndicator = page.locator('text=Loading users...');
    this.totalCount = page.locator('text=/\\d+ total/');
    this.accessDeniedMessage = page.locator('text=Access Denied').or(
      page.locator('text=Only System Administrators')
    );

    // Create User Dialog elements
    this.createDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /create user|add user/i }),
    });
    this.firstNameInput = page.getByLabel(/first name/i);
    this.lastNameInput = page.getByLabel(/last name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.roleSelect = page.getByLabel(/role/i);
    this.submitButton = page.getByRole('button', { name: /create|save|submit/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    // Edit User Dialog
    this.editDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /edit user/i }),
    });

    // Deactivate Dialog
    this.deactivateDialog = page.getByRole('dialog').filter({
      has: page.locator('text=Deactivate'),
    });
    this.deactivateConfirmButton = page.getByRole('button', { name: /deactivate/i });
  }

  /**
   * Navigate to the users page
   */
  async goto() {
    await this.page.goto('/settings/users');
  }

  /**
   * Wait for the page to be fully loaded
   */
  async expectLoaded() {
    await expect(this.loadingIndicator).toBeHidden({ timeout: 15000 });
    // Either users table or empty state should be visible
    const tableVisible = await this.usersTable.isVisible().catch(() => false);
    const emptyVisible = await this.emptyState.isVisible().catch(() => false);
    const titleVisible = await this.pageTitle.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible || titleVisible).toBe(true);
  }

  /**
   * Check if access denied message is shown
   */
  async expectAccessDenied() {
    await expect(this.accessDeniedMessage).toBeVisible({ timeout: 10000 });
  }

  /**
   * Search for users by name or email
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(500);
    await this.expectLoaded();
  }

  /**
   * Filter users by role
   */
  async filterByRole(role: string) {
    await this.roleFilter.click();
    await this.page.getByRole('option', { name: new RegExp(role, 'i') }).click();
    await this.expectLoaded();
  }

  /**
   * Filter users by active/inactive status
   */
  async filterByStatus(status: 'active' | 'inactive') {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
    await this.expectLoaded();
  }

  /**
   * Get the count of users in the table
   */
  async getUserCount(): Promise<number> {
    const rows = this.usersTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * Check if a user with the given email exists in the table
   */
  async hasUserWithEmail(email: string): Promise<boolean> {
    const cell = this.usersTable.locator(`text=${email}`);
    return await cell.isVisible().catch(() => false);
  }

  /**
   * Click the Add User button
   */
  async clickAddUser() {
    await this.addUserButton.click();
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill the create user form
   */
  async fillCreateUserForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);

    // Select role
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: new RegExp(data.role, 'i') }).click();
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) {
    await this.clickAddUser();
    await this.fillCreateUserForm(data);
    await this.submitButton.click();

    // Wait for dialog to close
    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await this.expectLoaded();
  }

  /**
   * Click edit for a specific user by email
   */
  async clickEditUser(email: string) {
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    const editButton = row.getByRole('button', { name: /edit/i }).or(
      row.locator('[data-testid="edit-button"]').or(
        row.locator('button').filter({ hasText: /edit/i })
      )
    );

    // If no explicit edit button, try clicking the row's action menu
    const menuButton = row.locator('button').last();
    await menuButton.click();

    // Click edit option from dropdown if visible
    const editOption = this.page.getByRole('menuitem', { name: /edit/i });
    if (await editOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editOption.click();
    }

    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Edit a user's role
   */
  async editUserRole(email: string, newRole: string) {
    await this.clickEditUser(email);

    // Update role
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: new RegExp(newRole, 'i') }).click();

    await this.page.getByRole('button', { name: /save|update/i }).click();

    // Wait for dialog to close
    await expect(this.page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    await this.expectLoaded();
  }

  /**
   * Click deactivate for a specific user
   */
  async clickDeactivateUser(email: string) {
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    const menuButton = row.locator('button').last();
    await menuButton.click();

    const deactivateOption = this.page.getByRole('menuitem', { name: /deactivate/i });
    await deactivateOption.click();

    await expect(this.deactivateDialog).toBeVisible({ timeout: 5000 });
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(email: string) {
    await this.clickDeactivateUser(email);
    await this.deactivateConfirmButton.click();

    // Wait for dialog to close
    await expect(this.deactivateDialog).toBeHidden({ timeout: 10000 });
    await this.expectLoaded();
  }

  /**
   * Click reactivate for a specific user
   */
  async reactivateUser(email: string) {
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    const menuButton = row.locator('button').last();
    await menuButton.click();

    const reactivateOption = this.page.getByRole('menuitem', { name: /reactivate/i });
    await reactivateOption.click();

    // Wait for action to complete
    await this.expectLoaded();
  }

  /**
   * Check if a user is active or inactive
   */
  async isUserActive(email: string): Promise<boolean> {
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    const inactiveBadge = row.locator('text=Inactive');
    return !(await inactiveBadge.isVisible().catch(() => false));
  }

  /**
   * Get user role from the table
   */
  async getUserRole(email: string): Promise<string> {
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    // Role is typically displayed in a badge or specific column
    const roleCell = row.locator('td').nth(2); // Assuming role is in 3rd column
    return await roleCell.textContent() || '';
  }
}
