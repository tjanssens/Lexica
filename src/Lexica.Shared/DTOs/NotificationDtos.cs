namespace Lexica.Shared.DTOs;

public record PushSubscriptionRequest(string Endpoint, string P256dh, string Auth);

public record NotificationStatusDto(bool Subscribed, bool DailyReminderEnabled, bool EveningNudgeEnabled);

public record NotificationPreferencesRequest(bool DailyReminderEnabled, bool EveningNudgeEnabled);
