import type { UserStorage } from "../user.storage";

export function showProLiteBannerMigration(data: UserStorage): UserStorage | void {
  if (!Object.prototype.hasOwnProperty.call(data, "showProLiteBanner")) {
    return { ...data, showProLiteBanner: true };
  }
}
