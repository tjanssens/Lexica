using Lexica.Core.Enums;

namespace Lexica.Core.Entities;

/// <summary>
/// Guard-record om te voorkomen dat een geplande notificatie-job dezelfde dag dubbel draait
/// (bv. na een herstart van de container). Unieke index op (JobType, RunDate).
/// </summary>
public class NotificationDispatch
{
    public Guid Id { get; set; }
    public NotificationJobType JobType { get; set; }
    public DateOnly RunDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
