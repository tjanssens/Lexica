using Lexica.Core.Entities;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lexica.Infrastructure.Services;

/// <summary>
/// Periodieke achtergrondtaak die op vaste Belgische uren de twee notificatie-jobs vuurt.
/// Een NotificationDispatch-rij per (job, dag) zorgt dat elke job hooguit één keer per dag draait,
/// ook na een herstart van de container.
/// </summary>
public class DailyNotificationBackgroundService(
    IServiceProvider services,
    IOptions<PushOptions> options,
    ILogger<DailyNotificationBackgroundService> logger) : BackgroundService
{
    private readonly PushOptions _opts = options.Value;
    private static readonly TimeZoneInfo BrusselsTz = ResolveBrussels();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
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
        var hour = nowLocal.Hour;

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var reminders = scope.ServiceProvider.GetRequiredService<DailyReminderService>();

        if (hour >= _opts.ReminderHour)
            await DispatchOnceAsync(db, NotificationJobType.DailyReminder, localDate,
                () => reminders.SendDailyRemindersAsync(ct), ct);

        if (hour >= _opts.NudgeHour)
            await DispatchOnceAsync(db, NotificationJobType.EveningNudge, localDate,
                () => reminders.SendEveningNudgesAsync(ct), ct);
    }

    private async Task DispatchOnceAsync(AppDbContext db, NotificationJobType type, DateOnly localDate,
        Func<Task> job, CancellationToken ct)
    {
        if (await db.NotificationDispatches.AnyAsync(d => d.JobType == type && d.RunDate == localDate, ct))
            return;

        // Reserveer eerst (unieke index op JobType+RunDate dedupliceert bij races/herstart).
        db.NotificationDispatches.Add(new NotificationDispatch
        {
            Id = Guid.NewGuid(),
            JobType = type,
            RunDate = localDate,
            CreatedAt = DateTime.UtcNow
        });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return; // al gereserveerd door een andere tick/instance
        }

        await job();
        logger.LogInformation("Notificatie-job {Type} uitgevoerd voor {Date}.", type, localDate);
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
