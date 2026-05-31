using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Lexica.Infrastructure.Services;

/// <summary>
/// Periodieke achtergrondtaak die elke paar minuten de notificatie-jobs vuurt. Welke gebruikers
/// aan de beurt zijn (op basis van hun persoonlijke tijdstip) en de eenmaal-per-dag-garantie zitten
/// in <see cref="DailyReminderService"/>; deze service levert alleen de huidige Brusselse datum/tijd aan.
/// </summary>
public class DailyNotificationBackgroundService(
    IServiceProvider services,
    ILogger<DailyNotificationBackgroundService> logger) : BackgroundService
{
    private static readonly TimeZoneInfo BrusselsTz = ResolveBrussels();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        do
        {
            try
            {
                await RunDueJobsAsync(stoppingToken);
            }
            catch (OperationCanceledException) { /* shutting down */ }
            catch (Exception ex)
            {
                logger.LogError(ex, "Notificatie-scheduler faalde tijdens een tick.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunDueJobsAsync(CancellationToken ct)
    {
        var nowLocal = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BrusselsTz);
        var localDate = DateOnly.FromDateTime(nowLocal.DateTime);
        var localTime = TimeOnly.FromDateTime(nowLocal.DateTime);

        using var scope = services.CreateScope();
        var reminders = scope.ServiceProvider.GetRequiredService<DailyReminderService>();

        await reminders.SendDailyRemindersAsync(localDate, localTime, ct);
        await reminders.SendEveningNudgesAsync(localDate, localTime, ct);
    }

    private static TimeZoneInfo ResolveBrussels()
    {
        foreach (var id in new[] { "Europe/Brussels", "Romance Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    }
}
