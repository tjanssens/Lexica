using System.Text.Json;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Lexica.Infrastructure.Services;

/// <summary>
/// Bepaalt wie een notificatie moet krijgen en verstuurt ze.
/// - Dagelijkse herinnering: gebruikers met een abonnement, herinnering aan, en ≥1 due woord.
/// - Avond-nudge: idem, nudge aan, en die dag nog niet geoefend.
/// </summary>
public class DailyReminderService(
    AppDbContext db,
    IPushSender sender,
    ILogger<DailyReminderService> logger)
{
    public async Task SendDailyRemindersAsync(CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;

        var targets = await db.Users
            .Where(u => u.DailyReminderEnabled)
            .Where(u => db.PushSubscriptions.Any(s => s.UserId == u.Id))
            .Where(u => db.UserWordProgress.Any(p => p.UserId == u.Id && p.DueDate <= today))
            .Select(u => u.Id)
            .ToListAsync(ct);

        logger.LogInformation("Dagelijkse herinnering: {Count} gebruiker(s).", targets.Count);

        foreach (var userId in targets)
        {
            var dueCount = await db.UserWordProgress
                .CountAsync(p => p.UserId == userId && p.DueDate <= today, ct);

            var body = dueCount == 1
                ? "Je hebt 1 woordje klaar om te herhalen."
                : $"Je hebt {dueCount} woordjes klaar om te herhalen.";

            await SendToUserAsync(userId, BuildPayload("Tijd om te oefenen! 📚", body), ct);
        }
    }

    public async Task SendEveningNudgesAsync(CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;

        var targets = await db.Users
            .Where(u => u.EveningNudgeEnabled)
            .Where(u => u.LastSessionDate == null || u.LastSessionDate.Value.Date < today)
            .Where(u => db.PushSubscriptions.Any(s => s.UserId == u.Id))
            .Where(u => db.UserWordProgress.Any(p => p.UserId == u.Id && p.DueDate <= today))
            .Select(u => u.Id)
            .ToListAsync(ct);

        logger.LogInformation("Avond-nudge: {Count} gebruiker(s).", targets.Count);

        foreach (var userId in targets)
        {
            await SendToUserAsync(userId,
                BuildPayload("Nog niet geoefend vandaag 👀", "Hou je streak in leven — oefen even je woordjes!"),
                ct);
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
                badge = "/assets/icons/icon-192.png",
                data = new { url = "/session" }
            }
        });
}
