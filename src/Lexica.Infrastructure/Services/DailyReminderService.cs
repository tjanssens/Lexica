using System.Text.Json;
using Lexica.Core.Enums;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Lexica.Infrastructure.Services;

/// <summary>
/// Bepaalt wie een notificatie moet krijgen en verstuurt ze. Elke gebruiker kiest zelf het tijdstip;
/// een job verstuurt zodra het gekozen tijdstip (Europe/Brussels) van die dag bereikt is en er die
/// dag nog geen melding van dat type naar de gebruiker ging.
/// - Dagelijkse herinnering: abonnement, herinnering aan, en ≥1 due woord.
/// - Avond-nudge: idem, nudge aan, en die dag nog niet geoefend.
/// </summary>
public class DailyReminderService(
    AppDbContext db,
    IPushSender sender,
    ILogger<DailyReminderService> logger)
{
    public async Task SendDailyRemindersAsync(DateOnly localDate, TimeOnly localTime, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;

        var targets = await db.Users
            .Where(u => u.DailyReminderEnabled && u.DailyReminderTime <= localTime)
            .Where(u => db.PushSubscriptions.Any(s => s.UserId == u.Id))
            .Where(u => db.UserWordProgress.Any(p => p.UserId == u.Id && p.DueDate <= today))
            .Where(u => !db.NotificationDispatches.Any(
                d => d.UserId == u.Id && d.JobType == NotificationJobType.DailyReminder && d.RunDate == localDate))
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (targets.Count == 0) return;
        logger.LogInformation("Dagelijkse herinnering: {Count} gebruiker(s).", targets.Count);

        foreach (var userId in targets)
        {
            if (!await TryReserveAsync(userId, NotificationJobType.DailyReminder, localDate, ct))
                continue;

            var dueCount = await db.UserWordProgress
                .CountAsync(p => p.UserId == userId && p.DueDate <= today, ct);

            var body = dueCount == 1
                ? "Je hebt 1 woordje klaar om te herhalen."
                : $"Je hebt {dueCount} woordjes klaar om te herhalen.";

            await SendToUserAsync(userId, BuildPayload("Tijd om te oefenen! 📚", body), ct);
        }
    }

    public async Task SendEveningNudgesAsync(DateOnly localDate, TimeOnly localTime, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;

        var targets = await db.Users
            .Where(u => u.EveningNudgeEnabled && u.EveningNudgeTime <= localTime)
            .Where(u => u.LastSessionDate == null || u.LastSessionDate.Value.Date < today)
            .Where(u => db.PushSubscriptions.Any(s => s.UserId == u.Id))
            .Where(u => db.UserWordProgress.Any(p => p.UserId == u.Id && p.DueDate <= today))
            .Where(u => !db.NotificationDispatches.Any(
                d => d.UserId == u.Id && d.JobType == NotificationJobType.EveningNudge && d.RunDate == localDate))
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (targets.Count == 0) return;
        logger.LogInformation("Avond-nudge: {Count} gebruiker(s).", targets.Count);

        foreach (var userId in targets)
        {
            if (!await TryReserveAsync(userId, NotificationJobType.EveningNudge, localDate, ct))
                continue;

            await SendToUserAsync(userId,
                BuildPayload("Nog niet geoefend vandaag 👀", "Hou je streak in leven — oefen even je woordjes!"),
                ct);
        }
    }

    /// <summary>
    /// Reserveert (UserId, JobType, RunDate) zodat dit type die dag maar één keer naar de gebruiker gaat.
    /// De unieke index vangt races/overlappende ticks op: faalt de insert, dan deed een ander al de melding.
    /// </summary>
    private async Task<bool> TryReserveAsync(Guid userId, NotificationJobType type, DateOnly localDate, CancellationToken ct)
    {
        var entry = db.NotificationDispatches.Add(new Core.Entities.NotificationDispatch
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            JobType = type,
            RunDate = localDate,
            CreatedAt = DateTime.UtcNow
        });

        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException)
        {
            entry.State = EntityState.Detached; // al gereserveerd door een andere tick/instance
            return false;
        }
    }

    private async Task SendToUserAsync(Guid userId, string payload, CancellationToken ct)
    {
        var subs = await db.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync(ct);
        foreach (var sub in subs)
            await sender.SendAsync(sub, payload, ct);
    }

    /// <summary>Payload-vorm die de Angular service worker (ngsw) begrijpt.</summary>
    private static string BuildPayload(string title, string body) =>
        JsonSerializer.Serialize(new
        {
            notification = new
            {
                title,
                body,
                icon = "/assets/icons/icon-192.png",
                badge = "/assets/icons/badge-96.png",
                data = new { url = "/session" }
            }
        });
}
