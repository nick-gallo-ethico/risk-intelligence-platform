export * from "./dashboard.module";
export * from "./dashboard-config.service";
export * from "./dashboard.controller";
// Export entities first (canonical source of interfaces)
export * from "./entities";
// Export DTOs (class-validator decorated classes)
export {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UserDashboardConfigDto,
  DashboardQueryDto,
  DateRangeDto,
  DashboardLayoutDto,
  DashboardResponseDto,
  WidgetResponseDto,
  UserDashboardConfigResponseDto,
} from "./dto";
