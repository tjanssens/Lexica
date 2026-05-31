namespace Lexica.Shared.DTOs;

public record PushSubscriptionRequest(string Endpoint, string P256dh, string Auth);

/// <summary>Tijden in "HH:mm" (Europe/Brussels), wat naadloos aansluit op de HTML time-picker.</summary>
public record NotificationStatusDto(
    bool Subscribed,
    bool DailyReminderEnabled,
    bool EveningNudgeEnabled,
    string DailyReminderTime,
    string EveningNudgeTime);

public record NotificationPreferencesRequest(
    bool DailyReminderEnabled,
    bool EveningNudgeEnabled,
    string DailyReminderTime,
    string EveningNudgeTime);
