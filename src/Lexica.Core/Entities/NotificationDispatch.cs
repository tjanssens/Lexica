using Lexica.Core.Enums;

namespace Lexica.Core.Entities;

/// <summary>
/// Guard-record om te voorkomen dat een geplande notificatie-job dezelfde dag dubbel naar
/// dezelfde gebruiker vertrekt (bv. na een herstart of overlappende tick). Omdat het tijdstip
/// per gebruiker verschilt, dedupliceren we per (UserId, JobType, RunDate) i.p.v. globaal per dag.
/// </summary>
public class NotificationDispatch
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public NotificationJobType JobType { get; set; }
    public DateOnly RunDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
