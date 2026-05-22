export type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  linkUrl?: string | null;
  readAt?: Date | string | null;
  createdAt: Date | string;
  type?: string;
  workspace?: {
    id: string;
    name: string;
  } | null;
};
