using System.Security.Claims;
using System.Text.Json;
using Lexica.Core.Entities;
using Lexica.Infrastructure.Data;
using Lexica.Infrastructure.Services;
using Lexica.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lexica.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(AppDbContext db, IPushSender sender) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("status")]
    public async Task<ActionResult<NotificationStatusDto>> Status()
    {
        var user = await db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        var subscribed = await db.PushSubscriptions.AnyAsync(s => s.UserId == UserId);
        return Ok(new NotificationStatusDto(subscribed, user.DailyReminderEnabled, user.EveningNudgeEnabled));
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(PushSubscriptionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Endpoint))
            return BadRequest("Endpoint ontbreekt.");

        var existing = await db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.Endpoint == req.Endpoint);

        if (existing == null)
        {
            db.PushSubscriptions.Add(new PushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = UserId,
                Endpoint = req.Endpoint,
                P256dh = req.P256dh,
                Auth = req.Auth
            });
        }
        else
        {
            existing.P256dh = req.P256dh;
            existing.Auth = req.Auth;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Volledig uitzetten: verwijdert het abonnement (of dat van één endpoint).</summary>
    [HttpDelete("subscribe")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string? endpoint)
    {
        var query = db.PushSubscriptions.Where(s => s.UserId == UserId);
        if (!string.IsNullOrEmpty(endpoint))
            query = query.Where(s => s.Endpoint == endpoint);

        db.PushSubscriptions.RemoveRange(await query.ToListAsync());
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Per type aan/uit zetten zonder het abonnement op te zeggen.</summary>
    [HttpPut("preferences")]
    public async Task<ActionResult<NotificationStatusDto>> UpdatePreferences(NotificationPreferencesRequest req)
    {
        var user = await db.Users.FindAsync(UserId);
        if (user == null) return NotFound();

        user.DailyReminderEnabled = req.DailyReminderEnabled;
        user.EveningNudgeEnabled = req.EveningNudgeEnabled;
        await db.SaveChangesAsync();

        var subscribed = await db.PushSubscriptions.AnyAsync(s => s.UserId == UserId);
        return Ok(new NotificationStatusDto(subscribed, user.DailyReminderEnabled, user.EveningNudgeEnabled));
    }

    [HttpPost("test")]
    public async Task<IActionResult> Test()
    {
        var subs = await db.PushSubscriptions.Where(s => s.UserId == UserId).ToListAsync();
        if (subs.Count == 0)
            return BadRequest("Geen actief abonnement. Zet notificaties eerst aan.");

        var payload = JsonSerializer.Serialize(new
        {
            notification = new
            {
                title = "Lexica test 🔔",
                body = "Top! Je notificaties werken.",
                icon = "/assets/icons/icon-192.png",
                badge = "/assets/icons/badge-96.png",
                data = new { url = "/" }
            }
        });

        foreach (var sub in subs)
            await sender.SendAsync(sub, payload);

        return NoContent();
    }
}
