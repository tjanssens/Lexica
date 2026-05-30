namespace Lexica.Core.Entities;

/// <summary>
/// Web Push-abonnement van één browser/apparaat van een gebruiker.
/// Eén gebruiker kan meerdere subscriptions hebben (verschillende toestellen/browsers).
/// </summary>
public class PushSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
