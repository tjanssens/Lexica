namespace Lexica.Core.Entities;

public class SetSubscription
{
    public Guid UserId { get; set; }
    public Guid SetId { get; set; }
    public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public Set Set { get; set; } = null!;
}
