using System.Net;
using Lexica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;
using DbPushSubscription = Lexica.Core.Entities.PushSubscription;

namespace Lexica.Infrastructure.Services;

public interface IPushSender
{
    Task SendAsync(DbPushSubscription subscription, string payloadJson, CancellationToken ct = default);
}

/// <summary>
/// Verstuurt Web Push-notificaties via VAPID. Ruimt verlopen subscriptions op
/// wanneer de push-dienst 404/410 Gone teruggeeft.
/// </summary>
public class WebPushSender(
    AppDbContext db,
    IOptions<PushOptions> options,
    ILogger<WebPushSender> logger) : IPushSender
{
    private readonly PushOptions _opts = options.Value;
    private readonly WebPushClient _client = new();

    public async Task SendAsync(DbPushSubscription sub, string payloadJson, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_opts.PublicKey) || string.IsNullOrWhiteSpace(_opts.PrivateKey))
        {
            logger.LogWarning("Push niet geconfigureerd (VAPID-sleutels ontbreken); notificatie niet verzonden.");
            return;
        }

        var vapid = new VapidDetails(_opts.Subject, _opts.PublicKey, _opts.PrivateKey);
        var pushSub = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);

        try
        {
            await _client.SendNotificationAsync(pushSub, payloadJson, vapid);
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            // Subscription bestaat niet meer aan de andere kant → opruimen.
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Verlopen push-subscription {Id} verwijderd.", sub.Id);
        }
        catch (WebPushException ex)
        {
            logger.LogError(ex, "Push verzenden mislukt (status {Status}).", ex.StatusCode);
        }
    }
}
